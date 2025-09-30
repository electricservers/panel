import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { ID } from '@node-steam/id';
import { toSteam64FromAny, allIdVariantsForSteam64 } from '$lib/whois/utils';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		const returnTo = encodeURIComponent(url.pathname + url.search);
		throw redirect(302, `/api/auth/login?returnTo=${returnTo}`);
	}

	let existsInAr = false;
	let existsInBr = false;
	let lastSeenAr: number | null = null;
	let lastSeenBr: number | null = null;
	let arAvailable = true;
	let brAvailable = true;

	try {
		const id2 = new ID(params.steamid).getSteamID2();

		// Query each region independently so one outage doesn't mask the other
		const [arRes, brRes] = await Promise.allSettled([
			(async () => {
				const [count, last] = await Promise.all([
					prismaArg.mgemod_stats.count({ where: { steamid: id2 } }),
					prismaArg.mgemod_duels.findFirst({
						where: { OR: [{ winner: id2 }, { loser: id2 }] },
						orderBy: { id: 'desc' },
						select: { endtime: true }
					})
				]);
				return { count, last };
			})(),
			(async () => {
				const [count, last] = await Promise.all([
					prismaBr.mgemod_stats.count({ where: { steamid: id2 } }),
					prismaBr.mgemod_duels.findFirst({
						where: { OR: [{ winner: id2 }, { loser: id2 }] },
						orderBy: { id: 'desc' },
						select: { endtime: true }
					})
				]);
				return { count, last };
			})()
		]);

		if (arRes.status === 'fulfilled') {
			existsInAr = (arRes.value.count ?? 0) > 0;
			lastSeenAr = arRes.value.last?.endtime ? Number(arRes.value.last.endtime) : null;
		} else {
			arAvailable = false;
		}

		if (brRes.status === 'fulfilled') {
			existsInBr = (brRes.value.count ?? 0) > 0;
			lastSeenBr = brRes.value.last?.endtime ? Number(brRes.value.last.endtime) : null;
		} else {
			brAvailable = false;
		}
	} catch {}

	// Determine if viewed profile is an alt of the logged-in user's main
	let isAltOfViewerMain = false;
	try {
		const viewer64 = toSteam64FromAny(String(locals.user?.steamid || ''));
		const viewed64 = toSteam64FromAny(String(params.steamid));
		if (viewer64 && viewed64) {
			const viewerVariants = allIdVariantsForSteam64(viewer64);
			const viewerAltRow = await prismaArg.whois_alt_links.findFirst({
				where: { steam_id: { in: viewerVariants } },
				select: { main_steam_id: true }
			});
			const viewerMain64 = viewerAltRow?.main_steam_id ? toSteam64FromAny(viewerAltRow.main_steam_id) || viewer64 : viewer64;

			const viewedVariants = allIdVariantsForSteam64(viewed64);
			const viewerMainVariants = allIdVariantsForSteam64(viewerMain64);

			const link = await prismaArg.whois_alt_links.findFirst({
				where: {
					steam_id: { in: viewedVariants },
					main_steam_id: { in: viewerMainVariants }
				},
				select: { steam_id: true }
			});
			isAltOfViewerMain = Boolean(link);
		}
	} catch {}

	return {
		id: params.steamid,
		existsInAr,
		existsInBr,
		lastSeenAr,
		lastSeenBr,
		lastSeen: Math.max(lastSeenAr ?? 0, lastSeenBr ?? 0) || null,
		isAltOfViewerMain,
		arAvailable,
		brAvailable
	};
};


