<script lang="ts">
  import { ID } from '@node-steam/id';

  export interface LeaderboardPlayer {
    rank: number;
    steamid: string;
    name: string | null;
    rating: number | null;
    wins: number | null;
    losses: number | null;
    totalGames?: number;
    wl?: string | number;
    winrate?: string | number;
    avatarUrl?: string | null;
  }

  interface Props {
    player: LeaderboardPlayer;
    highlight?: boolean;
  }

  let { player, highlight = false }: Props = $props();

  function to64(id?: string | null): string | null {
    if (!id) return null;
    try { return new ID(id).get64(); } catch { return null; }
  }
</script>

<div data-steam64={to64(player.steamid) ?? undefined} class={`group relative flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-900/40 dark:hover:bg-gray-900 ${highlight ? 'border-blue-400 ring-2 ring-blue-400/40 dark:border-blue-400/70' : 'border-gray-200 dark:border-gray-700'}` }>
  <div class="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gray-100 text-sm font-extrabold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">#{player.rank}</div>
  {#if player.avatarUrl}
    <img src={player.avatarUrl} alt="Avatar" width="40" height="40" loading="lazy" decoding="async" class="h-10 w-10 flex-none rounded-full ring-1 ring-gray-200 object-cover dark:ring-gray-700" />
  {:else}
    <div class="h-10 w-10 flex-none rounded-full bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"></div>
  {/if}
  <div class="min-w-0 flex-1">
    <div class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
      {#if to64(player.steamid)}
        <a href={`/mge/games/${to64(player.steamid)}`} class="hover:underline">{player.name}</a>
      {:else}
        {player.name}
      {/if}
    </div>
    <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      <span class="inline-flex items-center gap-1"><span class="text-gray-400">Rating</span> <span class="font-semibold text-gray-700 dark:text-gray-300">{player.rating ?? '—'}</span></span>
      <span class="inline-flex items-center gap-1"><span class="text-gray-400">W</span> <span class="font-semibold text-emerald-600 dark:text-emerald-400">{player.wins ?? 0}</span></span>
      <span class="inline-flex items-center gap-1"><span class="text-gray-400">L</span> <span class="font-semibold text-rose-600 dark:text-rose-400">{player.losses ?? 0}</span></span>
      {#if player.totalGames !== undefined}
        <span class="inline-flex items-center gap-1"><span class="text-gray-400">Games</span> <span class="font-semibold">{player.totalGames}</span></span>
      {/if}
      {#if player.wl !== undefined}
        <span class="inline-flex items-center gap-1"><span class="text-gray-400">W/L</span> <span class="font-semibold">{player.wl}</span></span>
      {/if}
      {#if player.winrate !== undefined}
        <span class="inline-flex items-center gap-1"><span class="text-gray-400">Win%</span> <span class="font-semibold">{player.winrate}%</span></span>
      {/if}
    </div>
  </div>
</div>


