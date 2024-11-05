<script lang="ts">
    import type { PageData } from './$types';
    import { steamStore } from '$lib/stores/steamStore';
    import Title from '$lib/components/Title.svelte';
    import { Avatar, P, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import { onMount } from 'svelte';
    import Card from '../../../utils/widgets/Card.svelte';

    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
    let loading = $state(true);

    onMount(() => {
        const unsubscribe = steamStore.subscribe((value) => {
            if (value !== undefined) {
                loading = false;
            }
        });

        return unsubscribe;
    });
</script>

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
                        <Card title="Matches" subtitle="3452"></Card>
                    </div>
                    <div class="p-3">
                        <Card title="Winrate" subtitle="80.3% - 543-211"></Card>
                    </div>
                </div>
                <div>
                    <Table>
                        <TableHead defaultRow={false}>
                          <tr>
                            <TableHeadCell colspan="2">Product</TableHeadCell>
                            <TableHeadCell colspan="3">Info</TableHeadCell>
                          </tr>
                          <tr>
                            <TableHeadCell>Brand</TableHeadCell>
                            <TableHeadCell>Product name</TableHeadCell>
                            <TableHeadCell>Color</TableHeadCell>
                            <TableHeadCell>Category</TableHeadCell>
                            <TableHeadCell>Price</TableHeadCell>
                          </tr>
                        </TableHead>
                        <TableBody tableBodyClass="divide-y">
                          <TableBodyRow>
                            <TableBodyCell>Apple</TableBodyCell>
                            <TableBodyCell>Apple MacBook Pro 17"</TableBodyCell>
                            <TableBodyCell>Sliver</TableBodyCell>
                            <TableBodyCell>Laptop</TableBodyCell>
                            <TableBodyCell>$2999</TableBodyCell>
                          </TableBodyRow>
                          <TableBodyRow>
                            <TableBodyCell>Microsoft</TableBodyCell>
                            <TableBodyCell>Microsoft Surface Pro</TableBodyCell>
                            <TableBodyCell>White</TableBodyCell>
                            <TableBodyCell>Laptop PC</TableBodyCell>
                            <TableBodyCell>$1999</TableBodyCell>
                          </TableBodyRow>
                          <TableBodyRow>
                            <TableBodyCell>Apple</TableBodyCell>
                            <TableBodyCell>Magic Mouse 2</TableBodyCell>
                            <TableBodyCell>Black</TableBodyCell>
                            <TableBodyCell>Accessories</TableBodyCell>
                            <TableBodyCell>$99</TableBodyCell>
                          </TableBodyRow>
                        </TableBody>
                      </Table>
                </div>
            </div>
            <div class="w-1/3">
                <div class="flex-col">
                    <Card title="Winrate" subtitle="80.3% - 543-211"></Card>
                    <Card title="Winrate" subtitle="80.3% - 543-211"></Card>
                    <Card title="Winrate" subtitle="80.3% - 543-211"></Card>
                    <Card title="Winrate" subtitle="80.3% - 543-211"></Card>
                    <Card title="Winrate" subtitle="80.3% - 543-211"></Card>
                </div>
            </div>
        </div>
    </div>
</div>
