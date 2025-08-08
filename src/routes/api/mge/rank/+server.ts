import type { RequestHandler } from './$types';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { error, json } from '@sveltejs/kit';
import type { Prisma } from '@prisma-arg/client';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const take = Number(query.get('take') ?? query.get('limit')) || 250;
  const skip = Number(query.get('skip')) || 0;
  const sortKey = (query.get('sortKey') ?? 'rating') as 'rating' | 'wins' | 'losses' | 'name';
  const sortDir = (query.get('sortDir') ?? 'desc') as 'asc' | 'desc';
  const includeRankPosition = query.has('withRankPosition');
  const orderBy: Prisma.mgemod_statsOrderByWithRelationInput[] = [];
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
  const statsQuery = {
    orderBy,
    take,
    skip,
    where: query.has('steamid') ? { steamid: query.get('steamid')! } : {}
  } satisfies Prisma.mgemod_statsFindManyArgs;
  let ranking: any[];
  let total = 0;
  let position: number | undefined = undefined;
  switch (query.get('db')) {
    case 'ar':
      ranking = await prismaArg.mgemod_stats.findMany(statsQuery);
      if (query.has('withTotal')) {
        total = await prismaArg.mgemod_stats.count({ where: statsQuery.where });
      }
      if (includeRankPosition && query.has('steamid') && ranking.length > 0) {
        const player = ranking[0];
        const higher = await prismaArg.mgemod_stats.count({ where: { rating: { gt: player.rating ?? 0 } } });
        position = higher + 1;
      }
      break;
    case 'br':
      ranking = await prismaBr.mgemod_stats.findMany(statsQuery);
      if (query.has('withTotal')) {
        total = await prismaBr.mgemod_stats.count({ where: statsQuery.where });
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
