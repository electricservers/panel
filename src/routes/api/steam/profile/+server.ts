import { STEAM_API_KEY } from '$lib/steam/config';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const steamid = url.searchParams.get('steamid');
  if (!steamid) {
    return json({ error: 'Missing steamid' }, { status: 400 });
  }

  if (!STEAM_API_KEY) {
    return json({ error: 'Server missing STEAM_API_KEY' }, { status: 500 });
  }

  try {
    const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(
      STEAM_API_KEY
    )}&steamids=${encodeURIComponent(steamid)}`;
    const resp = await fetch(apiUrl, { method: 'GET' });
    if (!resp.ok) {
      return json({ error: 'Steam API error' }, { status: 502 });
    }
    const data = await resp.json();
    const player = data?.response?.players?.[0];
    if (!player) {
      return json({ error: 'Player not found' }, { status: 404 });
    }
    return json(player);
  } catch (error) {
    return json({ error: 'Failed to fetch Steam profile' }, { status: 500 });
  }
};


