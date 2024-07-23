import type { mgemod_stats } from '@prisma/client';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
    const response = await event.fetch('/api/mge/rank');
    const ranking: mgemod_stats[] = await response.json();
    return { ranking };
}) satisfies PageServerLoad;