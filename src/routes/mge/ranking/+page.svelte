<script lang="ts">
    import type { PageData } from '../$types';
    import { ID } from '@node-steam/id';
    import type { mgemod_stats } from '@prisma/client';
    import {
        A,
        P,
        Button,
        Dropdown,
        DropdownItem,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell
    } from 'flowbite-svelte';
    import { ChevronDownOutline } from 'flowbite-svelte-icons';
    import { writable } from 'svelte/store';
    import Title from '$lib/components/Title.svelte';
    export let data: PageData;

    const sortKey = writable('id'); // default sort key
    const sortDirection = writable(1); // default sort direction (ascending)
    const sortItems = writable(data.ranking.slice()); // make a copy of the items array

    // Define a function to sort the items
    const sortTable = (key: string) => {
        console.log(key);
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

            // Convert to number if the values are numeric
            const aNum =
                typeof aVal === 'string' && !isNaN(parseFloat(aVal)) ? parseFloat(aVal) : aVal;
            const bNum =
                typeof bVal === 'string' && !isNaN(parseFloat(bVal)) ? parseFloat(bVal) : bVal;

            if (aNum < bNum) {
                return -direction;
            } else if (aNum > bNum) {
                return direction;
            }
            return 0;
        });
        sortItems.set(sorted);
    }

    let dropOpen: boolean;
    let serverChosen: string = 'Electric #1';
    let flagChosen: string = 'ar';

    const clicked = async (arg: string) => {
        if (arg === 'ar') {
            serverChosen = 'Electric #1';
        } else {
            serverChosen = 'Electric #5';
        }
        flagChosen = arg;
        const rankResponse = await fetch(`/api/mge/rank?db=${arg}`);
        const ranking: mgemod_stats[] = await rankResponse.json();

        // Modify each user's data to include totalGames, wl, and winrate
        const modifiedRanking = ranking.map((user) => {
            const totalGames = user.wins + user.losses;
            const wl = user.losses !== 0 ? (user.wins / user.losses).toFixed(1) : 'N/A';
            const winrate = totalGames !== 0 ? ((user.wins / totalGames) * 100).toFixed(1) : '0.0';
            user.name = user.name!.replace(/[^\w\s]/g, '_');
            return {
                ...user, // Include existing properties
                totalGames,
                wl,
                winrate
            };
        });
        dropOpen = false;
        $sortItems = modifiedRanking;
    };
</script>

<div class="h-[90vh] p-4">
    <Title>MGE Stats</Title>
    <Button class="mb-3">
        <span class="fi fi-{flagChosen} mr-2" />
        {serverChosen}
        <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
    </Button>
    <Dropdown bind:open={dropOpen} class="overflow-y-auto px-3 pb-3 text-sm">
        <DropdownItem
            on:click={() => clicked('ar')}
            class="flex items-center gap-2 text-base font-semibold">
            <span class="fi fi-ar" />
            Electric #1
        </DropdownItem>
        <DropdownItem
            on:click={() => clicked('br')}
            class="flex items-center gap-2 text-base font-semibold">
            <span class="fi fi-br" />
            Electric #5
        </DropdownItem>
    </Dropdown>
    {#if data.ranking}
        <Table striped={true} hoverable={true}>
            <TableHead class="select-none">
                <TableHeadCell>Position</TableHeadCell>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('rating')}>Rating</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('wins')}>Wins</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('losses')}>Losses</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('totalGames')}>Total Games</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('wl')}>W/L Ratio</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('winrate')}>Winrate</TableHeadCell>
            </TableHead>
            <TableBody>
                {#each $sortItems as user, i}
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
    {:else}
        <h1>Loading...</h1>
    {/if}
</div>
