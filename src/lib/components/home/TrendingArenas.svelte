<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';

  interface ArenaItem {
    name: string;
    matches: number;
    percent: number;
  }

  let currentRegion: Region = $state('ar');
  let days = $state(7);
  let loading = $state(false);
  let errorText = $state<string | null>(null);
  let items = $state<ArenaItem[]>([]);

  async function fetchTrending(db: Region) {
    loading = true;
    errorText = null;
    try {
      const params = new URLSearchParams({ db, days: String(days), take: '5' });
      const res = await fetch(`/api/mge/arenas/trending?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const payload = await res.json();
      items = payload?.items ?? [];
    } catch {
      items = [];
      errorText = 'Failed to load trending arenas';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      fetchTrending(r);
    });
    fetchTrending(currentRegion);
    return () => {
      unreg();
    };
  });

  $effect(() => {
    days;
    fetchTrending(currentRegion);
  });
</script>

<Card title="Trending arenas">
  {#snippet titleSuffix()}
    <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <span class="fi fi-{currentRegion}"></span>
      <span class="uppercase">{currentRegion}</span>
    </span>
  {/snippet}
  <div class="mb-2 flex items-center justify-between">
    <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Window</div>
    <div class="flex items-center gap-1">
      {#each [7, 14, 30, 90] as d}
        <button
          class={`rounded px-2 py-1 text-xs ${days === d ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          onclick={() => {
            days = d;
          }}>
          {d}d
        </button>
      {/each}
    </div>
  </div>
  {#if loading}
    <div class="py-4 text-center text-sm text-gray-500">Loading…</div>
  {:else if errorText}
    <div class="py-4 text-center text-sm text-rose-500">{errorText}</div>
  {:else if items.length === 0}
    <div class="py-4 text-center text-sm text-gray-500">No data</div>
  {:else}
    <div class="space-y-2">
      {#each items as a}
        <div>
          <div class="flex items-center justify-between text-sm">
            <span class="truncate">{a.name}</span>
            <span class="text-gray-500">{a.matches.toLocaleString()}</span>
          </div>
          <div class="mt-1 h-2 rounded bg-gray-200 dark:bg-gray-700">
            <div class="h-2 rounded bg-emerald-500" style={`width: ${Math.max(0, Math.min(100, Math.round(a.percent)))}%`}></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Card>
