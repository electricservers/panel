import { STEAM_API_KEY } from '$lib/steam/config';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const steamid = url.searchParams.get('steamid');
  const steamidsParam = url.searchParams.get('steamids'); // comma-separated 64-bit IDs

  if (!steamid && !steamidsParam) {
    return json({ error: 'Missing steamid(s)' }, { status: 400 });
  }

  if (!STEAM_API_KEY) {
    return json({ error: 'Server missing STEAM_API_KEY' }, { status: 500 });
  }

  try {
    if (steamidsParam) {
      const ids = Array.from(
        new Set(
          steamidsParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      if (ids.length === 0) {
        return json({}, { headers: { 'cache-control': 'public, max-age=3600' } });
      }
      // Steam supports up to 100 per request; our lists are small, so no chunking needed for now
      const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(STEAM_API_KEY)}&steamids=${encodeURIComponent(ids.join(','))}`;
      const resp = await fetch(apiUrl, { method: 'GET' });
      if (!resp.ok) {
        return json({ error: 'Steam API error' }, { status: 502 });
      }
      const data = await resp.json();
      const players: any[] = data?.response?.players ?? [];
      const map: Record<string, { avatar: string; avatarmedium: string; avatarfull: string; personaname?: string }> = {};
      for (const p of players) {
        if (p?.steamid) {
          map[p.steamid] = {
            avatar: p.avatar,
            avatarmedium: p.avatarmedium,
            avatarfull: p.avatarfull,
            personaname: p.personaname
          };
        }
      }
      return json(map, { headers: { 'cache-control': 'public, max-age=21600' } }); // 6h cache
    }

    // Single player fallback
    const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(STEAM_API_KEY)}&steamids=${encodeURIComponent(steamid!)}`;
    const resp = await fetch(apiUrl, { method: 'GET' });
    if (!resp.ok) {
      return json({ error: 'Steam API error' }, { status: 502 });
    }
    const data = await resp.json();
    const player = data?.response?.players?.[0];
    if (!player) {
      return json({ error: 'Player not found' }, { status: 404 });
    }
    return json(player, { headers: { 'cache-control': 'public, max-age=21600' } });
  } catch {
    return json({ error: 'Failed to fetch Steam profile' }, { status: 500 });
  }
};
