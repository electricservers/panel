<script lang="ts">
  import type { PageData } from './$types';
  import { steamStore } from '$lib/stores/steamStore';
  import Title from '$lib/components/Title.svelte';
  import { Button, P, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import Card from '../../utils/widgets/Card.svelte';

  import { ID } from '@node-steam/id';
  import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { regionStore, type Region } from '$lib/stores/regionStore';

  interface Props {
    data: PageData;
  }

  let currentRegion: Region = $state('ar');
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
    games = await fetchData(currentRegion, start, pageSize);
  };

  const fetchData = async (flag: Region, skip = 0, take = pageSize, withTotal = false) => {
    const params = new URLSearchParams({ db: String(flag), skip: String(skip), take: String(take) });
    if (withTotal) params.set('withTotal', '1');
    const res = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await res.json();
    const items: MgeDuel[] = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);
    return items;
  };

  const resetAndLoad = async (flag: Region) => {
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
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      resetAndLoad(r);
    });
    // initial load uses current region value
    resetAndLoad(currentRegion);
    return () => { unsubscribe(); unreg(); };
  });

  // Region is controlled globally via navbar; no local dropdown

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
  <!-- Region is selected globally in the navbar -->
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
          <div class="mt-4 flex justify-center">
            <div class="flex items-center gap-2">
              <Button color="light" aria-label="Previous page" title="Previous" on:click={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                <ChevronLeftOutline class="h-5 w-5" />
              </Button>
              <span class="text-sm">{currentPage} / {totalPages}</span>
              <Button color="light" aria-label="Next page" title="Next" on:click={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                <ChevronRightOutline class="h-5 w-5" />
              </Button>
            </div>
          </div>
      </div>
    </div>
  </div>
</div>
