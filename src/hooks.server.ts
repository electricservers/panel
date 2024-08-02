import type { SteamProfile } from '$lib/steam/config';
import type { Cookies, Handle } from '@sveltejs/kit';
import { connectToDatabase } from '$lib/db';

connectToDatabase();

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.user = getUserFromCookies(event.cookies);
    return resolve(event);
};

function getUserFromCookies(cookies: Cookies): SteamProfile | null {
    const userCookie = cookies.get('client');
    if (!userCookie) return null;

    try {
        const user = JSON.parse(userCookie);
        if (isValidSteamProfile(user)) {
            return user;
        }
    } catch (error) {
        console.error('Error parsing user cookie:', error);
    }

    return null;
}

function isValidSteamProfile(user: any): user is SteamProfile {
    return user && typeof user === 'object' && 'steamid' in user;
}