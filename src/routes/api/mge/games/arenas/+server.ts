import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { canonicalizeArenaName } from '$lib/mge/arenaNames';

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
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    const raw = r.arenaname ?? '';
    if (!raw) continue;
    const canonical = canonicalizeArenaName(raw);
    if (!canonical) continue;
    (map[canonical] ||= []).push(raw);
  }
  const items = Object.keys(map).sort((a, b) => a.localeCompare(b));
  return json({ items, variants: map });
};
