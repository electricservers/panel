import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME, unsealSession } from '$lib/server/session';
import { listSources } from '$lib/server/sources/registry';
import { SOURCE_COOKIE, SOURCE_COOKIE_OPTIONS } from '$lib/server/sources/resolve-source';
import '$lib/server/sources/register-capabilities';

/**
 * `?source=` on an HTML request is a one-shot switch: write `panel_source`
 * and redirect to the same URL without that param. API/fetch requests keep
 * the query so they are not 303'd away from JSON.
 */
function consumeSourceQuery(event: Parameters<Handle>[0]['event']): void {
	const requested = event.url.searchParams.get('source');
	if (!requested) return;

	const enabled = listSources({ capability: 'mgemod', enabled: true });
	if (enabled.some((source) => source.id === requested)) {
		event.cookies.set(SOURCE_COOKIE, requested, SOURCE_COOKIE_OPTIONS);
	}

	const accept = event.request.headers.get('accept') ?? '';
	if (!accept.includes('text/html')) return;

	const clean = new URL(event.url);
	clean.searchParams.delete('source');
	throw redirect(303, `${clean.pathname}${clean.search}${clean.hash}`);
}

function ensureSourceCookie(event: Parameters<Handle>[0]['event']): void {
	const enabled = listSources({ capability: 'mgemod', enabled: true });
	if (enabled.length === 0) return;
	const current = event.cookies.get(SOURCE_COOKIE);
	if (current && enabled.some((source) => source.id === current)) return;
	event.cookies.set(SOURCE_COOKIE, enabled[0].id, SOURCE_COOKIE_OPTIONS);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = unsealSession(event.cookies.get(SESSION_COOKIE_NAME));
	consumeSourceQuery(event);
	ensureSourceCookie(event);
	return resolve(event);
};
