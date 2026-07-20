import { error, json } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { sourceHas } from '$lib/server/sources/registry';
import { requireModule } from '$lib/server/require-module';
import type { RequestHandler } from './$types';

/** Backs the home page's source-activity day-preset chips. */
export const GET: RequestHandler = async ({ url }) => {
	requireModule('mgemod');
	const sourceId = resolveMgeSourceId(url);
	if (!sourceHas(sourceId, 'mgemod')) {
		error(404, `Source "${sourceId}" has no mgemod capability.`);
	}

	const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 7));
	const sourceActivity = await mgeFor(sourceId).getSourceActivity({
		from: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
	});

	return json(sourceActivity);
};
