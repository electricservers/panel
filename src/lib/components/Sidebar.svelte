<script lang="ts">
  import { page } from '$app/stores';
  import { Sidebar, SidebarDropdownWrapper, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte';
  import { AngleDownOutline, AngleUpOutline, SearchOutline, CogOutline, HomeOutline, UsersGroupOutline, GridOutline } from 'flowbite-svelte-icons';
  import MgeOutline from '$lib/components/icons/MgeOutline.svelte';
  import LeaderboardOutline from '$lib/components/icons/LeaderboardOutline.svelte';
  import GamesOutline from '$lib/components/icons/GamesOutline.svelte';
  import VersusOutline from '$lib/components/icons/VersusOutline.svelte';
  import { steamStore } from '$lib/stores/steamStore';
  import { onMount } from 'svelte';

  // Types
  interface NavItem {
    name: string;
    icon: any;
    href: string;
    children?: NavItem[];
  }

  // Props with bindable
  let { drawerHidden = $bindable(false) } = $props();

  // Version state
  let version = $state('');

  // Styles
  const styles = {
    icon: 'flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white',
    item: 'flex items-center p-2 text-base text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 group dark:text-gray-200 dark:hover:bg-gray-700',
    group: 'pt-2 space-y-2'
  };

  // Fetch version on mount
  onMount(async () => {
    try {
      const response = await fetch('/api/version');
      if (response.ok) {
        const data = await response.json();
        version = data.version;
      }
    } catch (error) {
      console.error('Failed to fetch version:', error);
      version = 'unknown';
    }
  });

  const handleDrawerClose = () => {
    drawerHidden = true;
  };

  // Navigation items
  const homeItem: NavItem = { name: 'Home', href: '/', icon: HomeOutline };

  const baseMgeChildren: NavItem[] = [
    { name: 'Leaderboard', href: '/mge/ranking', icon: LeaderboardOutline },
    { name: 'Games', href: '/mge/games', icon: GamesOutline },
    { name: 'Versus', href: '/mge/versus', icon: VersusOutline }
  ];

  let whoisItem = $derived({
    name: 'Whois',
    icon: SearchOutline,
    href: '#',
    children: [
      { name: 'Search', href: '/whois', icon: SearchOutline },
      { name: 'Alt Link', href: '/whois/alt', icon: UsersGroupOutline },
      ...($steamStore?.role === 'owner' ? [{ name: 'Revert ELO', href: '/whois/revert-elo', icon: CogOutline }] : [])
    ]
  });

  const adminItem: NavItem = {
    name: 'Admin',
    icon: CogOutline,
    href: '#',
    children: [
      { name: 'Users', href: '/admin/users', icon: UsersGroupOutline },
      { name: 'Site Configuration', href: '/admin/config', icon: CogOutline },
      { name: 'Modules', href: '/admin/modules', icon: GridOutline }
    ]
  };

  let mgeItem = $derived({
    name: 'MGE',
    icon: MgeOutline,
    href: '#',
    children: baseMgeChildren
  });

  const primaryItems = $derived([homeItem, mgeItem, ...($steamStore?.role === 'admin' || $steamStore?.role === 'owner' ? [whoisItem] : [])]);

  const showAdmin = $derived($steamStore?.role === 'owner');
</script>

<Sidebar
  class={drawerHidden ? 'hidden lg:block' : ''}
  activeUrl={$page.url.pathname}
  activeClass="bg-gray-100 dark:bg-gray-700"
  asideClass="fixed inset-0 z-30 flex-none h-full w-64 lg:h-auto border-e border-gray-200 dark:border-gray-600 lg:overflow-y-visible lg:pt-[var(--header-h,4rem)] lg:block">
  <SidebarWrapper divClass="overflow-y-auto px-3 pt-20 lg:pt-5 h-full bg-white scrolling-touch max-w-2xs lg:h-[calc(100vh-var(--header-h,4rem))] lg:block dark:bg-gray-800 lg:me-0 lg:sticky top-2">
    <div class="flex flex-col h-full">
      <nav class="divide-y divide-gray-200 dark:divide-gray-700 flex-1">
        <SidebarGroup ulClass={styles.group} class="mb-3">
          {#each primaryItems as item}
            {#if item.children?.length}
              <SidebarDropdownWrapper label={item.name} class="pr-3">
                <svelte:fragment slot="icon">
                  <item.icon class={styles.icon} />
                </svelte:fragment>
                <svelte:fragment slot="arrowdown">
                  <AngleDownOutline strokeWidth="3.3" size="sm" />
                </svelte:fragment>
                <svelte:fragment slot="arrowup">
                  <AngleUpOutline strokeWidth="3.3" size="sm" />
                </svelte:fragment>
                {#each item.children as child}
                  <SidebarItem label={child.name} href={child.href} spanClass="ml-3" class={`${styles.item} pl-9`}>
                    <svelte:fragment slot="icon">
                      <child.icon class={styles.icon} />
                    </svelte:fragment>
                  </SidebarItem>
                {/each}
              </SidebarDropdownWrapper>
            {:else}
              <SidebarItem label={item.name} href={item.href} spanClass="ml-3" class={styles.item}>
                <svelte:fragment slot="icon">
                  <item.icon class={styles.icon} />
                </svelte:fragment>
              </SidebarItem>
            {/if}
          {/each}
          {#if showAdmin}
            <li class="my-2 border-t border-gray-200 dark:border-gray-700"></li>
            <SidebarDropdownWrapper label={adminItem.name} class="pr-3">
              <svelte:fragment slot="icon">
                <adminItem.icon class={styles.icon} />
              </svelte:fragment>
              <svelte:fragment slot="arrowdown">
                <AngleDownOutline strokeWidth="3.3" size="sm" />
              </svelte:fragment>
              <svelte:fragment slot="arrowup">
                <AngleUpOutline strokeWidth="3.3" size="sm" />
              </svelte:fragment>
              {#each adminItem.children ?? [] as child}
                <SidebarItem label={child.name} href={child.href} spanClass="ml-3" class={`${styles.item} pl-9`}>
                  <svelte:fragment slot="icon">
                    <child.icon class={styles.icon} />
                  </svelte:fragment>
                </SidebarItem>
              {/each}
            </SidebarDropdownWrapper>
          {/if}
        </SidebarGroup>
      </nav>
      {#if version}
        <div class="py-3 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 italic text-center">v{version}</p>
        </div>
      {/if}
    </div>
  </SidebarWrapper>
</Sidebar>

<div hidden={drawerHidden} class="fixed inset-0 z-20 bg-gray-900/50 dark:bg-gray-900/60 lg:hidden" onclick={handleDrawerClose} onkeydown={handleDrawerClose} role="presentation"></div>
