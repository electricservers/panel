<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import type { mgemod_stats } from '@prisma-arg/client';
  import { onMount } from 'svelte';
  import { ID } from '@node-steam/id';

  import { regionStore, type Region } from '$lib/stores/regionStore';

  interface Row {
    pos: number;
    name: string;
    wins: number;
    steamid: string;
    rating: number | null;
    steamid64: string | null;
  }

  let loading = $state(true);
  let errorMsg = $state('');
  let currentRegion: Region = $state('ar');
  let rows: Row[] = $state([]);
  let avatarMap = $state<Record<string, string>>({});

  async function fetchTop(region: Region, take = 5): Promise<Row[]> {
    const params = new URLSearchParams({ db: region, take: String(take), sortKey: 'rating', sortDir: 'desc' });
    const res = await fetch(`/api/mge/rank?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch ${region}`);
    const payload = await res.json();
    const items: mgemod_stats[] = Array.isArray(payload) ? payload : payload.items;
    return items.map((u, idx) => {
      let steamid64: string | null = null;
      try {
        steamid64 = u.steamid ? new ID(u.steamid).get64() : null;
      } catch {
        steamid64 = null;
      }
      return {
        pos: idx + 1,
        name: u.name ?? 'Unknown',
        wins: u.wins ?? 0,
        steamid: u.steamid,
        rating: u.rating ?? null,
        steamid64
      };
    });
  }

  onMount(() => {
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      (async () => {
        loading = true;
        try {
          rows = await fetchTop(r);
          await fetchAvatarsForRows(rows);
          errorMsg = '';
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : 'Unknown error';
        } finally {
          loading = false;
        }
      })();
    });
    // initial load
    (async () => {
      loading = true;
      try {
        rows = await fetchTop(currentRegion);
        await fetchAvatarsForRows(rows);
        errorMsg = '';
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : 'Unknown error';
      } finally {
        loading = false;
      }
    })();
    return () => unreg();
  });

  async function fetchAvatarsForRows(list: Row[]) {
    try {
      const ids = Array.from(new Set(list.map((r) => r.steamid64).filter(Boolean))) as string[];
      if (ids.length === 0) {
        avatarMap = {};
        return;
      }
      const resp = await fetch(`/api/steam/profile?steamids=${encodeURIComponent(ids.join(','))}`);
      if (!resp.ok) return;
      const data = await resp.json();
      const map: Record<string, string> = {};
      for (const [sid, info] of Object.entries<any>(data)) {
        const url = info?.avatarfull || info?.avatarmedium || info?.avatar;
        if (sid && url) map[sid] = url as string;
      }
      avatarMap = map;
    } catch {}
  }
</script>

<Card title="Leaderboard">
  {#snippet titleSuffix()}
    <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <span class="fi fi-{currentRegion}"></span>
      <span class="uppercase">{currentRegion}</span>
    </span>
  {/snippet}
  {#if loading}
    <div class="py-4 text-center text-sm text-gray-500">Loading…</div>
  {:else if errorMsg}
    <div class="py-4 text-center text-sm text-rose-500">{errorMsg}</div>
  {:else}
    <div class="space-y-2">
      {#each rows as r}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">#{r.pos}</span>
            {#if r.steamid64 && avatarMap[r.steamid64]}
              <img class="h-6 w-6 rounded" src={avatarMap[r.steamid64]} alt="avatar" />
            {:else}
              <div class="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700"></div>
            {/if}
            {#if r.steamid64}
              <a class="font-medium text-emerald-600 hover:underline dark:text-emerald-400" href="/mge/players/{r.steamid64}">{r.name}</a>
            {:else}
              <span class="font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
            {/if}
          </div>
          <span class="text-xs text-gray-500">{r.rating ?? '-'}</span>
        </div>
      {/each}
    </div>
    <div class="mt-3">
      <a href="/mge/ranking" class="text-sm text-emerald-500 hover:underline">View all</a>
    </div>
  {/if}
</Card>


