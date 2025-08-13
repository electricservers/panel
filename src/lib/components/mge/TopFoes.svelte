<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import { Avatar } from 'flowbite-svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';
  import { ID } from '@node-steam/id';

  interface FoeItem {
    steamid: string;
    wins: number;
    losses: number;
    matches: number;
    name?: string;
    avatar?: string;
    id64?: string;
  }

  interface Props {
    steamid?: string | null;
    take?: number;
    days?: number | null;
  }

  let { steamid = null, take = 5, days = null }: Props = $props();

  let currentRegion: Region = $state('ar');
  let loading = $state(false);
  let items = $state<FoeItem[]>([]);
  let errorText = $state<string | null>(null);

  function computeWinrate(wins: number, matches: number): number {
    if (!matches) return 0;
    const pct = (wins / matches) * 100;
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  async function fetchTopFoes(db: Region) {
    loading = true;
    errorText = null;
    try {
      const params = new URLSearchParams({ db, take: String(take) });
      if (steamid) params.set('steamid', steamid);
      if (days && Number.isFinite(days as number) && (days as number) > 0) params.set('days', String(days));
      const resp = await fetch(`/api/mge/foes/top?${params.toString()}`);
      if (!resp.ok) throw new Error(`Request failed with ${resp.status}`);
      const payload = await resp.json();
      const base: FoeItem[] = Array.isArray(payload) ? payload : (payload.items ?? []);
      items = base;
      await enrichProfiles();
    } catch (e) {
      items = [];
      errorText = 'Failed to load foes';
    } finally {
      loading = false;
    }
  }

  async function enrichProfiles() {
    const updated: FoeItem[] = await Promise.all(
      items.map(async (it) => {
        let id64: string | null = null;
        try { id64 = new ID(it.steamid).get64(); } catch {}
        let name: string | undefined = undefined;
        let avatar: string | undefined = undefined;
        if (id64) {
          try {
            const r = await fetch(`/api/steam/profile?steamid=${encodeURIComponent(id64)}`);
            if (r.ok) {
              const p = await r.json();
              name = p?.personaname || undefined;
              avatar = p?.avatarfull || p?.avatarmedium || p?.avatar || undefined;
            }
          } catch {}
        }
        return { ...it, name, avatar, id64: id64 || undefined };
      })
    );
    items = updated;
  }

  $effect(() => {
    const unsub = regionStore.subscribe((r) => {
      currentRegion = r;
    });
    return () => unsub();
  });

  $effect(() => {
    steamid; take; days; currentRegion;
    if (!steamid || String(steamid).trim() === '') {
      items = [];
      errorText = null;
      return;
    }
    fetchTopFoes(currentRegion);
  });
</script>

<Card title="Top foes" subtitle={days ? `Last ${days} days` : 'All time'}>
  <div class="mb-2 flex items-center justify-between">
    <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Window</div>
    <div class="flex items-center gap-1">
      {#each [7, 15, 30, 60, 90] as d}
        <button
          class={`rounded px-2 py-1 text-xs ${days === d ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          onclick={() => { days = d; }}>
          {d}d
        </button>
      {/each}
      <button
        class={`rounded px-2 py-1 text-xs ${!days ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
        onclick={() => { days = null; }}>
        All
      </button>
    </div>
  </div>
  {#if errorText}
    <div class="text-sm text-rose-500">{errorText}</div>
  {/if}
  <div class="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
    {#if loading}
      <div class="py-4 text-center text-sm text-gray-500">Loading…</div>
    {:else if !items || items.length === 0}
      <div class="py-4 text-center text-sm text-gray-500">No data</div>
    {:else}
      {#each items as f}
        <div class="flex items-center gap-3 py-2">
          <Avatar size="sm" rounded src={f.avatar || '/images/favicon.png'} />
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <div class="min-w-0 flex items-center gap-2">
                <a class="truncate font-medium text-gray-900 hover:underline dark:text-gray-100" href={f.id64 ? `/mge/players/${f.id64}` : undefined}>
                  {f.name || f.steamid}
                </a>
                <span class="shrink-0 text-xs text-gray-500">{f.matches} matches</span>
              </div>
              <span class="text-xs text-gray-500">{f.wins}-{f.losses}</span>
            </div>
            <div class="mt-1 h-2 rounded bg-rose-500 dark:bg-rose-500">
              <div class="h-2 rounded bg-emerald-500" style={`width: ${computeWinrate(f.wins, f.matches)}%`}></div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</Card>


