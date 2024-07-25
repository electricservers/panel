import type { RequestHandler } from './$types';
import prisma from '$lib/prisma';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
    try {
        const query = event.url.searchParams;
        let ranking = await prisma.mgemod_stats.findMany({
            orderBy: [
                {
                    rating: 'desc'
                }
            ],
            take: Number(query.get('limit')) || 250,
            where: query.has('steamid') ? {steamid: query.get('steamid')!} : {}
        });
        return json(ranking);
    } catch (err: any) {
        return error(500, err);
    }
};
