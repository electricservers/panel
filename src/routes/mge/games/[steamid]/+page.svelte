<script lang="ts">
  import type { PageData } from './$types';
  import { steamStore } from '$lib/stores/steamStore';
  import Title from '$lib/components/Title.svelte';
  import { Avatar, Button, Dropdown, DropdownItem, P, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import Card from '../../../utils/widgets/Card.svelte';
  import { selectedSite } from '$lib/stores/selectedSite';
  import type { mgemod_duels } from '@prisma-arg/client';

  import { ID } from '@node-steam/id';
  import { ChevronDownOutline } from 'flowbite-svelte-icons';

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
  let games = $state<mgemod_duels[]>([]);
  let id = $state('');

  const fetchData = async (flag: string) => {
    id = new ID($steamStore?.steamid).getSteamID2();
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
    <div class="mb-2 flex flex-row items-center">
      <div class="mr-4">
        {#if loading}
          <Avatar size="xl" class="animate-pulse" />
        {:else}
          <Avatar size="xl" src={$steamStore?.avatarfull} />
        {/if}
      </div>
      <div>
        {#if loading}
          <div class="pulse h-6 w-36 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
        {:else}
          <Title>{$steamStore?.personaname}</Title>
        {/if}
      </div>
    </div>
    <div class="flex h-screen">
      <div class="w-2/3">
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
              </tr>
            </TableHead>
            <TableBody tableBodyClass="divide-y">
              {#each games as game, i}
                <TableBodyRow color={game.winner === id ? 'green' : 'red'}>
                    {@const winner = game.winner === id ? $steamStore?.personaname : game.winner}
                    {@const loser = game.loser === id ? $steamStore?.personaname : game.loser}
                  <TableBodyCell>{winner} ({game.winnerscore})</TableBodyCell>
                  <TableBodyCell>{loser} ({game.loserscore})</TableBodyCell>
                  <TableBodyCell>{formatDate(game.gametime)}</TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </div>
      <div class="w-1/3">
        <div class="flex-col">
          <!-- TODO -->
        </div>
      </div>
    </div>
  </div>
</div>
