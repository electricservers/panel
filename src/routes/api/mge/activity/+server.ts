import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';

// Returns recent match timestamps for a given player to enable client-side
// aggregation (weekday/hour-of-day) in the user's local timezone.
//
// Query params:
// - db: 'ar' | 'br' (required)
// - steamid: Steam2 id (required)
// - take: max number of recent duels to consider (default: 2000, max: 5000)
// - days: optional window (e.g., 30) to filter results to the last N days
export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const db = query.get('db');
  const steamid = query.get('steamid');
  let take = Number(query.get('take') || 2000);
  const daysParam = query.get('days');
  const days = daysParam ? Number(daysParam) : null;
  if (!db || (db !== 'ar' && db !== 'br')) {
    return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  if (!steamid) {
    return error(400, 'missing steamid');
  }
  if (!Number.isFinite(take) || take <= 0) take = 2000;
  take = Math.min(5000, Math.max(100, Math.floor(take)));

  const where = {
    OR: [{ winner: steamid }, { loser: steamid }]
  } satisfies Prisma.mgemod_duelsWhereInput;

  const findManyParams = {
    select: { gametime: true },
    where,
    orderBy: [{ id: 'desc' }],
    take
  } satisfies Prisma.mgemod_duelsFindManyArgs;

  let rows: { gametime: string | null }[] = [];
  switch (db) {
    case 'ar':
      rows = await prismaArg.mgemod_duels.findMany(findManyParams);
      break;
    case 'br':
      rows = await prismaBr.mgemod_duels.findMany(findManyParams);
      break;
  }

  let gametimes = rows.map((r) => (r.gametime == null ? null : String(r.gametime))).filter((v): v is string => Boolean(v));

  if (days && Number.isFinite(days) && days > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    const cutoff = nowSec - Math.floor(days * 86400);
    gametimes = gametimes.filter((g) => {
      const n = Number(g);
      return Number.isFinite(n) && n >= cutoff;
    });
  }

  return json({ gametimes });
};
