<script lang="ts">
  import { ID } from '@node-steam/id';
  import type { mgemod_stats } from '@prisma-arg/client';
  import { A, P, Button, Dropdown, DropdownItem, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { ChevronDownOutline } from 'flowbite-svelte-icons';
  import Title from '$lib/components/Title.svelte';

  let dropOpen: boolean = $state(false);
  let server = $state({
    name: 'Argentina',
    flag: 'ar'
  });
  let loading = $state(false);
  let ranking = $state([]);
  const pageSize = 25;
  let currentPage = $state(1);
  let totalItems = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  const goToPage = async (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    currentPage = clamped;
    const start = (clamped - 1) * pageSize;
    ranking = await fetchRankingData(server.flag, start, pageSize);
  };

  type SortKey = 'name' | 'rating' | 'wins' | 'losses' | 'totalGames' | 'wlValue' | 'winrateValue';
  let sortKey: SortKey = $state('rating');
  let sortDir: 'asc' | 'desc' = $state('desc');

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      // Default directions: name asc, numbers desc
      sortDir = key === 'name' ? 'asc' : 'desc';
    }
    // Reload from server with new sort across all pages
    resetAndLoad(server.flag);
  };

  const fetchRankingData = async (db: string = 'ar', skip = 0, take = pageSize, withTotal = false) => {
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

  const resetAndLoad = async (db: string) => {
    loading = true;
    ranking = [];
    currentPage = 1;
    const first = await fetchRankingData(db, 0, pageSize, true);
    ranking = first;
    loading = false;
  };

  const dropClicked = async (arg: string) => {
    dropOpen = false;
    loading = true;
    if (arg === 'ar') {
      server.name = 'Argentina';
    } else {
      server.name = 'Brasil';
    }
    server.flag = arg;
    await resetAndLoad(arg);
    loading = false;
  };

  $effect(() => {
    const fetchData = async () => {
      await resetAndLoad('ar');
    };

    fetchData();
  });

  $effect(() => {});
</script>

<div class="h-[90vh] p-4">
  <Title>MGE Stats</Title>
  <Button class="my-3">
    <span class="fi fi-{server.flag} mr-2"></span>
    {server.name}
    <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
  </Button>
  <Dropdown bind:open={dropOpen} class="overflow-y-auto px-3 pb-3 text-sm">
    <DropdownItem on:click={async () => await dropClicked('ar')} class="flex items-center gap-2 text-base font-semibold">
      <span class="fi fi-ar"></span>
      Argentina
    </DropdownItem>
    <DropdownItem on:click={async () => await dropClicked('br')} class="flex items-center gap-2 text-base font-semibold">
      <span class="fi fi-br"></span>
      Brasil
    </DropdownItem>
  </Dropdown>
  {#if loading}
    <P>Loading ranking...</P>
  {:else}
    <Table striped={true} hoverable={true}>
      <TableHead class="select-none">
        <TableHeadCell class="cursor-pointer" on:click={() => { sortKey='rating'; sortDir='desc'; }}>
          Position
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('name')}>
          Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('rating')}>
          Rating {sortKey === 'rating' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('wins')}>
          Wins {sortKey === 'wins' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('losses')}>
          Losses {sortKey === 'losses' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('totalGames')}>
          Total Games {sortKey === 'totalGames' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('wlValue')}>
          W/L Ratio {sortKey === 'wlValue' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
        <TableHeadCell class="cursor-pointer" on:click={() => setSort('winrateValue')}>
          Winrate {sortKey === 'winrateValue' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableHeadCell>
      </TableHead>
      <TableBody>
        {#each ranking as user, i}
          <TableBodyRow>
            <TableBodyCell>#{(currentPage - 1) * pageSize + i + 1}</TableBodyCell>
            <TableBodyCell>
              {@const steamid = new ID(user.steamid).get64()}
              <A target="_blank" href="https://steamcommunity.com/profiles/{steamid}">
                {user.name}
              </A>
            </TableBodyCell>
            <TableBodyCell>{user.rating}</TableBodyCell>
            <TableBodyCell>{user.wins}</TableBodyCell>
            <TableBodyCell>{user.losses}</TableBodyCell>
            <TableBodyCell>{user.totalGames}</TableBodyCell>
            <TableBodyCell>{user.wl}</TableBodyCell>
            <TableBodyCell>{user.winrate}%</TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
    <div class="mt-4 flex flex-col items-center gap-2">
      <div class="text-sm text-gray-500">Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} Entries</div>
      <div class="flex items-center gap-2">
        <Button color="light" on:click={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
        <span class="text-sm">Page {currentPage} of {totalPages}</span>
        <Button color="light" on:click={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
      </div>
    </div>
  {/if}
</div>
