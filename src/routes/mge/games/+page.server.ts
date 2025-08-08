import type { mgemod_duels } from '@prisma-arg/client';
import type { PageServerLoad } from './$types';

export const load = (async (event: any) => {
  // Default server render uses the current region from cookie if available; fallback to 'ar'
  const region = event.cookies.get('region') ?? 'ar';
  const response = await event.fetch(`/api/mge/games?db=${region}`);
  const games: mgemod_duels[] = await response.json();
  return { games };
}) satisfies PageServerLoad;
