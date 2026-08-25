import { error, json } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { sourceHas } from '$lib/server/sources/registry';
import { requireModule } from '$lib/server/require-module';
import type { RequestHandler } from './$types';

const TAKE = 8;

/** Backs the home page's trending-arenas day-preset chips. */
export const GET: RequestHandler = async ({ url, cookies }) => {
	requireModule('mgemod');
	const sourceId = resolveMgeSourceId(cookies);
	if (!sourceHas(sourceId, 'mgemod')) {
		error(404, `Source "${sourceId}" has no mgemod capability.`);
	}

	const days = Math.max(1, Number(url.searchParams.get('days')) || 7);
	const trendingArenas = await mgeFor(sourceId).getTrendingArenas({
		take: TAKE,
		from: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
	});

	return json(trendingArenas);
};
