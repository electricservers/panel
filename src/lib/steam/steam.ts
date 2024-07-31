import SteamAuth from 'node-steam-openid'
import { getDomain, STEAM_API_KEY } from "./config";

const path = `/api/auth/return`
export function createSteamAuth(request: Request) {
    const domain = getDomain(request);
    return new SteamAuth({
        realm: domain, 
        returnUrl: `${domain}${path}`,
        apiKey: STEAM_API_KEY
    });
}