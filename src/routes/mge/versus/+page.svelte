<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import { Button } from 'flowbite-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import VersusSummary from '$lib/components/mge/VersusSummary.svelte';
  import MatchList from '$lib/components/mge/MatchList.svelte';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { regionStore, type Region } from '$lib/stores/regionStore';
  import { ID } from '@node-steam/id';

  let inputA = $state('');
  let inputB = $state('');
  let urlA = $state<string | null>(null);
  let urlB = $state<string | null>(null);
  let a2: string | null = $state(null);
  let b2: string | null = $state(null);
  let currentRegion: Region = $state('ar');
  let loading = $state(false);
  let existsA = $state(false);
  let existsB = $state(false);
  let games: MgeDuel[] = $state([]);
  let totalItems = $state(0);
  let pageSize = $state(25);
  let currentPage = $state(1);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  function extractId64(value: string): string | null {
    const v = value.trim();
    if (!v) return null;
    const idMatch = v.match(/\b(7656\d{13})\b/);
    if (idMatch) return idMatch[1];
    try {
      const url = new URL(v.startsWith('http') ? v : `https://${v}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'profiles' && parts[1] && /^7656\d{13}$/.test(parts[1])) return parts[1];
    } catch {}
    return null;
  }

  function canonicalPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  async function go() {
    const a = extractId64(inputA);
    const b = extractId64(inputB);
    if (!a || !b) return;
    const [x, y] = canonicalPair(a, b);
    await goto(`/mge/versus?a=${encodeURIComponent(x)}&b=${encodeURIComponent(y)}`);
  }

  function toSteam2(id64: string | null): string | null {
    if (!id64) return null;
    try { return new ID(id64).getSteamID2(); } catch { return null; }
  }

  async function checkExists(id64: string | null): Promise<boolean> {
    const id2 = toSteam2(id64);
    if (!id2) return false;
    try {
      const [ar, br] = await Promise.all([
        fetch(`/api/mge/rank?db=ar&steamid=${encodeURIComponent(id2)}&take=1`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/mge/rank?db=br&steamid=${encodeURIComponent(id2)}&take=1`).then((r) => r.ok ? r.json() : [])
      ]);
      const arHas = Array.isArray(ar) ? ar.length > 0 : (Array.isArray(ar?.items) && ar.items.length > 0);
      const brHas = Array.isArray(br) ? br.length > 0 : (Array.isArray(br?.items) && br.items.length > 0);
      return arHas || brHas;
    } catch { return false; }
  }

  async function fetchVersus(db: Region, page = 1, withTotal = false) {
    if (!a2 || !b2 || !urlA || !urlB) { games = []; if (withTotal) totalItems = 0; return; }
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({ db: db as string, versus: '1', a: String(urlA), b: String(urlB), skip: String(skip), take: String(pageSize) });
    if (withTotal) params.set('withTotal', '1');
    const res = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await res.json();
    games = Array.isArray(payload) ? payload : payload.items;
    if (!Array.isArray(payload)) totalItems = payload.total ?? 0;
  }

  $effect(() => {
    const unreg = regionStore.subscribe((r) => { currentRegion = r; });
    return () => unreg();
  });

  // Only fetch when query params are present or region changes; no API calls on keystrokes
  $effect(() => {
    const url = $page.url;
    currentRegion;
    const qa = url.searchParams.get('a');
    const qb = url.searchParams.get('b');
    if (!qa || !qb) { urlA = null; urlB = null; games = []; totalItems = 0; existsA = false; existsB = false; return; }
    // Sync inputs to URL for visual consistency, but drive data/UI from urlA/urlB only
    inputA = qa;
    inputB = qb;
    urlA = qa;
    urlB = qb;
    a2 = toSteam2(qa);
    b2 = toSteam2(qb);
    (async () => {
      loading = true;
      try {
        const [ea, eb] = await Promise.all([checkExists(urlA), checkExists(urlB)]);
        existsA = ea; existsB = eb;
        currentPage = 1;
        await fetchVersus(currentRegion, 1, true);
      } finally { loading = false; }
    })();
  });
</script>

<div class="p-4">
  <Title>Versus</Title>
  <div class="mt-4 flex justify-center">
    <div class="w-full max-w-2xl">
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
          <input
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            placeholder="Player A: Steam profile URL or 17-digit SteamID64"
            bind:value={inputA}
            onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter') go(); }} />
          <div class="hidden items-center justify-center text-sm text-gray-500 md:flex">vs</div>
          <input
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            placeholder="Player B: Steam profile URL or 17-digit SteamID64"
            bind:value={inputB}
            onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter') go(); }} />
          <Button class="w-full md:w-auto" color="light" on:click={go}>Compare</Button>
        </div>
        {#if urlA && urlB}
          <div class="mt-3 text-sm">
            {#if !existsA || !existsB}
              <div class="rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950 dark:text-rose-100">
                {#if !existsA && !existsB}
                  Neither player exists in the database.
                {:else if !existsA}
                  Player A does not exist in the database.
                {:else}
                  Player B does not exist in the database.
                {/if}
              </div>
            {:else if !loading && totalItems === 0}
              <div class="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-100">
                These players exist but have not played each other.
              </div>
            {/if}
          </div>
        {/if}
      </div>
      {#if urlA && urlB && existsA && existsB && totalItems > 0}
        <div class="mt-4">
          <VersusSummary a64={urlA!} b64={urlB!} a2={a2!} {games} />
        </div>
        <div class="mt-4">
          <MatchList
            items={games}
            {currentPage}
            {totalPages}
            {pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageSizeChange={async (n: number) => {
              pageSize = n;
              currentPage = 1;
              await fetchVersus(currentRegion, 1, true);
            }}
            onPageChange={async (p: number) => {
              currentPage = p;
              await fetchVersus(currentRegion, currentPage, false);
            }}
            emptyText="No matches found." />
        </div>
      {/if}
    </div>
  </div>
</div>
