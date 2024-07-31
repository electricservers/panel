import { env } from '$env/dynamic/private';
export const DOMAIN = env.DOMAIN || 'http://localhost:5173';
export const STEAM_API_KEY = env.STEAM_API_KEY || '';

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
