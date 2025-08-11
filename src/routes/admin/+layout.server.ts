import type { LayoutServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
  const user = event.locals.user as { steamid: string; role?: string } | null;
  if (!user) throw redirect(302, '/');
  if (user.role !== 'owner') throw error(403, 'Forbidden');
  return { user };
};


