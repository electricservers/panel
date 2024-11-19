<script lang="ts">
  import { ID } from '@node-steam/id';
  import type { mgemod_stats } from '@prisma-arg/client';
  import { A, P, Button, Dropdown, DropdownItem, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { ChevronDownOutline } from 'flowbite-svelte-icons';
  import Title from '$lib/components/Title.svelte';

  let dropOpen: boolean = $state(false);
  let server = $state({
    name: 'Electric #1',
    flag: 'ar'
  });
  let loading = $state(false);
  let ranking = $state([]);

  const fetchRankingData = async (db: string = 'ar') => {
    const rankResponse = await fetch(`/api/mge/rank?db=${db}`);
    const rank: mgemod_stats[] = await rankResponse.json();
    
    let ranking = rank.map((user) => {
      const totalGames = user.wins! + user.losses!;
      const wl = user.losses !== 0 ? (user.wins! / user.losses!).toFixed(1) : 'N/A';
      const winrate = totalGames !== 0 ? ((user.wins! / totalGames) * 100).toFixed(1) : '0.0';

      return {
        ...user,
        totalGames,
        wl,
        winrate
      };
    });

    return ranking;
  };

  const dropClicked = async (arg: string) => {
    dropOpen = false;
    loading = true;
    if (arg === 'ar') {
      server.name = 'Electric #1';
    } else {
      server.name = 'Electric #5';
    }
    server.flag = arg;
    console.log(arg)
    ranking = await fetchRankingData(arg);
    loading = false;
  };

  $effect(() => {
    const fetchData = async () => {
        loading = true;
        ranking = await fetchRankingData();
        loading = false;
    }

    fetchData();
  })
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
      Electric #1
    </DropdownItem>
    <DropdownItem on:click={async () => await dropClicked('br')} class="flex items-center gap-2 text-base font-semibold">
      <span class="fi fi-br"></span>
      Electric #5
    </DropdownItem>
  </Dropdown>
  {#if loading}
    <P>Loading ranking...</P>
  {:else}
    <Table striped={true} hoverable={true}>
      <TableHead class="select-none">
        <TableHeadCell>Position</TableHeadCell>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Rating</TableHeadCell>
        <TableHeadCell>Wins</TableHeadCell>
        <TableHeadCell>Losses</TableHeadCell>
        <TableHeadCell>Total Games</TableHeadCell>
        <TableHeadCell>W/L Ratio</TableHeadCell>
        <TableHeadCell>Winrate</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each ranking as user, i}
          <TableBodyRow>
            <TableBodyCell>#{i + 1}</TableBodyCell>
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
  {/if}
</div>
