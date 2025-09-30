import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { ID } from '@node-steam/id';
import { EloReversion } from '$lib/models/eloReversion';

type Region = 'ar' | 'br';

function pickDb(region: Region) {
  return region === 'br' ? prismaBr : prismaArg;
}

function parseSteam2(idRaw: string): string | null {
  try {
    const id = new ID(idRaw.trim());
    return id.getSteamID2();
  } catch {
    return null;
  }
}

// Preview the effect of reverting ELO changes for a given account across a set of matches.
// POST body:
// {
//   region: 'ar' | 'br',
//   steamid: string,           // can be steam2 or steam64
//   matchIds?: number[],       // specific duel ids to revert; if omitted, will use filters
//   filters?: { from?: number; to?: number; versusSteamId?: string },
//   scope?: 'all' | 'wins' | 'losses', // default 'all' relative to steamid
//   apply?: boolean            // default false; when true, perform DB updates in a transaction
// }
export const POST: RequestHandler = async (event) => {
  const actingUser = event.locals.user as { role?: string } | null;
  if (!actingUser || actingUser.role !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await event.request.json().catch(() => null)) as any;
  const region: Region = body?.region === 'br' ? 'br' : 'ar';
  const steam2 = parseSteam2(body?.steamid || '');
  if (!steam2) return json({ error: 'Invalid steamid' }, { status: 400 });

  const apply: boolean = Boolean(body?.apply);
  const matchIds: number[] | null = Array.isArray(body?.matchIds) ? body.matchIds.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n)) : null;
  const filters = (body?.filters || {}) as { from?: number; to?: number; versusSteamId?: string };
  const scope = (body?.scope as 'all' | 'wins' | 'losses') || 'all';

  const db = pickDb(region);
  // Check if this account has previous reversion history in this region
  let priorReversions = 0;
  try {
    priorReversions = await EloReversion.countDocuments({ region, targetSteam2: steam2 }).exec();
  } catch {
    // ignore mongo errors, UI will not show prior banner
  }

  // Build where clause for candidate duels
  const where: any = {};
  if (matchIds && matchIds.length > 0) {
    where.id = { in: matchIds };
  }
  if (filters?.from || filters?.to) {
    const endtime: any = {};
    if (filters.from) endtime.gte = Number(filters.from);
    if (filters.to) endtime.lte = Number(filters.to);
    where.endtime = endtime;
  }
  if (filters?.versusSteamId) {
    const other = parseSteam2(filters.versusSteamId);
    if (other) {
      where.OR = [{ AND: [{ winner: steam2 }, { loser: other }] }, { AND: [{ winner: other }, { loser: steam2 }] }];
    }
  }
  // Limit to games involving the target account
  const involvement = scope === 'wins' ? { winner: steam2 } : scope === 'losses' ? { loser: steam2 } : { OR: [{ winner: steam2 }, { loser: steam2 }] };
  const finalWhere = Object.keys(where).length > 0 ? { AND: [where, involvement] } : involvement;

  // Fetch duels with stored previous/new elo fields
  const duels = await (db as any).mgemod_duels.findMany({
    where: finalWhere,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      winner: true,
      loser: true,
      winner_previous_elo: true,
      winner_new_elo: true,
      loser_previous_elo: true,
      loser_new_elo: true
    }
  });

  // Prepare changes: for each duel, if the target is winner, set stats.rating back to winner_previous_elo; if loser, revert loser_previous_elo
  // Also provide opponent, outcome and delta for better UI context
  type Change = {
    id: number;
    target: 'winner' | 'loser';
    opponent: string;
    outcome: 'win' | 'loss';
    from: number | null;
    to: number | null;
    delta: number | null;
  };
  const changes: Change[] = [];
  for (const d of duels) {
    if (d.winner === steam2) {
      const from = d.winner_new_elo ?? null;
      const to = d.winner_previous_elo ?? null;
      const delta = typeof d.winner_new_elo === 'number' && typeof d.winner_previous_elo === 'number' ? d.winner_new_elo - d.winner_previous_elo : null;
      changes.push({ id: d.id, target: 'winner', opponent: d.loser, outcome: 'win', from, to, delta });
    } else if (d.loser === steam2) {
      const from = d.loser_new_elo ?? null;
      const to = d.loser_previous_elo ?? null;
      const delta = typeof d.loser_new_elo === 'number' && typeof d.loser_previous_elo === 'number' ? d.loser_new_elo - d.loser_previous_elo : null;
      changes.push({ id: d.id, target: 'loser', opponent: d.winner, outcome: 'loss', from, to, delta });
    }
  }

  // NEW: Aggregate opponent deltas only where opponent ELO history is present, and decide target final rating (reset to default)
  // Default ELO rating to reset target to
  const DEFAULT_ELO = 1600;

  // Build per-opponent delta map: new - previous across selected matches where opponent history exists
  const opponentDeltaMap = new Map<string, number>();
  for (const d of duels) {
    const targetWasWinner = d.winner === steam2;
    const opponentId = targetWasWinner ? d.loser : d.winner;
    // opponent previous/new
    const oppPrev = targetWasWinner ? d.loser_previous_elo : d.winner_previous_elo;
    const oppNew = targetWasWinner ? d.loser_new_elo : d.winner_new_elo;
    if (typeof oppPrev === 'number' && typeof oppNew === 'number') {
      const delta = oppNew - oppPrev;
      opponentDeltaMap.set(opponentId, (opponentDeltaMap.get(opponentId) ?? 0) + delta);
    }
  }

  // Read current rating for target and opponents to prepare preview
  const statsRow = await (db as any).mgemod_stats.findUnique({ where: { steamid: steam2 }, select: { rating: true } });
  const currentRating: number | null = statsRow?.rating ?? null;

  const opponentIds = Array.from(opponentDeltaMap.keys());
  let opponentStats: Array<{ steamid: string; rating: number | null }> = [];
  if (opponentIds.length > 0) {
    const rows = await (db as any).mgemod_stats.findMany({ where: { steamid: { in: opponentIds } }, select: { steamid: true, rating: true } });
    opponentStats = rows.map((r: any) => ({ steamid: r.steamid, rating: r.rating ?? null }));
  }

  const opponents: Array<{ steamid2: string; currentRating: number | null; delta: number; finalRating: number | null }> = opponentIds.map((sid) => {
    const current = opponentStats.find((r) => r.steamid === sid)?.rating ?? null;
    const delta = opponentDeltaMap.get(sid) ?? 0;
    // Revert by subtracting the delta from current
    const final = typeof current === 'number' ? current - delta : null;
    return { steamid2: sid, currentRating: current, delta, finalRating: final };
  });

  // Target final rating is always DEFAULT_ELO per new rules
  const finalRating = DEFAULT_ELO as number;

  const summary = {
    region,
    steamid2: steam2,
    matchesConsidered: duels.length,
    changes,
    currentRating,
    finalRating,
    opponents,
    opponentsCount: opponents.length,
    opponentsTotalDelta: opponents.reduce((acc, o) => acc + o.delta, 0)
  };

  if (!apply) {
    return json({ ok: true, dryRun: true, priorReversions, ...summary });
  }

  // Apply: set the target's rating to DEFAULT_ELO and update opponents by subtracting their aggregated deltas
  const tx: any[] = [];
  tx.push((db as any).mgemod_stats.update({ where: { steamid: steam2 }, data: { rating: finalRating } }));
  for (const opp of opponents) {
    if (typeof opp.currentRating === 'number' && typeof opp.finalRating === 'number' && opp.delta !== 0) {
      tx.push((db as any).mgemod_stats.update({ where: { steamid: opp.steamid2 }, data: { rating: opp.finalRating } }));
    }
  }
  if (tx.length > 0) {
    await (db as any).$transaction(tx);
  }

  // Persist reversion record to Mongo
  try {
    const actor = event.locals.user as any;
    const actorSteam64 = actor?.steamid ?? null;
    const actorName = actor?.personaname ?? null;
    await EloReversion.create({
      region,
      targetSteam2: steam2,
      targetSteam64: (() => { try { return new ID(steam2).get64(); } catch { return null; } })(),
      actorSteam64,
      actorName,
      request: {
        scope,
        filters,
        matchIds
      },
      summary: {
        currentRatingBefore: currentRating,
        finalRatingApplied: finalRating,
        matchesConsidered: duels.length,
        opponentsCount: opponents.length,
        opponentsTotalDelta: opponents.reduce((acc, o) => acc + o.delta, 0)
      },
      opponents: opponents,
      changes: changes
    });
  } catch (e) {
    console.error('Failed to persist EloReversion:', e);
  }

  return json({ ok: true, applied: true, priorReversions, ...summary });
};



