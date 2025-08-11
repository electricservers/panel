import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const resp = await fetch('/api/admin/users');
  const data = await resp.json();
  return { users: resp.ok ? data.users : [] };
};
