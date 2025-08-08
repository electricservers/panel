import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import type { Prisma } from '@prisma-arg/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { canonicalizeArenaName } from '$lib/mge/arenaNames';

interface ArenaRow {
  arenaname: string | null;
  _count: { _all: number };
}

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams;
  const db = query.get('db');
  let days = Number(query.get('days') || 7);
  let take = Number(query.get('take') || 5);
  if (!db || (db !== 'ar' && db !== 'br')) {
    return error(400, "wrong db supplied (only 'ar' or 'br' accepted)");
  }
  if (!Number.isFinite(days) || days <= 0) days = 7;
  days = Math.min(365, Math.max(1, Math.floor(days)));
  if (!Number.isFinite(take) || take <= 0) take = 5;
  take = Math.min(15, Math.max(3, Math.floor(take)));

  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = String(nowSec - Math.floor(days * 86400));

  const client = db === 'ar' ? prismaArg : prismaBr;

  // Group by raw names in the window
  // @ts-expect-error Prisma groupBy requires extra args in this env
  const rows: ArenaRow[] = await client.mgemod_duels.groupBy({
    by: ['arenaname'],
    where: { gametime: { gte: cutoff } as any } as Prisma.mgemod_duelsWhereInput,
    _count: { _all: true }
  });

  // Aggregate into canonical names
  const agg: Record<string, number> = {};
  for (const r of rows) {
    const key = canonicalizeArenaName(r.arenaname ?? '');
    if (!key) continue;
    const n = r._count?._all ?? 0;
    agg[key] = (agg[key] || 0) + n;
  }

  const total = Object.values(agg).reduce((s, n) => s + n, 0);
  const items = Object.entries(agg)
    .map(([name, matches]) => ({
      name,
      matches,
      percent: total > 0 ? Number(((matches / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => (a.matches === b.matches ? a.name.localeCompare(b.name) : b.matches - a.matches))
    .slice(0, take);

  return json({ items, total, days });
};


