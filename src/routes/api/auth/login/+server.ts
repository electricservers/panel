import { createSteamAuth } from '$lib/steam/steam';
import { redirect } from '@sveltejs/kit';

export const GET = async ({ request, url, cookies }) => {
  // Prefer explicit returnTo param; fallback to same-origin referrer; default '/'
  let returnTo = url.searchParams.get('returnTo') ?? '';

  if (!returnTo) {
    const referer = request.headers.get('referer');
    try {
      if (referer) {
        const refererUrl = new URL(referer);
        if (refererUrl.origin === url.origin) {
          returnTo = refererUrl.pathname + refererUrl.search + refererUrl.hash;
        }
      }
    } catch {
      // ignore invalid referrer
    }
  }

  // Ensure relative, safe path to avoid open-redirects
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    returnTo = '/';
  }

  // Store desired return path for the callback handler
  cookies.set('returnTo', returnTo, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });

  const steam = createSteamAuth(request);
  const redirectUrl = await steam.getRedirectUrl();
  throw redirect(302, redirectUrl);
};
