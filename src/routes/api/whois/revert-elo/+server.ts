import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { ID } from '@node-steam/id';

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
  type Change = { id: number; target: 'winner' | 'loser'; from: number | null; to: number | null };
  const changes: Change[] = [];
  for (const d of duels) {
    if (d.winner === steam2) {
      changes.push({ id: d.id, target: 'winner', from: d.winner_new_elo ?? null, to: d.winner_previous_elo ?? null });
    } else if (d.loser === steam2) {
      changes.push({ id: d.id, target: 'loser', from: d.loser_new_elo ?? null, to: d.loser_previous_elo ?? null });
    }
  }

  // Consolidate to one final rating per player (the target) after all selected matches: last change's `to` becomes the desired rating.
  // Since we are reverting specific matches, the safest is to compute the minimal `to` in chronological order.
  // We already order desc; reverse to chronological.
  const ordered = [...changes].reverse();
  let finalRating: number | null = null;
  for (const c of ordered) {
    if (typeof c.to === 'number') finalRating = c.to;
  }

  // Read current rating
  const statsRow = await (db as any).mgemod_stats.findUnique({ where: { steamid: steam2 }, select: { rating: true } });
  const currentRating: number | null = statsRow?.rating ?? null;

  const summary = {
    region,
    steamid2: steam2,
    matchesConsidered: duels.length,
    changes,
    currentRating,
    finalRating
  };

  if (!apply) {
    return json({ ok: true, dryRun: true, ...summary });
  }

  // Apply: set the stats.rating to finalRating if present
  if (typeof finalRating === 'number') {
    await (db as any).$transaction([
      (db as any).mgemod_stats.update({ where: { steamid: steam2 }, data: { rating: finalRating } })
    ]);
  }

  return json({ ok: true, applied: true, ...summary });
};



