import { redirect } from '@sveltejs/kit';
import { createSteamAuth, safeReturnTo } from '$lib/server/steam';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const returnTo = safeReturnTo(url.searchParams.get('returnTo'));

	cookies.set('returnTo', returnTo, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	const steam = createSteamAuth();
	const redirectUrl = await steam.getRedirectUrl();
	redirect(302, redirectUrl);
};
