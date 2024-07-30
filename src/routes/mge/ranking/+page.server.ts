import type { mgemod_stats, whois_permname } from '@prisma/client';
import type { PageServerLoad, RouteParams } from './$types';
import type { ServerLoadEvent } from '@sveltejs/kit';

export const load = (async (event) => {
    return {
        rankingPromise: await fetchRankingData(event)
    };
}) satisfies PageServerLoad;

async function fetchRankingData(event: ServerLoadEvent<RouteParams, {}, "/mge/ranking">) {
    const rankResponse = await event.fetch('/api/mge/rank?db=ar');
    const ranking: mgemod_stats[] = await rankResponse.json();

    return ranking.map((user) => {
        const totalGames = user.wins! + user.losses!;
        const wl = user.losses !== 0 ? (user.wins! / user.losses!).toFixed(1) : 'N/A';
        const winrate = totalGames !== 0 ? ((user.wins! / totalGames) * 100).toFixed(1) : '0.0';

        return {
            ...user,
            totalGames,
            wl,
            winrate
        };
    });
}
