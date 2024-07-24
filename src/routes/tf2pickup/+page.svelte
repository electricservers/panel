<script lang="ts">
    import type { PageData } from './$types';
    import { Button, Dropdown, Search, DropdownItem } from 'flowbite-svelte';
    import { ChevronDownOutline } from 'flowbite-svelte-icons';
    import { pickupSites, type PickupSite } from '$lib/pickupSites';

    let selected: PickupSite = {
        name: 'Select a site...',
        icon: ''
    };
    let searchTerm = '';

    const clicked = (e: any) => {
        e.preventDefault();
        console.log(e.target)
    };

    $: filteredSites = pickupSites.filter(
        (person) => person.name.toLowerCase().indexOf(searchTerm?.toLowerCase()) !== -1
    );

    export let data: PageData;
</script>

<div class="h-[90vh] p-4">
    <Button>
        {selected.name}
        <ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
    </Button>
    <Dropdown class="h-72 overflow-y-auto px-3 pb-3 text-sm">
        <div slot="header" class="p-3">
            <Search size="md" bind:value={searchTerm} />
        </div>
        {#each pickupSites as person (person.name)}
            <DropdownItem
                on:click={clicked}
                class="flex items-center gap-2 text-base font-semibold">
                <span class="fi fi-{person.icon}" />
                {person.name}
            </DropdownItem>
        {/each}
    </Dropdown>
</div>
