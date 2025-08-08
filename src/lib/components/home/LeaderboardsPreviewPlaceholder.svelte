<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import type { mgemod_stats } from '@prisma-arg/client';
  import { onMount } from 'svelte';
  import { ID } from '@node-steam/id';

  type Region = 'ar' | 'br';

  interface Row {
    pos: number;
    name: string;
    wins: number;
    steamid: string;
    rating: number | null;
    steamid64: string | null;
  }

  const regions: Region[] = ['ar', 'br'];

  let loading = true;
  let errorMsg = '';
  let rowsByRegion: Record<Region, Row[]> = { ar: [], br: [] };

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

  onMount(async () => {
    try {
      const [ar, br] = await Promise.all([fetchTop('ar'), fetchTop('br')]);
      rowsByRegion.ar = ar;
      rowsByRegion.br = br;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

<Card title="Leaderboard">
  {#if loading}
    <div class="py-4 text-center text-sm text-gray-500">Loading…</div>
  {:else if errorMsg}
    <div class="py-4 text-center text-sm text-rose-500">{errorMsg}</div>
  {:else}
    <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {#each regions as region}
        <div>
          <div class="mb-2 flex items-center gap-2">
            <span class="fi fi-{region}"></span>
            <span class="text-xs uppercase text-gray-500">{region}</span>
          </div>
          <div class="space-y-2">
            {#each rowsByRegion[region] as r}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-6 text-right text-sm tabular-nums text-gray-500">{r.pos}</span>
                  {#if r.steamid64}
                    <a class="font-medium text-emerald-600 hover:underline dark:text-emerald-400" href="/mge/games/{r.steamid64}">{r.name}</a>
                  {:else}
                    <span class="font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                  {/if}
                </div>
                <span class="text-xs text-gray-500">{r.rating ?? '-'}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
    <div class="mt-3">
      <a href="/mge/ranking" class="text-sm text-emerald-500 hover:underline">View all</a>
    </div>
  {/if}
</Card>


 