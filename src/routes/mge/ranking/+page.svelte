<script lang="ts">
  import { ID } from '@node-steam/id';
  import type { mgemod_stats } from '@prisma-arg/client';
  import { Button } from 'flowbite-svelte';
  import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
  // Removed table view
  type SortDirection = 'asc' | 'desc';
  import Title from '$lib/components/Title.svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';
  import LeaderboardCard from '$lib/components/mge/LeaderboardCard.svelte';

  let currentRegion: Region = $state('ar');
  let loading = $state(false);
  interface RankRow {
    rating: number | null;
    steamid: string;
    name: string | null;
    wins: number | null;
    losses: number | null;
    lastplayed: string | null;
    hitblip: string | null;
    totalGames: number;
    wl: string;
    winrate: string;
    wlValue: number;
    winrateValue: number;
    position?: number | null;
  }
  let ranking = $state<RankRow[]>([]);
  let avatarMap = $state<Record<string, string>>({}); // 64-bit id -> avatarfull
  let search = $state(''); // supports name or SteamID64/Steam2
  let pendingSearch = $state(''); // debounce buffer; only applied on explicit search
  const pageSize = 25;
  let currentPage = $state(1);
  let totalItems = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  const goToPage = async (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    currentPage = clamped;
    const start = (clamped - 1) * pageSize;
    ranking = await fetchRankingData(currentRegion, start, pageSize);
    await fetchAvatarsForCurrentPage();
  };

  type SortKey = 'name' | 'rating' | 'wins' | 'losses' | 'totalGames' | 'wlValue' | 'winrateValue';
  let sortKey: SortKey = $state('rating');
  let sortDir: 'asc' | 'desc' = $state('desc');
  const sortKeyLabels: Record<SortKey, string> = {
    name: 'Name',
    rating: 'Rating',
    wins: 'Wins',
    losses: 'Losses',
    totalGames: 'Total games',
    wlValue: 'W/L',
    winrateValue: 'Win%'
  };
  // Sorting is delegated to the API for both base and derived keys
  const isClientSort = $derived(false);

  const setSort = (key: SortKey, dir?: SortDirection) => {
    if (dir) {
      sortKey = key;
      sortDir = dir;
    } else if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'name' ? 'asc' : 'desc';
    }
    resetAndLoad(currentRegion);
  };

  const fetchRankingData = async (db: Region = 'ar', skip = 0, take = pageSize, withTotal = false) => {
    const effectiveSkip = isClientSort ? 0 : skip;
    const effectiveTake = isClientSort ? Math.max(pageSize * totalPages, 1000) : take; // overfetch for client sort
    const params = new URLSearchParams({ db, skip: String(effectiveSkip), take: String(effectiveTake) });
    if (search.trim()) params.set('q', search.trim());
    // Always pass sort to API (supports rating, wins, losses, name, totalGames, wlValue, winrateValue)
    params.set('sortKey', sortKey);
    params.set('sortDir', sortDir);
    if (withTotal) params.set('withTotal', '1');
    params.set('withPositions', '1');
    const rankResponse = await fetch(`/api/mge/rank?${params.toString()}`);
    const payload = await rankResponse.json();
    const rank: mgemod_stats[] = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);

    let ranking = rank.map((user) => {
      const totalGames = user.wins! + user.losses!;
      const wlValue = user.losses !== 0 ? user.wins! / user.losses! : (user.wins! > 0 ? Number.POSITIVE_INFINITY : 0);
      const wl = user.losses !== 0 ? wlValue.toFixed(1) : 'N/A';
      const winrateValue = totalGames !== 0 ? (user.wins! / totalGames) * 100 : 0;
      const winrate = winrateValue.toFixed(1);

      return {
        ...user,
        totalGames,
        wl,
        winrate,
        wlValue,
        winrateValue
      };
    });

    // client-side sort for derived keys
    if (isClientSort) {
      const key = sortKey;
      const dir = sortDir;
      ranking.sort((a: any, b: any) => {
        const av = a[key];
        const bv = b[key];
        const aNum = typeof av === 'number' ? av : Number(av ?? 0);
        const bNum = typeof bv === 'number' ? bv : Number(bv ?? 0);
        const cmp = aNum === bNum ? 0 : (aNum < bNum ? -1 : 1);
        return dir === 'asc' ? cmp : -cmp;
      });
      // slice for current page
      ranking = ranking.slice(0); // keep full in state, we will page in cardItems instead
    }
    return ranking;
  };

  const resetAndLoad = async (db: Region) => {
    loading = true;
    ranking = [];
    currentPage = 1;
    const first = await fetchRankingData(db, 0, pageSize, true);
    if (isClientSort) {
      // fetch all to sort client-side based on totalItems
      const all = await fetchRankingData(db, 0, totalItems || pageSize * 10, false);
      ranking = all;
    } else {
      ranking = first;
    }
    await fetchAvatarsForCurrentPage();
    loading = false;
  };

  // Region is controlled globally

  $effect(() => {
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      resetAndLoad(r);
    });
    // initial
    resetAndLoad(currentRegion);
    return () => unreg();
  });
  async function fetchAvatarsForCurrentPage() {
    try {
      // Convert current page steam2 IDs to 64-bit
      const ids64: string[] = [];
      for (const r of ranking) {
        try { ids64.push(new ID(r.steamid).get64()); } catch {}
      }
      const unique = Array.from(new Set(ids64));
      if (unique.length === 0) return;
      const qs = new URLSearchParams({ steamids: unique.join(',') });
      const res = await fetch(`/api/steam/profile?${qs.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const nextMap: Record<string, string> = { ...avatarMap };
      for (const [sid, info] of Object.entries<any>(data)) {
        if (info?.avatarfull) nextMap[sid] = info.avatarfull as string;
      }
      avatarMap = nextMap;
    } catch {}
  }


  // UI state
  const cardItems: RankRow[] = $derived(ranking);
  const rankBase = $derived((currentPage - 1) * pageSize);

  // Deep link/highlight support: highlight a specific steam64 from query param ?id=...
  // Deep link highlight support is temporarily disabled; keep scaffold for future
  // let highlightId64 = $state<string | null>(null);
  // $effect.root(() => {
  //   try {
  //     const url = new URL(window.location.href);
  //     const id = url.searchParams.get('id');
  //     highlightId64 = id && /^\d{17}$/.test(id) ? id : null;
  //   } catch {}
  // });
</script>

<div class="p-4">
  <div class="flex items-end justify-between gap-2">
    <div>
      <Title>MGE Leaderboard</Title>
      <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Region is selected in the navbar.</div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <!-- Sort controls for card view -->
      <select class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={sortKey}
              onchange={(e) => setSort((e.target as HTMLSelectElement).value as SortKey, sortDir)}>
        <option value="rating">Rating</option>
        <option value="wins">Wins</option>
        <option value="losses">Losses</option>
        <option value="totalGames">Games</option>
        <option value="wlValue">W/L</option>
        <option value="winrateValue">Win%</option>
        <option value="name">Name</option>
      </select>
      <button class="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              onclick={() => setSort(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}>
        {sortDir === 'asc' ? 'Asc' : 'Desc'}
      </button>
      <input class="w-64 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
             placeholder="Search name or SteamID"
             value={pendingSearch}
             oninput={(e) => pendingSearch = (e.target as HTMLInputElement).value}
             onkeydown={(e) => { if (e.key === 'Enter') { search = pendingSearch; resetAndLoad(currentRegion); } }} />
      <Button color="light" on:click={() => { search = pendingSearch; resetAndLoad(currentRegion); }}>Search</Button>
    </div>
  </div>

  {#if loading}
    <div class="mt-4 text-sm text-gray-500">Loading ranking…</div>
  {:else if ranking.length === 0}
    <div class="mt-4 text-sm text-gray-500">No players found.</div>
  {:else}
      <!-- Top pagination (card view) -->
      {#if totalPages > 1}
        <div class="mb-2 mt-3 flex justify-center">
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" title="Previous">
              <ChevronLeftOutline class="h-4 w-4" />
            </button>
            <span>{currentPage}/{Math.max(1, totalPages)}</span>
            <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page" title="Next">
              <ChevronRightOutline class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/if}

      <!-- Sorting hint above list -->
      <div class="-mt-1 mb-1 text-center text-xs text-gray-500 dark:text-gray-400">
        Sorting by <span class="font-semibold">{sortKeyLabels[sortKey]}</span>
        <span class="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[10px] uppercase tracking-wide ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">{sortDir}</span>
      </div>

      <!-- Cards (vertical, centered) -->
      <div class="mt-4 flex justify-center">
        <div class="w-full max-w-3xl space-y-3">
          {#each cardItems as r, idx}
            <LeaderboardCard player={{
              rank: r.position ?? (rankBase + idx + 1),
              steamid: r.steamid,
              name: r.name,
              rating: r.rating,
              wins: r.wins,
              losses: r.losses,
              totalGames: r.totalGames,
              wl: r.wl,
              winrate: r.winrate,
              avatarUrl: (() => { try { return avatarMap[new ID(r.steamid).get64()] ?? null; } catch { return null; } })()
            }} />
          {/each}
        </div>
      </div>
      <!-- Bottom pagination (card view) -->
      {#if totalPages > 1}
        <div class="mt-2 flex justify-center">
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" title="Previous">
              <ChevronLeftOutline class="h-4 w-4" />
            </button>
            <span>{currentPage}/{Math.max(1, totalPages)}</span>
            <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page" title="Next">
              <ChevronRightOutline class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/if}
  {/if}
</div>
