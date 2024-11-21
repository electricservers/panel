import type { MgeDuel } from '$lib/mge/mgeduel';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { mgemod_duels, Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const findManyParams = {
    orderBy: [{ id: 'desc' }],
    take: Number(query.get('limit')) || 500,
    where: query.has('steamid')
      ? {
          OR: [{ winner: query.get('steamid') }, { loser: query.get('steamid') }]
        }
      : {}
  } satisfies Prisma.mgemod_duelsFindManyArgs;
  let games: MgeDuel[];
  switch (query.get('db')) {
    case 'ar':
      games = await prismaArg.mgemod_duels.findMany(findManyParams);
      break;
    case 'br':
      games = await prismaBr.mgemod_duels.findMany(findManyParams);
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }

  const steamIDs = Array.from(
    new Set(games.flatMap((game) => [game.winner, game.loser]))
  );

  const players = await prismaArg.mgemod_stats.findMany({
    where: { steamid: { in: steamIDs } },
    select: { steamid: true, name: true },
  });

  const playerMap = Object.fromEntries(players.map((p) => [p.steamid, p.name]));

  games = games.map((game) => ({
    ...game,
    winnername: playerMap[game.winner] || `Unknown (${game.winner})`,
    losername: playerMap[game.loser] || `Unknown (${game.loser}`,
  }));

  return json(games);
};
