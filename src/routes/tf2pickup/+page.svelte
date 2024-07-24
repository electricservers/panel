<script lang="ts">
    import type { PageData } from './$types';
    import { Button, Dropdown, Search, DropdownItem } from 'flowbite-svelte';
    import { ChevronDownOutline } from 'flowbite-svelte-icons';
    import { pickupSites } from '$lib/pickupSites';

    let selected = 'Select a site...';
    let selectedIcon = '';
    let searchTerm = '';
    let dropOpen = false;

    const clicked = (e: MouseEvent) => {
        const button = e.target as HTMLButtonElement;
        selected = button.innerText;
        selectedIcon = pickupSites.find((site) => site.name === selected)?.icon!;
        dropOpen = false;
    };

    $: filteredSites = pickupSites.filter(
        (person) => person.name.toLowerCase().indexOf(searchTerm?.toLowerCase()) !== -1
    );

    export let data: PageData;
</script>

<div class="h-[90vh] p-4">
    <Button>
        {#if selectedIcon !== ''}
            <span class="fi fi-{selectedIcon} mr-2" />
        {/if}
        {selected}
        <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
    </Button>
    <Dropdown bind:open={dropOpen} class="h-72 overflow-y-auto px-3 pb-3 text-sm">
        <div slot="header" class="p-3">
            <Search size="md" bind:value={searchTerm} />
        </div>
        {#each filteredSites as site (site.name)}
            <DropdownItem
                on:click={clicked}
                class="flex items-center gap-2 text-base font-semibold">
                <span class="fi fi-{site.icon}" />
                {site.name}
            </DropdownItem>
        {/each}
    </Dropdown>
</div>
