import { steam } from "$lib/steam/steam";

export const GET = async () => {
    const redirectUrl = await steam.getRedirectUrl();
    return Response.redirect(redirectUrl);
}