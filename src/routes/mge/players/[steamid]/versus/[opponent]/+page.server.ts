import type { PageServerLoad } from './$types';
import { ID } from '@node-steam/id';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/api/auth/login');
	}

	let a = params.steamid;
	let b = params.opponent;
	try {
		const a64 = new ID(a).get64();
		const b64 = new ID(b).get64();
		if (a64 > b64) {
			throw redirect(308, `/mge/players/${b64}/versus/${a64}`);
		}
	} catch {}

	return { a: params.steamid, b: params.opponent };
};


