import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/api/auth/login');
  }

  return {
    id: params.steamid
  }
};
