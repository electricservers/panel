<script lang="ts">
    import Title from '../../lib/components/Title.svelte';
    import { selectedSite } from '$lib/stores/selectedSite';
    import type { PageData } from './$types';
    import { Button, Dropdown, Search, DropdownItem, P, Datepicker } from 'flowbite-svelte';
    import { ChevronDownOutline } from 'flowbite-svelte-icons';
    import { pickupSites } from '$lib/pickupSites';

    let searchTerm = '';
    let dropOpen = false;
    let apiData: any = null;
    let loading = false;
    let error: string | null = null;

    const clicked = (e: MouseEvent) => {
        const button = e.target as HTMLButtonElement;
        selectedSite.set({
            name: button.innerText,
            icon: pickupSites.find((site) => site.name === button.innerText)?.icon!
        });
        dropOpen = false;
    };

    $: filteredSites = pickupSites.filter(
        (person) => person.name.toLowerCase().indexOf(searchTerm?.toLowerCase()) !== -1
    );

    $: selectedSite.set({
        name: 'Select a site...',
        icon: ''
    });

    $: if ($selectedSite) {
        fetchApiData($selectedSite.name);
    }

    async function fetchApiData(siteName: string) {
        loading = true;
        error = null;
        apiData = null;

        try {
            const apiUrl = `https://api.${siteName}/games?limit=3`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('API request failed');
            }
            apiData = await response.json();
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    export let data: PageData;
</script>

<div class="h-[90vh] p-4">
    <Title>TF2 Pickup Stats</Title>
    <Button>
        {#if $selectedSite?.icon !== ''}
            <span class="fi fi-{$selectedSite?.icon} mr-2" />
        {/if}
        {$selectedSite?.name}
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
                <span class="fi fi-{site.icon}"></span>
                {site.name}
            </DropdownItem>
        {/each}
    </Dropdown>
    <Datepicker style="max-width: 200px" placeholder="sdfjklfsd" />
    {#if $selectedSite && $selectedSite.icon}
        <Title>API Results for {$selectedSite.name}</Title>
        {#if loading}
            <P>Loading...</P>
        {:else if error}
            <P>Error: {error}</P>
        {:else if apiData}
            <pre class="text-black dark:text-white">{JSON.stringify(apiData, null, 2)}</pre>
        {:else}
            <P>No data available</P>
        {/if}
    {:else}
        <P>Please select a site to view API data</P>
    {/if}
</div>
