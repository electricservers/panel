import type { MgeDuel } from '$lib/mge/mgeduel';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { mgemod_duels, Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const take = Number(query.get('take') ?? query.get('limit')) || 500;
  const skip = Number(query.get('skip')) || 0;
  const steamid = query.get('steamid');
  const outcome = query.get('outcome'); // 'win' | 'loss'

  // Build where clause with optional outcome filter relative to the provided steamid
  let where: Prisma.mgemod_duelsWhereInput = {};
  if (steamid) {
    if (outcome === 'win') {
      where = { winner: steamid };
    } else if (outcome === 'loss') {
      where = { loser: steamid };
    } else {
      where = { OR: [{ winner: steamid }, { loser: steamid }] };
    }
  }

  const findManyParams = {
    orderBy: [{ id: 'desc' }],
    take,
    skip,
    where
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

  // Attempt to fix common mojibake (UTF-8 bytes interpreted as latin1) without
  // modifying the database. If the string looks suspicious, decode from latin1
  // to UTF-8; otherwise, return as-is.
  const maybeFixMojibake = (value: string | null | undefined): string | null => {
    if (!value) return value ?? null;
    const needsFix = /[ÂÃâ€œ¢™žŸ]/.test(value);
    if (!needsFix) return value;
    try {
      return Buffer.from(value, 'latin1').toString('utf8');
    } catch {
      return value;
    }
  };

  const playerMap = Object.fromEntries(players.map((p) => [p.steamid, maybeFixMojibake(p.name)]));

  const games: MgeDuel[] = gamesRaw.map((game) => ({
    ...game,
    winnername: game.winner ? (playerMap[game.winner] ?? maybeFixMojibake(`Unknown (${game.winner})`)) || 'Unknown' : 'Unknown',
    losername: game.loser ? (playerMap[game.loser] ?? maybeFixMojibake(`Unknown (${game.loser})`)) || 'Unknown' : 'Unknown',
  }));

  if (query.has('withTotal')) {
    return json({ items: games, total });
  }
  return json(games);
};
