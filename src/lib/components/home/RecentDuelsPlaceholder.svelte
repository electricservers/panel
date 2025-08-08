<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { onMount } from 'svelte';
  import { ID } from '@node-steam/id';

  type Region = 'ar' | 'br';

  interface RecentItem extends MgeDuel {
    region: Region;
  }

  let loading = true;
  let items: RecentItem[] = [];
  let errorMsg = '';

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

  onMount(async () => {
    try {
      const [ar, br] = await Promise.all([fetchRecent('ar'), fetchRecent('br')]);
      const merged: RecentItem[] = [
        ...ar.map((g) => ({ ...g, region: 'ar' as const })),
        ...br.map((g) => ({ ...g, region: 'br' as const })),
      ];
      // Sort by gametime desc across regions (fallback to id desc) and keep top 10
      merged.sort((a, b) => {
        const timeDiff = (Number(b.gametime) || 0) - (Number(a.gametime) || 0);
        if (timeDiff !== 0) return timeDiff;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      items = merged.slice(0, 10);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

<Card title="Recent duels" subtitle="Live feed (last 10 across regions)">
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
            <span class="inline-flex items-center gap-1">
              <span class="fi fi-{it.region}"></span>
              <span class="text-xs uppercase text-gray-500">{it.region}</span>
            </span>
            {#if to64(it.winner)}
              <a class="ml-2 font-medium text-emerald-600 hover:underline dark:text-emerald-400" href="/mge/games/{to64(it.winner)}">{it.winnername}</a>
            {:else}
              <span class="ml-2 font-medium text-gray-900 dark:text-gray-100">{it.winnername}</span>
            {/if}
            <span class="mx-1 text-gray-500">def.</span>
            {#if to64(it.loser)}
              <a class="text-emerald-600 hover:underline dark:text-emerald-400" href="/mge/games/{to64(it.loser)}">{it.losername}</a>
            {:else}
              <span class="text-gray-300">{it.losername}</span>
            {/if}
            <span class="ml-2 text-gray-500">on {it.arenaname}</span>
          </div>
          <span class="shrink-0 text-xs text-gray-500">{formatDate(it.gametime)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</Card>


