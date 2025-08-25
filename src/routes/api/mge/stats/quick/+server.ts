import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { canonicalizeArenaName } from '$lib/mge/arenaNames';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const db = query.get('db');
  const daysParam = query.get('days');
  let days = daysParam ? Number(daysParam) : 1;
  if (!db || (db !== 'ar' && db !== 'br')) {
    return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  if (!Number.isFinite(days) || days <= 0) days = 1;
  days = Math.min(365, Math.max(1, Math.floor(days)));

  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = String(nowSec - Math.floor(days * 86400));

  const client = db === 'ar' ? prismaArg : prismaBr;

  // Total duels (all time)
  const totalDuels = await client.mgemod_duels.count();

  // Duels in window
  const duelsWindow = await client.mgemod_duels.count({
    where: { endtime: { gte: Number(cutoff) } as any } as Prisma.mgemod_duelsWhereInput
  });

  // Active players in window (distinct winners and losers)
  // @ts-expect-error Prisma groupBy typing in this environment requires extra args
  const winners = await client.mgemod_duels.groupBy({ by: ['winner'], where: { endtime: { gte: Number(cutoff) } as any } });
  // @ts-expect-error see above
  const losers = await client.mgemod_duels.groupBy({ by: ['loser'], where: { endtime: { gte: Number(cutoff) } as any } });
  const uniqPlayers = new Set<string>();
  winners.forEach((r: any) => {
    if (r.winner) uniqPlayers.add(String(r.winner));
  });
  losers.forEach((r: any) => {
    if (r.loser) uniqPlayers.add(String(r.loser));
  });
  const activePlayers = uniqPlayers.size;

  // Arenas played (distinct canonical names) in window
  // @ts-expect-error see above
  const arenaRows = await client.mgemod_duels.groupBy({ by: ['arenaname'], where: { endtime: { gte: Number(cutoff) } as any } });
  const uniqArenas = new Set<string>();
  arenaRows.forEach((r: any) => {
    const key = canonicalizeArenaName(r.arenaname ?? '');
    if (key) uniqArenas.add(key);
  });
  const arenasPlayed = uniqArenas.size;

  return json({
    totalDuels,
    duelsWindow,
    activePlayers,
    arenasPlayed,
    days
  });
};
