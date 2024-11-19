import { createSteamAuth } from '$lib/steam/steam';
import type { PageServerLoadEvent } from './$types';
import { User } from '$lib/models/user';
import type { SteamProfile } from '$lib/steam/config';

export const load = async ({ request, cookies }: PageServerLoadEvent) => {
  try {
    const steam = createSteamAuth(request);
    const user = await steam.authenticate(request);
    const steamProfile = user._json as SteamProfile;
    const dbUser = await User.findOne({ steamId: steamProfile.steamid });

    const userWithRole: SteamProfile & { role: string } = {
      ...steamProfile,
      role: dbUser?.role || 'user'
    };

    const userJson = JSON.stringify(userWithRole);
    cookies.set('client', userJson, { path: '/', httpOnly: true, secure: true, sameSite: 'strict' });

    return { user: userJson };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      error: 'Authentication failed',
      status: 401
    };
  }
};
