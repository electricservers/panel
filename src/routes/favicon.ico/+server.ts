import { error } from '@sveltejs/kit';
import { getSiteSettings } from '$lib/server/db/settings';
import type { RequestHandler } from './$types';

/** Serves the admin-uploaded favicon blob; browsers fall back to the static default on 404. */
export const GET: RequestHandler = () => {
	const settings = getSiteSettings();
	if (!settings.faviconData || !settings.faviconMimeType) {
		error(404, 'No custom favicon set.');
	}

	return new Response(new Uint8Array(settings.faviconData), {
		headers: {
			'Content-Type': settings.faviconMimeType,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
