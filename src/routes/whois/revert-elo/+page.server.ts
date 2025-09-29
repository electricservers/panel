import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user as { role?: string } | null;
  if (!user || user.role !== 'owner') throw error(403, 'Forbidden');
  return {};
};



