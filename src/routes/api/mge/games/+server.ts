import prisma from '$lib/prisma'
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
    const query = event.url.searchParams;
    const games = await prisma.mgemod_duels.findMany({
        orderBy: [
            {
                id: 'desc'
            }
        ],
        take: Number(query.get('limit')) || 500,
        where: {
            ...(query.has('steamid') ? {
                OR: [
                    { winner: query.get('steamid') },
                    { loser: query.get('steamid') }
                ]
            } : {})
        }
    });
	return json(games);
}