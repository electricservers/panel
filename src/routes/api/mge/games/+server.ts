import { json } from '@sveltejs/kit';
import { Prisma, PrismaClient } from "@prisma/client";

export async function GET(event) {
	const prisma = new PrismaClient();
    const query = event.request.url;
    console.log(query);
    const games = await prisma.mgemod_duels.findMany({
        orderBy: [
            {
                id: 'desc'
            }
        ],
        take: 500
    });
	return json(games);
}