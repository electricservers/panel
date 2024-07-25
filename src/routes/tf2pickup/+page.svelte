<script lang="ts">
    import Title from '../../lib/components/Title.svelte';
    import { selectedSite } from '$lib/stores/selectedSite';
    import type { PageData } from './$types';
    import {
        Button,
        Dropdown,
        Search,
        Popover,
        DropdownItem,
        P,
        Table,
        TableBody,
        TableHead,
        TableHeadCell,
        A,
        TableBodyRow,
        TableBodyCell,
        Tooltip,
        Spinner
    } from 'flowbite-svelte';
    import { ChevronDownOutline } from 'flowbite-svelte-icons';
    import { pickupSites } from '$lib/pickupSites';
    import { DatePicker } from '@svelte-plugins/datepicker';
    import { format } from 'date-fns';
    import type { Games } from '$lib/game';
    import { getPlayerGames, type PlayerGames } from '$lib/rankings';
    import { writable } from 'svelte/store';

    let searchTerm = '';
    let dropOpen = false;
    let loading = false;
    let error: string | null = null;
    let games: Games;
    let playerGames: PlayerGames[] = [];
    let apiVersion = writable('');

    const clicked = async (e: MouseEvent) => {
        const button = e.target as HTMLButtonElement;
        selectedSite.set({
            name: button.innerText,
            icon: pickupSites.find((site) => site.name === button.innerText)?.icon!
        });
        dropOpen = false;
        $apiVersion = 'Loading...';
        const response = await fetch(`https://api.${$selectedSite?.name}`);
        if (!response.ok) {
            $apiVersion = 'API request failed';
        }
        const body = await response.json();
        $apiVersion = body.version;
    };

    $: filteredSites = pickupSites.filter(
        (person) => person.name.toLowerCase().indexOf(searchTerm?.toLowerCase()) !== -1
    );

    $: selectedSite.set({
        name: 'Select a site...',
        icon: ''
    });

    async function fetchApiData() {
        if (!$selectedSite?.icon) {
            return;
        }
        loading = true;
        error = null;
        try {
            const apiUrl = `https://api.${$selectedSite?.name}/games?from=${formattedStartDate}&to=${formattedEndDate}&state=ended&limit=0`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('API request failed');
            }
            games = await response.json();
            $sortItems = getPlayerGames(games);
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    const today = new Date();

    const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

    const getDateFromToday = (days) => {
        return Date.now() - days * MILLISECONDS_IN_DAY;
    };

    let startDate = getDateFromToday(29);
    let endDate = today;
    let dateFormat = 'yyyy-MM-dd';
    let isOpen = false;

    let formattedStartDate = '';

    const onClearDates = () => {
        startDate = '';
        endDate = '';
    };

    const toggleDatePicker = () => (isOpen = !isOpen);
    const formatDate = (dateString: any) =>
        (dateString && format(new Date(dateString), dateFormat)) || '';

    $: formattedStartDate = formatDate(startDate);
    $: formattedEndDate = formatDate(endDate);

    const sortKey = writable('id'); // default sort key
    const sortDirection = writable(1); // default sort direction (ascending)
    const sortItems = writable(playerGames.slice()); // make a copy of the items array

    // Define a function to sort the items
    const sortTable = (key: string) => {
        // If the same key is clicked, reverse the sort direction
        if ($sortKey === key) {
            sortDirection.update((val) => -val);
        } else {
            sortKey.set(key);
            sortDirection.set(1);
        }
    };

    $: {
        const key = $sortKey;
        const direction = $sortDirection;
        const sorted = [...$sortItems].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) {
                return -direction;
            } else if (aVal > bVal) {
                return direction;
            }
            return 0;
        });
        sortItems.set(sorted);
    }
    export let data: PageData;
</script>

<div class="h-[90vh] p-4">
    <Title>TF2 Pickup Stats</Title>
    <div class="inline-flex">
        <Button class="mb-3">
            {#if $selectedSite?.icon !== ''}
                <span class="fi fi-{$selectedSite?.icon} mr-2" />
            {/if}
            {$selectedSite?.name}
            <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
        </Button>
        {#if $apiVersion !== ''}
            <P class="m-3"
                >API Version: {$apiVersion}
                {$apiVersion !== 'Loading...' && $apiVersion !== '11.8.0' && $apiVersion !== ''
                    ? ' - date range not available'
                    : ''}</P>
        {/if}
    </div>
    <Dropdown bind:open={dropOpen} class="h-72 overflow-y-auto px-3 pb-3 text-sm">
        <div slot="header" class="p-3">
            <Search size="md" bind:value={searchTerm} />
        </div>
        {#each filteredSites as site (site.name)}
            <DropdownItem
                on:click={clicked}
                class="flex items-center gap-2 text-base font-semibold">
                <span class="fi fi-{site.icon}"></span>
                {site.name}
            </DropdownItem>
        {/each}
    </Dropdown>
    <div class="date-filter">
        <DatePicker
            class={$apiVersion !== '11.8.0' ? 'hidden' : ''}
            bind:isOpen
            bind:startDate
            bind:endDate
            isRange>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="date-field" on:click={toggleDatePicker} class:open={isOpen}>
                <i class="icon-calendar" />
                <div class="date">
                    {#if startDate}
                        {formattedStartDate} - {formattedEndDate}
                    {:else}
                        Pick a date
                    {/if}
                </div>
                {#if startDate}
                    <span on:click={onClearDates}>
                        <i class="os-icon-x" />
                    </span>
                {/if}
            </div>
        </DatePicker>
    </div>
    <Button class="mt-3" on:click={fetchApiData}>Search</Button>
    <div class="mt-4">
        {#if loading}
            <div class="inline-flex">
                <Spinner size="6" />
                <P class="m-0.5">Loading...</P>
            </div>
        {:else if error}
            <P>Error: {error}</P>
        {:else if games}
            <Table class="max-w-lg">
                <TableHead  class="select-none lowercase">
                    <TableHeadCell>Name</TableHeadCell>
                    <TableHeadCell on:click={() => sortTable('totalGames')}
                        >Total Games</TableHeadCell>
                    <TableHeadCell on:click={() => sortTable('scoutGames')}
                        >Scout Games</TableHeadCell>
                    <TableHeadCell on:click={() => sortTable('soldierGames')}
                        >Soldier Games</TableHeadCell>
                    <TableHeadCell on:click={() => sortTable('demomanGames')}
                        >Demoman Games</TableHeadCell>
                    <TableHeadCell on:click={() => sortTable('medicGames')}
                        >Medic Games</TableHeadCell>
                    <TableHeadCell
                        id="medicDifferenceCell"
                        on:click={() => sortTable('nonMedicGamesWeight')}
                        >Non-medic games weighted score</TableHeadCell>
                    <Popover triggeredBy="#medicDifferenceCell" title="Info" placement="right">
                        <div class="w-72 text-sm font-light text-gray-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 p-3 space-y-2">
                            <h3 class="font-semibold text-gray-900 dark:text-white">Explanation of Metric Calculation</h3>
                            <p><strong>Total Games:</strong> The absolute number of games a player has participated in.</p>
                            <p><strong>Proportion of Non-Medic Games:</strong> Calculated as <code>1 - (Medic Games / Total Games)</code>. This represents the fraction of games played in roles other than medic.</p>
                            <p><strong>Weighted Score:</strong> The total games played are weighted by the proportion of games not played as medic, emphasizing players who participate frequently in non-medic roles.</p>
                        </div>
                    </Popover>
                </TableHead>
                <TableBody tableBodyClass="divide-y">
                    {#each $sortItems as pos}
                        <TableBodyRow>
                            <TableBodyCell>
                                <A href="https://steamcommunity.com/profiles/{pos.steamid}">
                                    {pos.name}
                                </A>
                            </TableBodyCell>
                            <TableBodyCell>{pos.totalGames}</TableBodyCell>
                            <TableBodyCell>{pos.scoutGames}</TableBodyCell>
                            <TableBodyCell>{pos.soldierGames}</TableBodyCell>
                            <TableBodyCell>{pos.demomanGames}</TableBodyCell>
                            <TableBodyCell>{pos.medicGames}</TableBodyCell>
                            <TableBodyCell>{pos.nonMedicGamesWeight}</TableBodyCell>
                        </TableBodyRow>
                    {/each}
                </TableBody>
            </Table>
        {/if}
    </div>
</div>
