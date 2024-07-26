import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event: any) => {
    const query = event.url.searchParams;
    const steamid = query.get('steamid');
    const playerInfo = await prisma.whois_logs.findMany({
        where: {
            steam_id: steamid
        }
    })
    return json(playerInfo);
};