import { redirect } from '@sveltejs/kit';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	requireModule('mgemod');
	if (!locals.user) {
		const returnTo = encodeURIComponent(url.pathname);
		throw redirect(302, `/api/auth/login?returnTo=${returnTo}`);
	}
	throw redirect(302, `/mge/players/${locals.user.steamId}`);
};
