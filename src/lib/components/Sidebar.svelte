<script lang="ts">
    import { afterNavigate } from '$app/navigation';
    import { page } from '$app/stores';

    import {
        Sidebar,
        SidebarDropdownWrapper,
        SidebarGroup,
        SidebarItem,
        SidebarWrapper
    } from 'flowbite-svelte';
    import {
        AngleDownOutline,
        AngleUpOutline,
        ChartOutline,
        UserHeadsetOutline,
        UsersGroupOutline
    } from 'flowbite-svelte-icons';
    import TrophyOutline from './icons/TrophyOutline.svelte';
    import { steamStore } from '$lib/stores/steamStore';
    import { derived } from 'svelte/store';

    export let drawerHidden: boolean = false;

    const closeDrawer = () => {
        drawerHidden = true;
    };

    let iconClass =
        'flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white';
    let itemClass =
        'flex items-center p-2 text-base text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 group dark:text-gray-200 dark:hover:bg-gray-700';
    let groupClass = 'pt-2 space-y-2';

    $: mainSidebarUrl = $page.url.pathname;
    let activeMainSidebar: string;

    afterNavigate((navigation) => {
        // this fixes https://github.com/themesberg/flowbite-svelte/issues/364
        document.getElementById('svelte')?.scrollTo({ top: 0 });
        closeDrawer();

        activeMainSidebar = navigation.to?.url.pathname ?? '';
    });

    interface NavItem {
        name: string;
        icon: any;
        href: string;
        children?: NavItem[];
    }

    const baseMgeChildren: NavItem[] = [
        { name: 'Leaderboard', href: '/mge/ranking', icon: ChartOutline }
    ];

    const mgeItem = derived(steamStore, ($steamStore) => ({
        name: 'MGE',
        icon: ChartOutline,
        href: '#',
        children: $steamStore
            ? [
                  ...baseMgeChildren,
                  {
                      name: 'My stats',
                      href: `/mge/games/${$steamStore?.steamid}`,
                      icon: ChartOutline
                  }
              ]
            : baseMgeChildren
    }));

    const pickupItem: NavItem = {
        name: 'TF2 Pickup',
        icon: UserHeadsetOutline,
        href: '/tf2pickup'
    };

    const whoisItem: NavItem = {
        name: 'Whois',
        icon: UsersGroupOutline,
        href: '/whois'
    };

    $: items = derived(steamStore, ($steamStore) => {
        const baseItems = [$mgeItem, pickupItem];
        if ($steamStore && ($steamStore.role === 'admin' || $steamStore.role === 'owner')) {
            return [...baseItems, whoisItem];
        }
        return baseItems;
    });
</script>

<Sidebar
    class={drawerHidden ? 'hidden' : ''}
    activeUrl={mainSidebarUrl}
    activeClass="bg-gray-100 dark:bg-gray-700"
    asideClass="fixed inset-0 z-30 flex-none h-full w-64 lg:h-auto border-e border-gray-200 dark:border-gray-600 lg:overflow-y-visible lg:pt-16 lg:block">
    <h4 class="sr-only">Main menu</h4>
    <SidebarWrapper
        divClass="overflow-y-auto px-3 pt-20 lg:pt-5 h-full bg-white scrolling-touch max-w-2xs lg:h-[calc(100vh-4rem)] lg:block dark:bg-gray-800 lg:me-0 lg:sticky top-2">
        <nav class="divide-y divide-gray-200 dark:divide-gray-700">
            <SidebarGroup ulClass={groupClass} class="mb-3">
                {#each $items as item}
                    {#if item.children && item.children.length > 0}
                        <SidebarDropdownWrapper label={item.name} class="pr-3">
                            <AngleDownOutline slot="arrowdown" strokeWidth="3.3" size="sm" />
                            <AngleUpOutline slot="arrowup" strokeWidth="3.3" size="sm" />
                            <svelte:component this={item.icon} slot="icon" class={iconClass} />
                            {#each item.children as child}
                                <SidebarItem
                                    label={child.name}
                                    href={child.href}
                                    spanClass="ml-12"
                                    class={itemClass}
                                    active={activeMainSidebar === child.href}>
                                </SidebarItem>
                            {/each}
                        </SidebarDropdownWrapper>
                    {:else}
                        <SidebarItem
                            label={item.name}
                            href={item.href}
                            spanClass="ml-3"
                            class={itemClass}
                            active={activeMainSidebar === item.href}>
                            <svelte:component this={item.icon} slot="icon" class={iconClass} />
                        </SidebarItem>
                    {/if}
                {/each}
            </SidebarGroup>
        </nav>
    </SidebarWrapper>
</Sidebar>

<div
    hidden={drawerHidden}
    class="fixed inset-0 z-20 bg-gray-900/50 dark:bg-gray-900/60"
    on:click={closeDrawer}
    on:keydown={closeDrawer}
    role="presentation" />
