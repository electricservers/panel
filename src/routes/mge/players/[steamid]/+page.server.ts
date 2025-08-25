import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { ID } from '@node-steam/id';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		const returnTo = encodeURIComponent(url.pathname + url.search);
		throw redirect(302, `/api/auth/login?returnTo=${returnTo}`);
	}

	let existsInAr = false;
	let existsInBr = false;
	let lastSeenAr: number | null = null;
	let lastSeenBr: number | null = null;
	try {
		const id2 = new ID(params.steamid).getSteamID2();
		const [arCount, brCount, arLast, brLast] = await Promise.all([
			prismaArg.mgemod_stats.count({ where: { steamid: id2 } }),
			prismaBr.mgemod_stats.count({ where: { steamid: id2 } }),
			prismaArg.mgemod_duels.findFirst({
				where: { OR: [{ winner: id2 }, { loser: id2 }] },
				orderBy: { id: 'desc' },
				select: { endtime: true }
			}),
			prismaBr.mgemod_duels.findFirst({
				where: { OR: [{ winner: id2 }, { loser: id2 }] },
				orderBy: { id: 'desc' },
				select: { endtime: true }
			})
		]);
		existsInAr = (arCount ?? 0) > 0;
		existsInBr = (brCount ?? 0) > 0;
		lastSeenAr = arLast?.endtime ? Number(arLast.endtime) : null;
		lastSeenBr = brLast?.endtime ? Number(brLast.endtime) : null;
	} catch {}

	return {
		id: params.steamid,
		existsInAr,
		existsInBr,
		lastSeenAr,
		lastSeenBr,
		lastSeen: Math.max(lastSeenAr ?? 0, lastSeenBr ?? 0) || null
	};
};


