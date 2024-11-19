import type { mgemod_duels } from '@prisma-arg/client';
import type { PageServerLoad } from './$types';

export const load = (async (event: any) => {
  const response = await event.fetch('/api/mge/games');
  const games: mgemod_duels[] = await response.json();
  return games;
}) satisfies PageServerLoad;
