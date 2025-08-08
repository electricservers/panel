import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
  const db = event.url.searchParams.get('db');
  let rows: { arenaname: string | null }[] = [];
  switch (db) {
    case 'ar':
      // @ts-expect-error Prisma groupBy typing in this environment requires extra args
      rows = await prismaArg.mgemod_duels.groupBy({ by: ['arenaname'] });
      break;
    case 'br':
      // @ts-expect-error Prisma groupBy typing in this environment requires extra args
      rows = await prismaBr.mgemod_duels.groupBy({ by: ['arenaname'] });
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  const arenas = rows
    .map((r) => r.arenaname)
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => a.localeCompare(b));
  return json(arenas);
};


