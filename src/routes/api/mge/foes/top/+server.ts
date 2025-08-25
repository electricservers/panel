import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';

type FoeRow = { opponent: string | null; _count: { _all: number } };

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
  take = Math.min(25, Math.max(3, Math.floor(take)));

  const client = db === 'ar' ? prismaArg : prismaBr;

  const baseWhere: Prisma.mgemod_duelsWhereInput = {
    OR: [{ winner: steamid }, { loser: steamid }]
  };

  if (days && Number.isFinite(days) && days > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    const cutoff = nowSec - Math.floor(days * 86400);
    baseWhere.endtime = { gte: cutoff } as any;
  }

  const winsWhere: Prisma.mgemod_duelsWhereInput = { ...baseWhere, winner: steamid };
  const lossesWhere: Prisma.mgemod_duelsWhereInput = { ...baseWhere, loser: steamid };

  // @ts-expect-error Prisma groupBy typing in this environment requires extra args
  const winsRows: FoeRow[] = await client.mgemod_duels.groupBy({
    by: ['loser'],
    where: winsWhere,
    _count: { _all: true }
  });
  // @ts-expect-error see above
  const lossesRows: FoeRow[] = await client.mgemod_duels.groupBy({
    by: ['winner'],
    where: lossesWhere,
    _count: { _all: true }
  });

  const winsMap = new Map<string, number>();
  const lossesMap = new Map<string, number>();

  for (const r of winsRows) {
    const id = String((r as any).loser ?? '');
    if (id) winsMap.set(id, (r as any)?._count?._all || 0);
  }
  for (const r of lossesRows) {
    const id = String((r as any).winner ?? '');
    if (id) lossesMap.set(id, (r as any)?._count?._all || 0);
  }

  const allOpponents = new Set<string>([...winsMap.keys(), ...lossesMap.keys()]);
  const items: { steamid: string; wins: number; losses: number; matches: number }[] = [];
  for (const opp of allOpponents) {
    const w = winsMap.get(opp) || 0;
    const l = lossesMap.get(opp) || 0;
    const m = w + l;
    if (!m) continue;
    items.push({ steamid: opp, wins: w, losses: l, matches: m });
  }

  items.sort((a, b) => b.matches - a.matches || a.steamid.localeCompare(b.steamid));
  const top = items.slice(0, take);

  return json(top);
};


