<script lang="ts">
  import { ID } from '@node-steam/id';
  import type { mgemod_stats } from '@prisma-arg/client';
  import { A, P } from 'flowbite-svelte';
  import DataTable, { type Column, type SortDirection } from '$lib/components/DataTable.svelte';
  import Title from '$lib/components/Title.svelte';
  import { regionStore, type Region } from '$lib/stores/regionStore';

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
  }
  let ranking = $state<RankRow[]>([]);
  const pageSize = 25;
  let currentPage = $state(1);
  let totalItems = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  const goToPage = async (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    currentPage = clamped;
    const start = (clamped - 1) * pageSize;
    ranking = await fetchRankingData(currentRegion, start, pageSize);
  };

  type SortKey = 'name' | 'rating' | 'wins' | 'losses' | 'totalGames' | 'wlValue' | 'winrateValue';
  let sortKey: SortKey = $state('rating');
  let sortDir: 'asc' | 'desc' = $state('desc');

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
    const params = new URLSearchParams({ db, skip: String(skip), take: String(take) });
    // Map client sort keys to API-supported keys
    if (sortKey === 'name' || sortKey === 'wins' || sortKey === 'losses' || sortKey === 'rating') {
      params.set('sortKey', sortKey);
      params.set('sortDir', sortDir);
    } else {
      // For derived fields, fallback to rating server-sort and keep client indicators only
      params.set('sortKey', 'rating');
      params.set('sortDir', 'desc');
    }
    if (withTotal) params.set('withTotal', '1');
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

    return ranking;
  };

  const resetAndLoad = async (db: Region) => {
    loading = true;
    ranking = [];
    currentPage = 1;
    const first = await fetchRankingData(db, 0, pageSize, true);
    ranking = first;
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

  // Columns for the reusable DataTable
  const columns: Column[] = [
    { id: 'position', title: 'Position', sortable: true, sortKey: 'rating', defaultSortDir: 'desc', widthClass: 'w-[100px]' },
    { id: 'name', title: 'Name', accessor: 'name', sortable: true, defaultSortDir: 'asc' },
    { id: 'rating', title: 'Rating', accessor: 'rating', sortable: true, defaultSortDir: 'desc', widthClass: 'w-[120px] text-right', headerClass: 'text-right', cellClass: 'text-right' },
    { id: 'wins', title: 'Wins', accessor: 'wins', sortable: true, defaultSortDir: 'desc', widthClass: 'w-[100px] text-right', headerClass: 'text-right', cellClass: 'text-right' },
    { id: 'losses', title: 'Losses', accessor: 'losses', sortable: true, defaultSortDir: 'desc', widthClass: 'w-[100px] text-right', headerClass: 'text-right', cellClass: 'text-right' },
    { id: 'totalGames', title: 'Total Games', accessor: 'totalGames', sortable: true, defaultSortDir: 'desc', widthClass: 'w-[130px] text-right', headerClass: 'text-right', cellClass: 'text-right' },
    { id: 'wl', title: 'W/L Ratio', accessor: (row) => row.wl, sortable: true, sortKey: 'wlValue', defaultSortDir: 'desc', widthClass: 'w-[120px] text-right', headerClass: 'text-right', cellClass: 'text-right' },
    { id: 'winrate', title: 'Winrate', accessor: (row) => row.winrate, sortable: true, sortKey: 'winrateValue', defaultSortDir: 'desc', widthClass: 'w-[120px] text-right', headerClass: 'text-right', cellClass: 'text-right' }
  ];
</script>

<div class="h-[90vh] p-4">
  <Title>MGE Stats</Title>
  <!-- Region is selected in the navbar -->
  {#if loading}
    <P>Loading ranking...</P>
  {:else}
    <DataTable
      columns={columns}
      rows={ranking}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={(p) => goToPage(p)}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(key, dir) => setSort(key as SortKey, dir)}
      emptyText="No players found."
    >
      <svelte:fragment slot="cell" let:row let:index let:col let:value>
        {#if col.id === 'position'}
          #{(currentPage - 1) * pageSize + index + 1}
        {:else if col.id === 'name'}
          {@const steamid = new ID(row.steamid).get64()}
          <A target="_blank" href={`https://steamcommunity.com/profiles/${steamid}`}>
            {row.name}
          </A>
        {:else if col.id === 'winrate'}
          {row.winrate}%
        {:else}
          {value}
        {/if}
      </svelte:fragment>
    </DataTable>
  {/if}
</div>
