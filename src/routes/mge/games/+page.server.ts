import type { mgemod_duels } from '@prisma-arg/client';
import type { PageServerLoad } from './$types';

export const load = (async (event: any) => {
  // Default server render uses the current region from cookie if available; fallback to 'ar'
  const region = event.cookies.get('region') ?? 'ar';
  const response = await event.fetch(`/api/mge/games?db=${region}`);
  if (response.status === 503) {
    // Mark no games but include flag so client can present message and allow switching
    return { games: [], dbUnavailable: region } as { games: mgemod_duels[]; dbUnavailable: 'ar' | 'br' };
  }
  const games: mgemod_duels[] = await response.json();
  return { games };
}) satisfies PageServerLoad;
