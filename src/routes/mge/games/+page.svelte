<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import MatchList from '$lib/components/mge/MatchList.svelte';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { regionStore, type Region } from '$lib/stores/regionStore';
  import { onMount } from 'svelte';
  import { ID } from '@node-steam/id';
  
  let currentRegion: Region = $state('ar');
  // remove unused loading flag
  let games = $state<MgeDuel[]>([]);
  let totalItems = $state(0);
  let pageSize = $state(25);
  let currentPage = $state(1);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  // Filters
  let search = $state(''); // name or steamid
  let arena = $state('');
  let arenas = $state<string[]>([]);
  // variants unused in UI; keep arenas only
  let outcome: 'all' | 'win' | 'loss' = $state('all');
  let dateFrom = $state<string>(''); // yyyy-mm-dd
  let dateTo = $state<string>('');

  // Outcome applies relative to searched subject if an id or name is provided
  async function applyFilters() {
    currentPage = 1;
    await fetchGames(currentRegion, 1, true);
  }

  function toSteam2IfIdLike(value: string): string | undefined {
    const v = value.trim();
    if (!v) return undefined;
    const looksLike64 = /^\d{17}$/.test(v);
    const looksLike2 = /^STEAM_\d+:\d+:\d+$/.test(v);
    if (!looksLike64 && !looksLike2) return undefined;
    try {
      return new ID(v).getSteamID2();
    } catch {
      return undefined;
    }
  }

  function toUnixStart(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    const d = new Date(dateStr + 'T00:00:00Z');
    return String(Math.floor(d.getTime() / 1000));
  }
  function toUnixEnd(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    const d = new Date(dateStr + 'T23:59:59Z');
    return String(Math.floor(d.getTime() / 1000));
  }

  async function fetchArenas(db: Region) {
    try {
      const res = await fetch(`/api/mge/games/arenas?db=${db}`);
    if (res.ok) {
        const payload = await res.json();
        arenas = Array.isArray(payload) ? payload : (payload.items ?? []);
      }
    } catch {}
  }

  async function fetchGames(db: Region, page = 1, withTotal = false) {
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({ db: String(db), skip: String(skip), take: String(pageSize) });
    const asSteam2 = toSteam2IfIdLike(search);
    if (asSteam2) {
      params.set('steamid', asSteam2);
    } else if (search.trim()) {
      params.set('q', search.trim());
    }
    if (arena) {
      // Use canonical arena filter expansion on the server
      params.set('arena', arena);
      params.set('arenaCanonical', '1');
    }
    const from = toUnixStart(dateFrom);
    const to = toUnixEnd(dateTo);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (outcome !== 'all') params.set('outcome', outcome);
    if (withTotal) params.set('withTotal', '1');
    const res = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await res.json();
    games = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);
  }

  async function resetAndLoad(db: Region) {
    currentPage = 1;
    await Promise.all([fetchArenas(db), fetchGames(db, 1, true)]);
  }

  onMount(() => {
    const unreg = regionStore.subscribe((r) => {
      if (currentRegion !== r) {
        currentRegion = r;
        resetAndLoad(r);
      }
    });
    // initial load
    resetAndLoad(currentRegion);
    return () => { unreg(); };
  });

  // No auto-fetch on filter or page size changes; use Search button or pagination
</script>

<div class="p-4">
  <Title>Latest games</Title>

  <!-- Filters (organized card) -->
  <div class="mt-3 flex justify-center">
    <div class="w-full max-w-3xl">
       <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="md:col-span-3">
            <input class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                   placeholder="Search name or SteamID"
                   value={search}
                   oninput={(e) => search = (e.target as HTMLInputElement).value}
                   onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter') { applyFilters(); } }} />
          </div>

          <div>
            <label for="arenaSelect" class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Arena</label>
            <select id="arenaSelect" class="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    value={arena}
                    onchange={(e) => arena = (e.target as HTMLSelectElement).value}>
              <option value="">All arenas</option>
              {#each arenas as a}
                <option value={a}>{a}</option>
              {/each}
            </select>
          </div>
          <div class="md:col-span-2">
            <span class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Outcome</span>
            <div class="flex items-center gap-2 text-sm">
              <button class={`rounded-md px-2 py-1 ${outcome === 'all' ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                      onclick={() => outcome = 'all'}>All</button>
              <button class={`rounded-md px-2 py-1 ${outcome === 'win' ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                      onclick={() => outcome = 'win'}>Wins</button>
              <button class={`rounded-md px-2 py-1 ${outcome === 'loss' ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                      onclick={() => outcome = 'loss'}>Losses</button>
            </div>
          </div>

          <div class="md:col-span-3">
            <span class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Date range</span>
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-gray-500 dark:text-gray-400" for="fromDate">From</label>
              <input id="fromDate" type="date" class="rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                     value={dateFrom}
                     onchange={(e) => dateFrom = (e.target as HTMLInputElement).value} />
              <label class="text-gray-500 dark:text-gray-400" for="toDate">To</label>
              <input id="toDate" type="date" class="rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                     value={dateTo}
                     onchange={(e) => dateTo = (e.target as HTMLInputElement).value} />
            </div>
          </div>

          <div class="md:col-span-3 flex items-center justify-end gap-2">
            <button class="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 md:w-auto"
                    onclick={() => applyFilters()}>Search</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Matches list (centered, constrained width) -->
  <div class="mt-4 flex justify-center">
    <div class="w-full max-w-3xl">
      <MatchList items={games}
                 currentPage={currentPage}
                 totalPages={totalPages}
                 pageSize={pageSize}
                 pageSizeOptions={[10,25,50]}
                 onPageSizeChange={(n: number) => { pageSize = n; }}
                 onPageChange={async (p: number) => { currentPage = p; await fetchGames(currentRegion, currentPage, false); }}
                 emptyText="No matches found." />
    </div>
  </div>
</div>
