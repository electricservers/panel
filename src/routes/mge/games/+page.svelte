<script lang="ts">
  import type { PageData } from './$types';
  import { steamStore } from '$lib/stores/steamStore';
  import Title from '$lib/components/Title.svelte';
  import { Avatar, Button, Dropdown, DropdownItem, P, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import Card from '../../utils/widgets/Card.svelte';

  import { ID } from '@node-steam/id';
  import { ChevronDownOutline } from 'flowbite-svelte-icons';
  import type { MgeDuel } from '$lib/mge/mgeduel';

  interface Props {
    data: PageData;
  }

  let dropOpen: boolean = $state(false);
  let server = $state({
    name: 'Argentina',
    flag: 'ar'
  });
  let { data }: Props = $props();
  let loading = $state(true);
  let games = $state<MgeDuel[]>([]);
  let id = $state('');
  const pageSize = 25;
  let currentPage = $state(1);
  let totalItems = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  const goToPage = async (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    currentPage = clamped;
    const start = (clamped - 1) * pageSize;
    games = await fetchData(server.flag, start, pageSize);
  };

  const fetchData = async (flag: string, skip = 0, take = pageSize, withTotal = false) => {
    const params = new URLSearchParams({ db: flag, skip: String(skip), take: String(take) });
    if (withTotal) params.set('withTotal', '1');
    const res = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await res.json();
    const items: MgeDuel[] = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);
    return items;
  };

  const resetAndLoad = async (flag: string) => {
    loading = true;
    games = [];
    currentPage = 1;
    const first = await fetchData(flag, 0, pageSize, true);
    games = first;
    loading = false;
  };

  $effect(() => {
    const unsubscribe = steamStore.subscribe((value) => {
      if (value !== undefined) {
        loading = false;
      }
    });
    resetAndLoad('ar');
    return unsubscribe;
  });

  const dropClicked = async (arg: string) => {
    dropOpen = false;
    if (arg === 'ar') {
      server.name = 'Argentina';
    } else {
      server.name = 'Brasil';
    }
    server.flag = arg;
    await resetAndLoad(arg);
  };

  function formatDate(unixEpoch: string | null): string {
    const date = new Date(Number(unixEpoch) * 1000); // Convert seconds to milliseconds
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}`;
  }

  $effect(() => {});
</script>

<div class="h-[90vh] p-4">
  <Title>Latest games</Title>
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
  <div class="flex flex-col">
    <div class="h-screen">
      <div>
        <Table hoverable={true}>
          <TableHead defaultRow={false}>
            <tr>
              <TableHeadCell>Winner</TableHeadCell>
              <TableHeadCell>Loser</TableHeadCell>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Arena</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {#each games as game}
              <TableBodyRow>
                <TableBodyCell>{game.winnername} ({game.winnerscore})</TableBodyCell>
                <TableBodyCell>{game.losername} ({game.loserscore})</TableBodyCell>
                <TableBodyCell>{formatDate(game.gametime)}</TableBodyCell>
                <TableBodyCell>{game.arenaname}</TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
          <div class="mt-4 flex flex-col items-center gap-2">
          <div class="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} Entries</div>
          <div class="flex items-center gap-2">
            <Button color="light" on:click={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
            <span class="text-sm">Page {currentPage} of {totalPages}</span>
            <Button color="light" on:click={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
