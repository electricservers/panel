import type { RequestHandler } from './$types';
import { ID } from '@node-steam/id';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const take = Number(query.get('take') ?? query.get('limit')) || 250;
  const skip = Number(query.get('skip')) || 0;
  const sortKey = (query.get('sortKey') ?? 'rating') as string;
  const sortDir = (query.get('sortDir') ?? 'desc') as 'asc' | 'desc';
  const includeRankPosition = query.has('withRankPosition');
  const includePositions = query.has('withPositions');
  const derivedKeys = new Set(['totalGames', 'wlValue', 'winrateValue']);
  const isDerived = derivedKeys.has(sortKey);
  const orderBy: any[] = [];
  switch (sortKey) {
    case 'name':
      orderBy.push({ name: sortDir });
      break;
    case 'wins':
      orderBy.push({ wins: sortDir });
      break;
    case 'losses':
      orderBy.push({ losses: sortDir });
      break;
    case 'rating':
    default:
      orderBy.push({ rating: sortDir });
      break;
  }
  // Build search filter
  let where: any = {};
  if (query.has('steamid')) {
    // Exact match by steam2
    where = { steamid: query.get('steamid')! };
  } else if (query.has('q')) {
    const raw = (query.get('q') ?? '').trim();
    if (raw) {
      let steam2: string | null = null;
      try {
        const id = new ID(raw);
        steam2 = id.getSteamID2();
      } catch {}
      if (steam2) {
        where = { steamid: steam2 };
      } else {
        // MySQL collations are generally case-insensitive; omit mode to avoid Prisma error
        where = { name: { contains: raw } } as any;
      }
    }
  }

  const statsQuery: any = isDerived ? { where } : { orderBy, take, skip, where };
  let ranking: any[];
  let total = 0;
  let position: number | undefined = undefined;
  switch (query.get('db')) {
    case 'ar':
      if (isDerived) {
        const all = await prismaArg.mgemod_stats.findMany({ where });
        const computed = all.map((user: any) => {
          const wins = user.wins ?? 0;
          const losses = user.losses ?? 0;
          const totalGames = wins + losses;
          const wlValue = losses !== 0 ? wins / losses : wins > 0 ? Number.POSITIVE_INFINITY : 0;
          const winrateValue = totalGames !== 0 ? (wins / totalGames) * 100 : 0;
          return { ...user, totalGames, wlValue, winrateValue };
        });
        computed.sort((a: any, b: any) => {
          const av = a[sortKey];
          const bv = b[sortKey];
          const aNum = typeof av === 'number' ? av : Number(av ?? 0);
          const bNum = typeof bv === 'number' ? bv : Number(bv ?? 0);
          const cmp = aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
          return sortDir === 'asc' ? cmp : -cmp;
        });
        total = computed.length;
        ranking = computed.slice(skip, skip + take);
        if (includePositions) {
          // Build global positions ignoring name filter to preserve original rankings
          const allBase = await prismaArg.mgemod_stats.findMany({});
          const computedAll = allBase.map((user: any) => {
            const wins = user.wins ?? 0;
            const losses = user.losses ?? 0;
            const totalGames = wins + losses;
            const wlValue = losses !== 0 ? wins / losses : wins > 0 ? Number.POSITIVE_INFINITY : 0;
            const winrateValue = totalGames !== 0 ? (wins / totalGames) * 100 : 0;
            return { ...user, totalGames, wlValue, winrateValue };
          });
          computedAll.sort((a: any, b: any) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            const aNum = typeof av === 'number' ? av : Number(av ?? 0);
            const bNum = typeof bv === 'number' ? bv : Number(bv ?? 0);
            const cmp = aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
            return sortDir === 'asc' ? cmp : -cmp;
          });
          const posMap: Record<string, number> = {};
          computedAll.forEach((u: any, i: number) => {
            posMap[u.steamid] = i + 1;
          });
          ranking = ranking.map((r) => ({ ...r, position: posMap[r.steamid] ?? null }));
        }
      } else {
        ranking = await prismaArg.mgemod_stats.findMany(statsQuery as any);
        if (query.has('withTotal')) {
          total = await prismaArg.mgemod_stats.count({ where: (statsQuery as any).where });
        }
        if (includePositions) {
          const allOrdered = await prismaArg.mgemod_stats.findMany({ orderBy, select: { steamid: true } });
          const posMap: Record<string, number> = {};
          allOrdered.forEach((u: any, i: number) => {
            posMap[u.steamid] = i + 1;
          });
          ranking = ranking.map((r) => ({ ...r, position: posMap[r.steamid] ?? null }));
        }
      }
      if (includeRankPosition && query.has('steamid') && ranking.length > 0) {
        const player = ranking[0];
        const higher = await prismaArg.mgemod_stats.count({ where: { rating: { gt: player.rating ?? 0 } } });
        position = higher + 1;
      }
      break;
    case 'br':
      if (isDerived) {
        const all = await prismaBr.mgemod_stats.findMany({ where });
        const computed = all.map((user: any) => {
          const wins = user.wins ?? 0;
          const losses = user.losses ?? 0;
          const totalGames = wins + losses;
          const wlValue = losses !== 0 ? wins / losses : wins > 0 ? Number.POSITIVE_INFINITY : 0;
          const winrateValue = totalGames !== 0 ? (wins / totalGames) * 100 : 0;
          return { ...user, totalGames, wlValue, winrateValue };
        });
        computed.sort((a: any, b: any) => {
          const av = a[sortKey];
          const bv = b[sortKey];
          const aNum = typeof av === 'number' ? av : Number(av ?? 0);
          const bNum = typeof bv === 'number' ? bv : Number(bv ?? 0);
          const cmp = aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
          return sortDir === 'asc' ? cmp : -cmp;
        });
        total = computed.length;
        ranking = computed.slice(skip, skip + take);
        if (includePositions) {
          const allBase = await prismaBr.mgemod_stats.findMany({});
          const computedAll = allBase.map((user: any) => {
            const wins = user.wins ?? 0;
            const losses = user.losses ?? 0;
            const totalGames = wins + losses;
            const wlValue = losses !== 0 ? wins / losses : wins > 0 ? Number.POSITIVE_INFINITY : 0;
            const winrateValue = totalGames !== 0 ? (wins / totalGames) * 100 : 0;
            return { ...user, totalGames, wlValue, winrateValue };
          });
          computedAll.sort((a: any, b: any) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            const aNum = typeof av === 'number' ? av : Number(av ?? 0);
            const bNum = typeof bv === 'number' ? bv : Number(bv ?? 0);
            const cmp = aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
            return sortDir === 'asc' ? cmp : -cmp;
          });
          const posMap: Record<string, number> = {};
          computedAll.forEach((u: any, i: number) => {
            posMap[u.steamid] = i + 1;
          });
          ranking = ranking.map((r) => ({ ...r, position: posMap[r.steamid] ?? null }));
        }
      } else {
        ranking = await prismaBr.mgemod_stats.findMany(statsQuery as any);
        if (query.has('withTotal')) {
          total = await prismaBr.mgemod_stats.count({ where: (statsQuery as any).where });
        }
        if (includePositions) {
          const allOrdered = await prismaBr.mgemod_stats.findMany({ orderBy, select: { steamid: true } });
          const posMap: Record<string, number> = {};
          allOrdered.forEach((u: any, i: number) => {
            posMap[u.steamid] = i + 1;
          });
          ranking = ranking.map((r) => ({ ...r, position: posMap[r.steamid] ?? null }));
        }
      }
      if (includeRankPosition && query.has('steamid') && ranking.length > 0) {
        const player = ranking[0];
        const higher = await prismaBr.mgemod_stats.count({ where: { rating: { gt: player.rating ?? 0 } } });
        position = higher + 1;
      }
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  if (query.has('withTotal') || includeRankPosition) {
    const payload: any = { items: ranking } as { items: any[]; total?: number; position?: number | null };
    if (query.has('withTotal')) payload.total = total;
    if (includeRankPosition) payload.position = position ?? null;
    return json(payload);
  }
  return json(ranking);
};
