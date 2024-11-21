import { ID } from '@node-steam/id';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
  const id = new ID(locals.user?.steamid).get64();
  redirect(302, `/mge/games/${id}`);
}) satisfies PageServerLoad;
