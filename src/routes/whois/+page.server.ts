import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user as { steamid: string; role?: string } | null;

  // Enforce owner-only access for WHOIS section (UI is already hidden for others)
  if (!user) {
    throw redirect(302, '/');
  }

  if (user.role !== 'owner') {
    throw error(403, 'Forbidden');
  }

  return { user };
};
