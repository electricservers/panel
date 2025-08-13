import type { MgeDuel } from '$lib/mge/mgeduel';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { mgemod_duels, Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ID } from '@node-steam/id';
import { canonicalizeArenaName } from '$lib/mge/arenaNames';

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const take = Number(query.get('take') ?? query.get('limit')) || 500;
  const skip = Number(query.get('skip')) || 0;
  const steamid = query.get('steamid');
  const versus = query.get('versus');
  const aParam = query.get('a') ?? undefined;
  const bParam = query.get('b') ?? undefined;
  const outcome = query.get('outcome'); // 'win' | 'loss'
  const arena = query.get('arena')?.trim() || undefined;
  const arenaCanonical = query.get('arenaCanonical')?.trim(); // '1' to treat arena filter as canonical
  const q = query.get('q')?.trim() || undefined; // name or steamid (64 or 2)
  const from = query.get('from')?.trim() || undefined; // unix seconds string
  const to = query.get('to')?.trim() || undefined;

  // Build where clause
  let where: Prisma.mgemod_duelsWhereInput = {};
  // outcome relative to a specific steamid (only meaningful when provided)
  if (steamid) {
    if (outcome === 'win') {
      where = { ...where, winner: steamid };
    } else if (outcome === 'loss') {
      where = { ...where, loser: steamid };
    } else {
      where = { ...where, OR: [{ winner: steamid }, { loser: steamid }] };
    }
  }
  // versus pair filter (takes precedence over 'q')
  if (versus && aParam && bParam) {
    try {
      const a2 = new ID(aParam).getSteamID2();
      const b2 = new ID(bParam).getSteamID2();
      where = { ...where, OR: [{ AND: [{ winner: a2 }, { loser: b2 }] }, { AND: [{ winner: b2 }, { loser: a2 }] }] };
    } catch {
      // ignore invalid ids; empty result will follow
      where = { ...where, id: { equals: -1 as unknown as any } };
    }
  }
  // arena filter
  if (arena) {
    if (arenaCanonical === '1') {
      // Expand canonical to raw variants using distinct groupBy then filtering in-memory list of variants
      // We cannot subquery easily with Prisma groupBy, so we will fetch distinct arenas first.
      const db = query.get('db');
      let rows: { arenaname: string | null }[] = [];
      if (db === 'br') {
        // @ts-expect-error Prisma groupBy typing in this environment requires extra args
        rows = await prismaBr.mgemod_duels.groupBy({ by: ['arenaname'] });
      } else {
        // @ts-expect-error Prisma groupBy typing in this environment requires extra args
        rows = await prismaArg.mgemod_duels.groupBy({ by: ['arenaname'] });
      }
      const wanted = canonicalizeArenaName(arena);
      const variants = rows
        .map((r) => r.arenaname)
        .filter((v): v is string => Boolean(v))
        .filter((v) => canonicalizeArenaName(v) === wanted);
      if (variants.length > 0) {
        where = { ...where, arenaname: { in: variants } };
      } else {
        // Fallback to canonicalized exact (no matches likely, but keeps behavior defined)
        where = { ...where, arenaname: wanted };
      }
    } else {
      where = { ...where, arenaname: arena };
    }
  }
  // date range filter (gametime stored as seconds string)
  if (from || to) {
    const gametime: Prisma.StringFilter = {};
    if (from) gametime.gte = from;
    if (to) gametime.lte = to;
    where = { ...where, gametime };
  }

  // name/steamid search 'q'
  // - If looks like SteamID64 or Steam2, normalize to Steam2 and filter winner/loser accordingly
  // - Else search players by name contains and filter by their steamids
  let additionalIdFilter: string[] | null = null;
  if (q && !(versus && aParam && bParam)) {
    const looksLike64 = /^\d{17}$/.test(q);
    const looksLike2 = /^STEAM_\d+:\d+:\d+$/.test(q);
    try {
      if (looksLike64 || looksLike2) {
        const id2 = new ID(q).getSteamID2();
        additionalIdFilter = [id2];
      }
    } catch {
      // ignore
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
      if (!additionalIdFilter && !q) {
        gamesRaw = await prismaArg.mgemod_duels.findMany(findManyParams);
      } else {
        // If name search or explicit id filter, extend 'where' accordingly
        let idFilters = additionalIdFilter;
        if (!idFilters && q) {
          const players = await prismaArg.mgemod_stats.findMany({
            where: { name: { contains: q } },
            select: { steamid: true }
          });
          idFilters = players.map((p) => p.steamid);
        }
        const whereWithIds: Prisma.mgemod_duelsWhereInput =
          idFilters && idFilters.length > 0
            ? {
                AND: [
                  findManyParams.where ?? {},
                  outcome === 'win' ? { winner: { in: idFilters } } : outcome === 'loss' ? { loser: { in: idFilters } } : { OR: [{ winner: { in: idFilters } }, { loser: { in: idFilters } }] }
                ]
              }
            : (findManyParams.where ?? {});
        gamesRaw = await prismaArg.mgemod_duels.findMany({ ...findManyParams, where: whereWithIds });
        if (query.has('withTotal')) {
          total = await prismaArg.mgemod_duels.count({ where: whereWithIds });
        }
        break;
      }
      if (query.has('withTotal')) {
        total = await prismaArg.mgemod_duels.count({ where: findManyParams.where });
      }
      break;
    case 'br':
      if (!additionalIdFilter && !q) {
        gamesRaw = await prismaBr.mgemod_duels.findMany(findManyParams);
      } else {
        let idFilters = additionalIdFilter;
        if (!idFilters && q) {
          const players = await prismaBr.mgemod_stats.findMany({
            where: { name: { contains: q } },
            select: { steamid: true }
          });
          idFilters = players.map((p) => p.steamid);
        }
        const whereWithIds: Prisma.mgemod_duelsWhereInput =
          idFilters && idFilters.length > 0
            ? {
                AND: [
                  findManyParams.where ?? {},
                  outcome === 'win' ? { winner: { in: idFilters } } : outcome === 'loss' ? { loser: { in: idFilters } } : { OR: [{ winner: { in: idFilters } }, { loser: { in: idFilters } }] }
                ]
              }
            : (findManyParams.where ?? {});
        gamesRaw = await prismaBr.mgemod_duels.findMany({ ...findManyParams, where: whereWithIds });
        if (query.has('withTotal')) {
          total = await prismaBr.mgemod_duels.count({ where: whereWithIds });
        }
        break;
      }
      if (query.has('withTotal')) {
        total = await prismaBr.mgemod_duels.count({ where: findManyParams.where });
      }
      break;
    default:
      return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }

  const steamIDs = Array.from(new Set(gamesRaw.flatMap((game) => [game.winner, game.loser]).filter((id): id is string => Boolean(id))));

  let players: { steamid: string; name: string | null }[] = [];
  if (query.get('db') === 'br') {
    players = await prismaBr.mgemod_stats.findMany({
      where: { steamid: { in: steamIDs } },
      select: { steamid: true, name: true }
    });
  } else {
    players = await prismaArg.mgemod_stats.findMany({
      where: { steamid: { in: steamIDs } },
      select: { steamid: true, name: true }
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
    // add canonical arena for UI friendliness
    arenaname: game.arenaname ?? null,
    arenanameCanonical: canonicalizeArenaName(game.arenaname ?? '')
  }));

  if (query.has('withTotal')) {
    return json({ items: games, total });
  }
  return json(games);
};
