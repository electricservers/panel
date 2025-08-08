<script lang="ts">
  import type { PageData } from './$types';
  import { steamStore } from '$lib/stores/steamStore';
  import { Avatar, Button, Dropdown, DropdownItem, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import MostPlayedArenasPlaceholder from '$lib/components/mge/MostPlayedArenasPlaceholder.svelte';
  import ActivityPlaceholder from '$lib/components/mge/ActivityPlaceholder.svelte';
  import TopFoesPlaceholder from '$lib/components/mge/TopFoesPlaceholder.svelte';

  import { ID } from '@node-steam/id';
  import { ChevronDownOutline, ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { get } from 'svelte/store';

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
  let id = $state(''); // Steam2 format used by DB queries

  // Pagination
  const pageSize = 25;
  let currentPage = $state(1);
  let totalItems = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  // Player summary
  let playerName = $state('');
  let wins = $state(0);
  let losses = $state(0);
  const totalMatches = $derived(wins + losses);
  const winrateNum = $derived(totalMatches ? (wins / totalMatches) * 100 : 0);
  const winrate = $derived(winrateNum.toFixed(1));
  let avatarUrl = $state<string | undefined>(undefined);

  const fetchPlayerSummary = async (db: string) => {
    // Load wins/losses and name
    const params = new URLSearchParams({ db, steamid: id, take: '1' });
    const resp = await fetch(`/api/mge/rank?${params.toString()}`);
    const arr = await resp.json();
    const player = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    if (player) {
      playerName = player.name ?? '';
      wins = player.wins ?? 0;
      losses = player.losses ?? 0;
    } else {
      playerName = '';
      wins = 0;
      losses = 0;
    }

    // Prefer the logged-in user's avatar if same profile; otherwise leave undefined
    const u = get(steamStore);
    if (u && u.steamid === String(data.id)) {
      avatarUrl = u.avatarfull || u.avatarmedium || u.avatar;
    }
  };

  const fetchGames = async (db: string, page = 1, withTotal = false) => {
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({ db, steamid: id, skip: String(skip), take: String(pageSize) });
    if (withTotal) params.set('withTotal', '1');
    const result = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await result.json();
    const items: MgeDuel[] = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);
    games = items;
  };

  const fetchData = async (db: string) => {
    id = new ID(data.id).getSteamID2();
    currentPage = 1;
    await Promise.all([
      fetchPlayerSummary(db),
      fetchGames(db, 1, true)
    ]);
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
      server.name = 'Argentina';
    } else {
      server.name = 'Brasil';
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

<div class="p-4">
  <div class="flex items-center gap-4">
    <Avatar size="lg" src={avatarUrl} />
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{playerName || 'Player'}</h1>
      <a target="_blank" class="text-sm text-blue-600 hover:underline" href={`https://steamcommunity.com/profiles/${data.id}`}>
        View Steam profile
      </a>
    </div>
  </div>
  <div class="mt-3 flex flex-col gap-3">
    <!-- Region selector aligned under header -->
    <Button class="w-fit">
      <span class="fi fi-{server.flag} mr-2"></span>
      {server.name}
      <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
    </Button>
    <Dropdown bind:open={dropOpen} placement="bottom-start" class="overflow-y-auto px-3 pb-3 text-sm">
      <DropdownItem on:click={async () => await dropClicked('ar')} class="flex items-center gap-2 text-base font-semibold">
        <span class="fi fi-ar"></span>
        Argentina
      </DropdownItem>
      <DropdownItem on:click={async () => await dropClicked('br')} class="flex items-center gap-2 text-base font-semibold">
        <span class="fi fi-br"></span>
        Brasil
      </DropdownItem>
    </Dropdown>
    <!-- Compact stat strip -->
    <div class="flex flex-wrap items-end justify-start gap-x-8 gap-y-2">
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Matches</div>
        <div class="text-2xl font-semibold">{totalMatches.toLocaleString()}</div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Wins</div>
        <div class="text-2xl font-semibold text-emerald-500">{wins.toLocaleString()}</div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Losses</div>
        <div class="text-2xl font-semibold text-rose-400">{losses.toLocaleString()}</div>
      </div>
      <div class="min-w-[200px] flex-1 md:max-w-[420px]">
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Winrate</span>
          <span>{winrate}%</span>
        </div>
        <div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-2 rounded-full bg-emerald-500" style={`width: ${winrateNum}%`}></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="h-[90vh] p-4">
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div class="lg:col-span-8">
      <!-- Matches table -->
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
      <div class="mt-4 flex justify-center">
        <div class="flex items-center gap-2">
          <Button color="light" aria-label="Previous page" title="Previous" on:click={async () => { if (currentPage > 1) { currentPage -= 1; await fetchGames(server.flag, currentPage); } }} disabled={currentPage <= 1}>
            <ChevronLeftOutline class="h-5 w-5" />
          </Button>
          <span class="text-sm">{currentPage} / {totalPages}</span>
          <Button color="light" aria-label="Next page" title="Next" on:click={async () => { if (currentPage < totalPages) { currentPage += 1; await fetchGames(server.flag, currentPage); } }} disabled={currentPage >= totalPages}>
            <ChevronRightOutline class="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-4 lg:col-span-4">
      <!-- Sidebar placeholders for future features -->
      <MostPlayedArenasPlaceholder />
      <ActivityPlaceholder />
      <TopFoesPlaceholder />
    </div>
  </div>
</div>
