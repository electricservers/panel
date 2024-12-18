import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/api/auth/login');
  }

  if (locals.user.steamid !== params.steamid && locals.user.role !== 'owner') {
    throw error(403, 'Access denied');
  }

  return {
    id: params.steamid
  }
};
