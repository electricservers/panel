import SteamAuth from 'node-steam-openid'
import { DOMAIN, STEAM_API_KEY } from "./config";

const path = `/auth/return`
export const steam = new SteamAuth({
    realm: DOMAIN, 
    returnUrl: `${DOMAIN}${path}`,
    apiKey: STEAM_API_KEY
})