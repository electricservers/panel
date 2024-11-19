import type { RequestHandler } from './$types';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { error, json } from '@sveltejs/kit';
import type { mgemod_stats, Prisma } from '@prisma-arg/client';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const statsQuery = {
    orderBy: [
      {
        rating: 'desc'
      }
    ],
    take: Number(query.get('limit')) || 250,
    where: query.has('steamid') ? { steamid: query.get('steamid')! } : {}
  } satisfies Prisma.mgemod_statsFindManyArgs;
  let ranking: mgemod_stats[];
  switch (query.get('db')) {
    case 'ar':
      ranking = await prismaArg.mgemod_stats.findMany(statsQuery);
      break;
    case 'br':
      ranking = await prismaBr.mgemod_stats.findMany(statsQuery);
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  return json(ranking);
};
