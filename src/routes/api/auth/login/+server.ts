import { createSteamAuth } from '$lib/steam/steam';

export const GET = async ({ request }) => {
    const steam = createSteamAuth(request);
    const redirectUrl = await steam.getRedirectUrl();
    return Response.redirect(redirectUrl);
};
