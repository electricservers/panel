<script lang="ts">
    import type { PageData } from './$types';
    import { ID } from '@node-steam/id';
    import {
        A,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell
    } from 'flowbite-svelte';
    import { writable } from 'svelte/store';

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
</script>

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
