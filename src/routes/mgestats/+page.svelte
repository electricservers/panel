<script lang="ts">
    import type { PageData } from './$types';
    import {
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell
    } from 'flowbite-svelte';

    export let data: PageData;
</script>

{#if data.ranking}
    <Table tableBodyClass="divide-y" divClass="m-10" striped={true} hoverable={true}>
        <TableHead>
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
            {#each data.ranking as user, i}
                <TableBodyRow>
                    <TableBodyCell>#{i + 1}</TableBodyCell>
                    <TableBodyCell>{user.name}</TableBodyCell>
                    <TableBodyCell>{user.rating}</TableBodyCell>
                    <TableBodyCell>{user.wins}</TableBodyCell>
                    <TableBodyCell>{user.losses}</TableBodyCell>
                    <TableBodyCell>{(user.wins + user.losses)}</TableBodyCell>
                    <TableBodyCell>{(user.wins / user.losses).toFixed(1)}</TableBodyCell>
                    <TableBodyCell>{((user.wins / (user.wins + user.losses)) * 100).toFixed(1)}%</TableBodyCell>
                </TableBodyRow>
            {/each}
        </TableBody>
    </Table>
    {:else}
    <h1>Loading...</h1>
{/if}
