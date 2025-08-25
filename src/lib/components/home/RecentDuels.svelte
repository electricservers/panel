<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { onMount } from 'svelte';
  import { regionStore } from '$lib/stores/regionStore';
  import { ID } from '@node-steam/id';

  type Region = 'ar' | 'br';

  interface RecentItem extends MgeDuel {
    region: Region;
  }

  let loading = $state(true);
  let items: RecentItem[] = $state([]);
  let errorMsg = $state('');
  let currentRegion: Region = $state('ar');

  function to64(id?: string | null): string | null {
    try {
      return id ? new ID(id).get64() : null;
    } catch {
      return null;
    }
  }

  async function fetchRecent(region: Region, take = 20): Promise<MgeDuel[]> {
    const res = await fetch(`/api/mge/games?db=${region}&take=${take}`);
    if (!res.ok) throw new Error(`Failed to fetch ${region}`);
    return (await res.json()) as MgeDuel[];
  }

  function formatDate(unixEpoch: string | null): string {
    const date = new Date(Number(unixEpoch) * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  }

  function relativeTime(unixEpoch: string | null): string {
    if (!unixEpoch) return '';
    const ts = Number(unixEpoch) * 1000;
    if (!Number.isFinite(ts)) return '';
    const now = Date.now();
    let diff = Math.max(0, now - ts);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    if (diff < hour) {
      const m = Math.max(1, Math.floor(diff / minute));
      return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diff < day) {
      const h = Math.floor(diff / hour);
      return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diff < week) {
      const d = Math.floor(diff / day);
      return `${d} ${d === 1 ? 'day' : 'days'} ago`;
    }
    const w = Math.floor(diff / week);
    return `${w} ${w === 1 ? 'week' : 'weeks'} ago`;
  }

  onMount(() => {
    const unreg = regionStore.subscribe(async (r) => {
      currentRegion = r;
      loading = true;
      try {
        const list = await fetchRecent(r, 20);
        items = list.map((g) => ({ ...g, region: r }));
        errorMsg = '';
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : 'Unknown error';
      } finally {
        loading = false;
      }
    });
    return () => unreg();
  });
</script>

<Card title="Recent duels" class="w-full !max-w-none">
  {#snippet titleSuffix()}
    <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <span class="fi fi-{currentRegion}"></span>
      <span class="uppercase">{currentRegion}</span>
    </span>
  {/snippet}
  {#if loading}
    <div class="py-8 text-center text-sm text-gray-500">Loading…</div>
  {:else if errorMsg}
    <div class="py-8 text-center text-sm text-rose-500">{errorMsg}</div>
  {:else if items.length === 0}
    <div class="py-8 text-center text-sm text-gray-500">No recent duels.</div>
  {:else}
    <ul class="divide-y divide-gray-200 dark:divide-gray-700">
      {#each items as it}
        <li class="flex items-center justify-between py-2 text-sm">
          <div class="min-w-0 flex-1 truncate">
            <span class="text-xs text-gray-500" title={formatDate(String(it.endtime ?? ''))}>{relativeTime(String(it.endtime ?? ''))}</span>
            {#if to64(it.winner)}
              <a class="ml-2 font-medium text-emerald-600 hover:underline dark:text-emerald-400" href="/mge/players/{to64(it.winner)}">{it.winnername}</a>
            {:else}
              <span class="ml-2 font-medium text-gray-900 dark:text-gray-100">{it.winnername}</span>
            {/if}
            <span class="mx-1 text-gray-500">beat</span>
            {#if to64(it.loser)}
              <a class="text-emerald-600 hover:underline dark:text-emerald-400" href="/mge/players/{to64(it.loser)}">{it.losername}</a>
            {:else}
              <span class="text-gray-300">{it.losername}</span>
            {/if}
            <span class="ml-2 text-gray-500">on {it.arenanameCanonical ?? it.arenaname}</span>
          </div>
          <span class="shrink-0 text-xs text-gray-500">{formatDate(String(it.endtime ?? ''))}</span>
        </li>
      {/each}
    </ul>
    <div class="mt-3">
      <a href="/mge/games" class="text-sm text-emerald-500 hover:underline">View all</a>
    </div>
  {/if}
</Card>


