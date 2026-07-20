import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME, unsealSession } from '$lib/server/session';
import '$lib/server/sources/register-capabilities';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = unsealSession(event.cookies.get(SESSION_COOKIE_NAME));
	return resolve(event);
};
