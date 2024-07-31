import { createSteamAuth } from '$lib/steam/steam';
import type { PageServerLoadEvent } from './$types';

export const load = async ({ request, cookies }: PageServerLoadEvent) => {
    try {
        const steam = createSteamAuth(request);
        const user = await steam.authenticate(request);
        const userJson = JSON.stringify(user._json);
        cookies.set('client', userJson, { path: '/' });
        return { user: userJson };
    } catch (error) {
        console.error(error);
        return { error: 'Authentication failed' };
    }
}
