import type { MgeDuel } from '$lib/mge/mgeduel';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { mgemod_duels, Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const take = Number(query.get('take') ?? query.get('limit')) || 500;
  const skip = Number(query.get('skip')) || 0;
  const findManyParams = {
    orderBy: [{ id: 'desc' }],
    take,
    skip,
    where: query.has('steamid')
      ? {
          OR: [{ winner: query.get('steamid') }, { loser: query.get('steamid') }]
        }
      : {}
  } satisfies Prisma.mgemod_duelsFindManyArgs;
  let gamesRaw: mgemod_duels[];
  let total = 0;
  switch (query.get('db')) {
    case 'ar':
      gamesRaw = await prismaArg.mgemod_duels.findMany(findManyParams);
      if (query.has('withTotal')) {
        total = await prismaArg.mgemod_duels.count({ where: findManyParams.where });
      }
      break;
    case 'br':
      gamesRaw = await prismaBr.mgemod_duels.findMany(findManyParams);
      if (query.has('withTotal')) {
        total = await prismaBr.mgemod_duels.count({ where: findManyParams.where });
      }
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }

  const steamIDs = Array.from(
    new Set(
      gamesRaw
        .flatMap((game) => [game.winner, game.loser])
        .filter((id): id is string => Boolean(id))
    )
  );

  let players: { steamid: string; name: string | null }[] = [];
  if (query.get('db') === 'br') {
    players = await prismaBr.mgemod_stats.findMany({
      where: { steamid: { in: steamIDs } },
      select: { steamid: true, name: true },
    });
  } else {
    players = await prismaArg.mgemod_stats.findMany({
      where: { steamid: { in: steamIDs } },
      select: { steamid: true, name: true },
    });
  }

  const playerMap = Object.fromEntries(players.map((p) => [p.steamid, p.name]));

  const games: MgeDuel[] = gamesRaw.map((game) => ({
    ...game,
    winnername: game.winner ? playerMap[game.winner] || `Unknown (${game.winner})` : 'Unknown',
    losername: game.loser ? playerMap[game.loser] || `Unknown (${game.loser})` : 'Unknown',
  }));

  if (query.has('withTotal')) {
    return json({ items: games, total });
  }
  return json(games);
};
