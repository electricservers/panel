import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { canonicalizeArenaName } from '$lib/mge/arenaNames';

interface ArenaRow {
  arenaname: string | null;
  _count: { _all: number };
}

function normalizeRows(
  total: ArenaRow[],
  wins: Record<string, number>,
  losses: Record<string, number>,
  take: number
) {
  const agg: Record<string, { name: string; matches: number; wins: number; losses: number; winrate: number }> = {};
  for (const r of total) {
    const raw = r.arenaname ?? '';
    const key = canonicalizeArenaName(raw);
    if (!key) continue;
    const matches = r._count?._all ?? 0;
    const w = wins[raw] ?? wins[key] ?? 0;
    const l = losses[raw] ?? losses[key] ?? 0;
    if (!agg[key]) {
      const pct = matches > 0 ? (w / matches) * 100 : 0;
      agg[key] = { name: key, matches, wins: w, losses: l, winrate: Number(pct.toFixed(1)) };
    } else {
      agg[key].matches += matches;
      agg[key].wins += w;
      agg[key].losses += l;
      const m = agg[key].matches;
      agg[key].winrate = Number((m > 0 ? (agg[key].wins / m) * 100 : 0).toFixed(1));
    }
  }
  const items = Object.values(agg);
  items.sort((a, b) => (a.matches === b.matches ? a.name.localeCompare(b.name) : b.matches - a.matches));
  return items.slice(0, take);
}

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const db = query.get('db');
  const steamid = query.get('steamid'); // Steam2 id
  let take = Number(query.get('take') || 5);
  const daysParam = query.get('days');
  const days = daysParam ? Number(daysParam) : null;
  if (!db || (db !== 'ar' && db !== 'br')) {
    return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  if (!steamid) {
    return error(400, 'missing steamid');
  }
  if (!Number.isFinite(take) || take <= 0) take = 5;
  take = Math.min(15, Math.max(3, Math.floor(take)));

  // Base where by player
  const baseWhere: Prisma.mgemod_duelsWhereInput = {
    OR: [{ winner: steamid }, { loser: steamid }]
  };

  // Optional time window
  if (days && Number.isFinite(days) && days > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    const cutoff = String(nowSec - Math.floor(days * 86400));
    baseWhere.gametime = { gte: cutoff } as any;
  }

  const totalWhere = baseWhere;
  const winsWhere: Prisma.mgemod_duelsWhereInput = { ...baseWhere, winner: steamid };
  const lossesWhere: Prisma.mgemod_duelsWhereInput = { ...baseWhere, loser: steamid };

  const client = db === 'ar' ? prismaArg : prismaBr;

  // Group by arena for totals, wins and losses
  // @ts-expect-error Prisma groupBy typing in this environment requires extra args
  const total: ArenaRow[] = await client.mgemod_duels.groupBy({
    by: ['arenaname'],
    where: totalWhere,
    _count: { _all: true }
  });
  // @ts-expect-error see above
  const winsRows: ArenaRow[] = await client.mgemod_duels.groupBy({
    by: ['arenaname'],
    where: winsWhere,
    _count: { _all: true }
  });
  // @ts-expect-error see above
  const lossesRows: ArenaRow[] = await client.mgemod_duels.groupBy({
    by: ['arenaname'],
    where: lossesWhere,
    _count: { _all: true }
  });

  const winsMap: Record<string, number> = {};
  winsRows.forEach((r) => {
    const raw = r.arenaname ?? '';
    const key = canonicalizeArenaName(raw);
    if (!key) return;
    winsMap[key] = (winsMap[key] || 0) + (r._count?._all ?? 0);
  });
  const lossesMap: Record<string, number> = {};
  lossesRows.forEach((r) => {
    const raw = r.arenaname ?? '';
    const key = canonicalizeArenaName(raw);
    if (!key) return;
    lossesMap[key] = (lossesMap[key] || 0) + (r._count?._all ?? 0);
  });

  const items = normalizeRows(total, winsMap, lossesMap, take);
  return json({ items });
};


