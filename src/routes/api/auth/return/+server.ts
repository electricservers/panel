import { redirect } from '@sveltejs/kit';
import { createSteamAuth, safeReturnTo } from '$lib/server/steam';
import { upsertUserOnLogin } from '$lib/server/db/users';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, sealSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, cookies }) => {
	const steam = createSteamAuth();

	let profile;
	try {
		profile = await steam.authenticate(request);
	} catch (error) {
		console.error('Steam authentication failed:', error);
		redirect(302, '/?auth_error=1');
	}

	const dbUser = upsertUserOnLogin({
		steamId: profile.steamid,
		name: profile.username,
		avatar: profile.avatar?.medium
	});

	cookies.set(
		SESSION_COOKIE_NAME,
		sealSession({
			steamId: dbUser.steamId,
			role: dbUser.role,
			name: dbUser.name ?? undefined,
			avatar: dbUser.avatar ?? undefined
		}),
		SESSION_COOKIE_OPTIONS
	);

	const returnTo = safeReturnTo(cookies.get('returnTo'));
	cookies.delete('returnTo', { path: '/' });

	redirect(302, returnTo);
};
