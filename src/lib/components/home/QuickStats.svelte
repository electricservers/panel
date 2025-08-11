<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';

  interface Stats {
    totalDuels: number; // unused in UI
    duelsWindow: number;
    activePlayers: number;
    arenasPlayed: number;
    days: number;
  }

  let currentRegion: Region = $state('ar');
  let loading = $state(false);
  let errorText = $state<string | null>(null);
  let stats = $state<Stats | null>(null);
  let days = $state(1);

  async function fetchStats(db: Region) {
    loading = true;
    errorText = null;
    try {
      const params = new URLSearchParams({ db, days: String(days) });
      const res = await fetch(`/api/mge/stats/quick?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      stats = await res.json();
    } catch {
      errorText = 'Failed to load quick stats';
      stats = null;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      fetchStats(r);
    });
    fetchStats(currentRegion);
    return () => {
      unreg();
    };
  });

  $effect(() => {
    days;
    fetchStats(currentRegion);
  });
</script>

<Card title="Quick stats" subtitle={`Last ${days}d in ${currentRegion.toUpperCase()}`}>
  <div class="mb-2 flex items-center justify-between">
    <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Window</div>
    <div class="flex items-center gap-1">
      {#each [1, 7, 30, 90] as d}
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
  {:else if !stats}
    <div class="py-4 text-center text-sm text-gray-500">No data</div>
  {:else}
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Duels ({days}d)</div>
        <div class="text-2xl font-semibold">{stats.duelsWindow.toLocaleString()}</div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Active players</div>
        <div class="text-2xl font-semibold">{stats.activePlayers.toLocaleString()}</div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Arenas played</div>
        <div class="text-2xl font-semibold">{stats.arenasPlayed.toLocaleString()}</div>
      </div>
    </div>
  {/if}
</Card>
