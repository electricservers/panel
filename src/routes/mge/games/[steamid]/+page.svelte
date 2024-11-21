<script lang="ts">
  import type { PageData } from './$types';
  import { steamStore } from '$lib/stores/steamStore';
  import Title from '$lib/components/Title.svelte';
  import { Avatar, Button, Dropdown, DropdownItem, P, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import Card from '../../../utils/widgets/Card.svelte';

  import { ID } from '@node-steam/id';
  import { ChevronDownOutline } from 'flowbite-svelte-icons';
  import type { MgeDuel } from '$lib/mge/mgeduel';

  interface Props {
    data: PageData;
  }

  let dropOpen: boolean = $state(false);
  let server = $state({
    name: 'Electric #1',
    flag: 'ar'
  });
  let { data }: Props = $props();
  let loading = $state(true);
  let games = $state<MgeDuel[]>([]);
  let id = $state('');

  const fetchData = async (flag: string) => {
    id = new ID(data.id).getSteamID2();
    let result = await fetch(`/api/mge/games?db=${flag}&steamid=${id}`);
    games = await result.json();
  };

  $effect(() => {
    const unsubscribe = steamStore.subscribe((value) => {
      if (value !== undefined) {
        loading = false;
      }
    });
    fetchData('ar');
    return unsubscribe;
  });

  const dropClicked = async (arg: string) => {
    dropOpen = false;
    if (arg === 'ar') {
      server.name = 'Electric #1';
    } else {
      server.name = 'Electric #5';
    }
    server.flag = arg;
    await fetchData(arg);
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
</script>

<Button class="my-3">
  <span class="fi fi-{server.flag} mr-2"></span>
  {server.name}
  <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
</Button>
<Dropdown bind:open={dropOpen} class="overflow-y-auto px-3 pb-3 text-sm">
  <DropdownItem on:click={async () => await dropClicked('ar')} class="flex items-center gap-2 text-base font-semibold">
    <span class="fi fi-ar"></span>
    Electric #1
  </DropdownItem>
  <DropdownItem on:click={async () => await dropClicked('br')} class="flex items-center gap-2 text-base font-semibold">
    <span class="fi fi-br"></span>
    Electric #5
  </DropdownItem>
</Dropdown>
<div class="h-[90vh] p-4">
  <div class="flex flex-col">
    <div class="h-screen">
      <div>
        <div class="flex flex-row justify-evenly">
          <div class="p-3">
            <Card title="Matches" subtitle="TODO"></Card>
          </div>
          <div class="p-3">
            <Card title="Winrate" subtitle="TODO"></Card>
          </div>
        </div>
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
                <TableBodyRow color={game.winner === id ? 'green' : 'red'}>
                  <TableBodyCell>{game.winnername} ({game.winnerscore})</TableBodyCell>
                  <TableBodyCell>{game.losername} ({game.loserscore})</TableBodyCell>
                  <TableBodyCell>{formatDate(game.gametime)}</TableBodyCell>
                  <TableBodyCell>{game.arenaname}</TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
</div>
