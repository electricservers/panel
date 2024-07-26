import type { mgemod_stats, whois_permname } from '@prisma/client';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
    const rankResponse = await event.fetch('/api/mge/rank');
    const ranking: mgemod_stats[] = await rankResponse.json();

    // Modify each user's data to include totalGames, wl, and winrate
    const modifiedRanking = ranking.map(user => {
        const totalGames = user.wins + user.losses;
        const wl = user.losses !== 0 ? (user.wins / user.losses).toFixed(1) : 'N/A';
        const winrate = totalGames !== 0 ? ((user.wins / totalGames) * 100).toFixed(1) : '0.0';

        return {
            ...user, // Include existing properties
            totalGames,
            wl,
            winrate
        };
    });

    return { ranking: modifiedRanking };
}) satisfies PageServerLoad;