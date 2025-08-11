<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';

  export interface ArenaStat { name: string; matches: number; wins: number; losses: number; winrate: number }

  interface Props {
    steamid?: string | null;
    take?: number;
    days?: number | null;
  }

  let { steamid = null, take = 5, days = 30 }: Props = $props();

  let currentRegion: Region = $state('ar');
  let loading = $state(false);
  let items = $state<ArenaStat[]>([]);
  const sortedItems = $derived([
    ...items
  ].sort((a, b) => (Number(b.matches || 0) - Number(a.matches || 0)) || a.name.localeCompare(b.name)) as ArenaStat[]);
  let errorText = $state<string | null>(null);

  // Removed unused derived values to reduce lints
  const totalMatchesSum = $derived(items.reduce((sum, a) => sum + (Number(a.matches) || 0), 0));

  function computeMatchPercent(matches: number | string | null | undefined): number {
    const total = Number(totalMatchesSum) || 0;
    const m = Number(matches) || 0;
    if (total <= 0) return 0;
    const pct = (m / total) * 100;
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  async function fetchMostPlayed(db: Region) {
    loading = true;
    errorText = null;
    try {
      const params = new URLSearchParams({ db, take: String(take) });
      if (days && Number.isFinite(days) && days > 0) params.set('days', String(days));
      if (steamid) params.set('steamid', steamid);
      const resp = await fetch(`/api/mge/arenas/most-played?${params.toString()}`);
      if (!resp.ok) throw new Error(`Request failed with ${resp.status}`);
      const payload = await resp.json();
      items = Array.isArray(payload) ? payload : (payload.items ?? []);
    } catch (e) {
      items = [];
      errorText = 'Failed to load arenas';
    } finally {
      loading = false;
    }
  }

  // Track region changes without triggering fetch by itself
  $effect(() => {
    const unsub = regionStore.subscribe((r) => {
      currentRegion = r;
    });
    // no immediate fetch here
    return () => { unsub(); };
  });

  // React when inputs change (steamid/days/take/region)
  $effect(() => {
    steamid; days; take; currentRegion;
    if (!steamid || String(steamid).trim() === '') {
      // do not fetch until a valid steamid is available; also clear any previous error
      items = [];
      errorText = null;
      return;
    }
    fetchMostPlayed(currentRegion);
  });
</script>

<Card title="Most played arenas" subtitle={days ? `Last ${days} days` : 'All time'}>
  {#if errorText}
    <div class="text-sm text-rose-500">{errorText}</div>
  {/if}
  <div class="mb-2 flex items-center justify-between">
    <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Window</div>
    <div class="flex items-center gap-1">
      {#each [15,30,60,90] as d}
        <button class={`rounded px-2 py-1 text-xs ${days === d ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                onclick={() => { days = d; }}>
          {d}d
        </button>
      {/each}
    </div>
  </div>
  <div class="mt-2 space-y-3">
    {#if loading}
      <div class="py-4 text-center text-sm text-gray-500">Loading…</div>
    {:else if items.length === 0}
      <div class="py-4 text-center text-sm text-gray-500">No data</div>
    {:else}
      {#each sortedItems as a, idx}
        <div class="flex items-start gap-3">
          <div class="w-6 text-right text-sm tabular-nums text-gray-500">{idx + 1}.</div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <span class="truncate font-medium text-gray-900 dark:text-gray-100">{a.name}</span>
              <span class="text-xs text-gray-500">{Number(a.matches) || 0} matches</span>
            </div>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-700">
                <div class="h-2 rounded bg-emerald-500" style={`width: ${computeMatchPercent(Number(a.matches) || 0)}%`}></div>
              </div>
              <span class="w-12 shrink-0 text-right text-xs text-gray-500">{computeMatchPercent(Number(a.matches) || 0)}%</span>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</Card>


