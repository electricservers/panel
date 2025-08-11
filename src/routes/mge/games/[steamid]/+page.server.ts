import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import prismaArg from '$lib/prisma/prismaArg';
import prismaBr from '$lib/prisma/prismaBr';
import { ID } from '@node-steam/id';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) {
    const returnTo = encodeURIComponent(url.pathname + url.search);
    throw redirect(302, `/api/auth/login?returnTo=${returnTo}`);
  }

  // Discover presence in each region DB
  let existsInAr = false;
  let existsInBr = false;
  try {
    const id2 = new ID(params.steamid).getSteamID2();
    const [arCount, brCount] = await Promise.all([prismaArg.mgemod_stats.count({ where: { steamid: id2 } }), prismaBr.mgemod_stats.count({ where: { steamid: id2 } })]);
    existsInAr = (arCount ?? 0) > 0;
    existsInBr = (brCount ?? 0) > 0;
  } catch {
    // If conversion fails or DB error occurs, leave as false/false
  }

  return {
    // Always pass a fresh id to force client updates when navigating profiles
    id: params.steamid,
    existsInAr,
    existsInBr
  };
};
