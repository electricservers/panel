<script lang="ts">
  import type { PageData } from './$types';
  import Title from '$lib/components/Title.svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';
  import MatchList from '$lib/components/mge/MatchList.svelte';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { ID } from '@node-steam/id';

  interface Props { data: PageData }
  let { data }: Props = $props();
  let currentRegion: Region = $state('ar');

  let games = $state<MgeDuel[]>([]);
  let totalItems = $state(0);
  let pageSize = $state(25);
  let currentPage = $state(1);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  let a2 = $state('');
  let b2 = $state('');

  function to64(id?: string | null): string | null {
    try { return id ? new ID(id).get64() : null; } catch { return null; }
  }

  function formatDate(unixEpoch: string | null): string {
    const n = Number(unixEpoch) * 1000;
    if (!Number.isFinite(n)) return '';
    return new Date(n).toLocaleString();
  }

  async function fetchGames(db: Region, page = 1, withTotal = false) {
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({ db: String(db), skip: String(skip), take: String(pageSize) });
    params.set('a', a2);
    params.set('b', b2);
    params.set('versus', '1');
    if (withTotal) params.set('withTotal', '1');
    const res = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await res.json();
    games = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);
  }

  async function resetAndLoad(db: Region) {
    currentPage = 1;
    await fetchGames(db, 1, true);
  }

  $effect(() => {
    a2 = new ID(data.a).getSteamID2();
    b2 = new ID(data.b).getSteamID2();
  });

  $effect(() => {
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      resetAndLoad(r);
    });
    resetAndLoad(currentRegion);
    return () => unreg();
  });
</script>

<div class="p-4">
  <Title>Versus</Title>
  <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Comparing <a class="underline" href={`/mge/players/${to64(a2)}`}>{to64(a2)}</a> vs <a class="underline" href={`/mge/players/${to64(b2)}`}>{to64(b2)}</a></div>

  <div class="mt-4">
    <MatchList
      items={games}
      {currentPage}
      {totalPages}
      {pageSize}
      onPageChange={async (p: number) => { currentPage = p; await fetchGames(currentRegion, currentPage, false); }}
      to64={to64}
      formatDate={formatDate}
      emptyText="No head-to-head matches found." />
  </div>
</div>


