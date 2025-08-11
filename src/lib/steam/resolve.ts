import { STEAM_API_KEY } from '$lib/steam/config';

export async function resolveVanityTo64(vanityOrUrl: string, fetchFn: typeof fetch): Promise<string | null> {
  const input = vanityOrUrl.trim();
  // Extract vanity from URL or accept raw vanity
  const m = input.match(/steamcommunity\.com\/id\/([^/]+)\/?/i);
  const vanity = m ? decodeURIComponent(m[1]) : input;
  if (!vanity || !STEAM_API_KEY) return null;
  try {
    const apiUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${encodeURIComponent(
      STEAM_API_KEY
    )}&vanityurl=${encodeURIComponent(vanity)}`;
    const resp = await fetchFn(apiUrl, { method: 'GET' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const steamid = data?.response?.steamid;
    return typeof steamid === 'string' && /^\d{17}$/.test(steamid) ? steamid : null;
  } catch {
    return null;
  }
}


