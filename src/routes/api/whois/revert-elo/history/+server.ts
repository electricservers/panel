import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { EloReversion } from '$lib/models/eloReversion';

// GET /api/whois/revert-elo/history?region=ar|br&steamid2=STEAM_...&take=50&skip=0
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = locals.user as { role?: string } | null;
  if (!user || user.role !== 'owner') return json({ error: 'Forbidden' }, { status: 403 });

  const region = url.searchParams.get('region') === 'br' ? 'br' : 'ar';
  const steamid2 = url.searchParams.get('steamid2') || undefined;
  const take = Math.min(Number(url.searchParams.get('take') || 50), 200);
  const skip = Math.max(Number(url.searchParams.get('skip') || 0), 0);

  const where: any = { region };
  if (steamid2) where.targetSteam2 = steamid2;

  const [items, total] = await Promise.all([
    EloReversion.find(where)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .select({
        region: 1,
        targetSteam2: 1,
        targetSteam64: 1,
        actorSteam64: 1,
        actorName: 1,
        'summary.currentRatingBefore': 1,
        'summary.finalRatingApplied': 1,
        'summary.matchesConsidered': 1,
        'summary.opponentsCount': 1,
        'summary.opponentsTotalDelta': 1,
        createdAt: 1
      })
      .lean(),
    EloReversion.countDocuments(where)
  ]);

  return json({ items, total });
};



