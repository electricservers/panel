import prismaArg from '$lib/prismaArg';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event: any) => {
    const query = event.url.searchParams;
    const steamid = query.get('steamid');
    const playerInfo = await prismaArg.whois_logs.findMany({
        where: {
            steam_id: steamid
        }
    })
    return json(playerInfo);
};