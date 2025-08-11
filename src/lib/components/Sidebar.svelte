<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { Sidebar, SidebarDropdownWrapper, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte';
  import { AngleDownOutline, AngleUpOutline, ChartOutline, UsersGroupOutline } from 'flowbite-svelte-icons';
  import TrophyOutline from '$lib/components/icons/TrophyOutline.svelte';
  import { steamStore } from '$lib/stores/steamStore';

  // Types
  interface NavItem {
    name: string;
    icon: any;
    href: string;
    children?: NavItem[];
  }

  // Props with bindable
  let { drawerHidden = $bindable(false) } = $props();

  // Styles
  const styles = {
    icon: 'flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white',
    item: 'flex items-center p-2 text-base text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 group dark:text-gray-200 dark:hover:bg-gray-700',
    group: 'pt-2 space-y-2'
  };

  // Active sidebar tracking
  let activeMainSidebar: string = $state($page.url.pathname as unknown as string);

  // Navigation handlers
  afterNavigate((navigation) => {
    document.getElementById('svelte')?.scrollTo({ top: 0 });
    drawerHidden = true;
    activeMainSidebar = navigation.to?.url.pathname ?? '';
  });

  const handleDrawerClose = () => {
    drawerHidden = true;
  };

  // Navigation items
  const baseMgeChildren: NavItem[] = [
    { name: 'Leaderboard', href: '/mge/ranking', icon: TrophyOutline },
    { name: 'Games', href: '/mge/games', icon: ChartOutline }
  ];

  const whoisItem: NavItem = {
    name: 'Whois',
    icon: UsersGroupOutline,
    href: '/whois'
  };

  let mgeItem = $derived({
    name: 'MGE',
    icon: ChartOutline,
    href: '#',
    children: $steamStore
      ? [
          ...baseMgeChildren,
          {
            name: 'My stats',
            href: `/mge/games/${$steamStore.steamid}`,
            icon: UsersGroupOutline
          }
        ]
      : baseMgeChildren
  });

  let navigationItems = $derived([mgeItem, ...($steamStore?.role === 'admin' || $steamStore?.role === 'owner' ? [whoisItem] : [])]);
</script>

<Sidebar
  class={drawerHidden ? 'hidden' : ''}
  activeUrl={$page.url.pathname}
  activeClass="bg-gray-100 dark:bg-gray-700"
  asideClass="fixed inset-0 z-30 flex-none h-full w-64 lg:h-auto border-e border-gray-200 dark:border-gray-600 lg:overflow-y-visible lg:pt-16 lg:block">
  <SidebarWrapper divClass="overflow-y-auto px-3 pt-20 lg:pt-5 h-full bg-white scrolling-touch max-w-2xs lg:h-[calc(100vh-4rem)] lg:block dark:bg-gray-800 lg:me-0 lg:sticky top-2">
    <nav class="divide-y divide-gray-200 dark:divide-gray-700">
      <SidebarGroup ulClass={styles.group} class="mb-3">
        {#each navigationItems as item}
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
      </SidebarGroup>
    </nav>
  </SidebarWrapper>
</Sidebar>

<div hidden={drawerHidden} class="fixed inset-0 z-20 bg-gray-900/50 dark:bg-gray-900/60" onclick={handleDrawerClose} onkeydown={handleDrawerClose} role="presentation"></div>
