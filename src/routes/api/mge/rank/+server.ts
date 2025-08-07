import type { RequestHandler } from './$types';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { error, json } from '@sveltejs/kit';
import type { mgemod_stats, Prisma } from '@prisma-arg/client';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const take = Number(query.get('take') ?? query.get('limit')) || 250;
  const skip = Number(query.get('skip')) || 0;
  const sortKey = (query.get('sortKey') ?? 'rating') as 'rating' | 'wins' | 'losses' | 'name';
  const sortDir = (query.get('sortDir') ?? 'desc') as 'asc' | 'desc';
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
  let ranking: mgemod_stats[];
  let total = 0;
  switch (query.get('db')) {
    case 'ar':
      ranking = await prismaArg.mgemod_stats.findMany(statsQuery);
      if (query.has('withTotal')) {
        total = await prismaArg.mgemod_stats.count({ where: statsQuery.where });
      }
      break;
    case 'br':
      ranking = await prismaBr.mgemod_stats.findMany(statsQuery);
      if (query.has('withTotal')) {
        total = await prismaBr.mgemod_stats.count({ where: statsQuery.where });
      }
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  if (query.has('withTotal')) {
    return json({ items: ranking, total });
  }
  return json(ranking);
};
