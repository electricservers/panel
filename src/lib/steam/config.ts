import { env } from '$env/dynamic/private';
export const STEAM_API_KEY = env.STEAM_API_KEY || '';

export function getDomain(request: Request) {
    const host = request.headers.get('host') || 'localhost:5173';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
}

export interface SteamProfile {
    steamid: string;
    communityvisibilitystate: number;
    profilestate: number;
    personaname: string;
    commentpermission: number;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    avatarhash: string;
    lastlogoff: number;
    personastate: number;
    realname: string;
    primaryclanid: string;
    timecreated: number;
    personastateflags: number;
    loccountrycode: string;
}
