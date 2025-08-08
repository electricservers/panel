<script>
  // @ts-nocheck
  import UserMenu from '../../routes/utils/widgets/UserMenu.svelte';
  import { Avatar, Button, DarkMode, NavBrand, NavHamburger, Navbar, P, Dropdown, DropdownItem } from 'flowbite-svelte';
  import { steamStore } from '$lib/stores/steamStore';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { regionStore } from '$lib/stores/regionStore';
  import { ChevronDownOutline } from 'flowbite-svelte-icons';

  /** @type {{fluid?: boolean, drawerHidden?: boolean, list?: boolean}} */
  let { fluid = true, drawerHidden = $bindable(false), list = false } = $props();

  let loading = $state(true);
  let currentRegion = $state('ar');
  let regionDropOpen = $state(false);

  onMount(() => {
    const unsubscribe = steamStore.subscribe((value) => {
      if (value !== undefined) {
        loading = false;
      }
    });

    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      // persist for SSR
      try {
        document.cookie = `region=${r}; path=/; max-age=31536000; samesite=lax`;
      } catch {}
    });
    return () => {
      unsubscribe();
      unreg();
    };
  });
</script>

<Navbar {fluid} color="default" let:NavContainer>
    <NavContainer class="mb-px mt-px px-1" {fluid}>
      <NavHamburger onClick={() => (drawerHidden = !drawerHidden)} class="m-0 me-3 md:block lg:hidden" />
      <NavBrand href="/" class={list ? 'w-40' : 'lg:w-60'}>
        <img src="/images/favicon.png" class="me-2.5 h-6 sm:h-8" alt="Flowbite Logo" />
        <span class="ml-px self-center whitespace-nowrap text-xl font-semibold dark:text-white sm:text-2xl"> Electric Panel </span>
      </NavBrand>
      <!-- Region selector -->
      <div class="ms-auto flex items-center gap-2 text-gray-500 dark:text-gray-400 sm:order-2">
        <!-- Place the trigger button BEFORE the dropdown as a sibling (Flowbite expects previousElementSibling) -->
        <Button color="light" class="!py-1 !px-2" on:click={(e) => e.stopPropagation()}>
          <span class="fi fi-{currentRegion} mr-2"></span>
          {currentRegion === 'ar' ? 'Argentina' : 'Brasil'}
          <ChevronDownOutline class="ms-2 h-5 w-5" />
        </Button>
        <Dropdown trigger="click" placement="bottom-end" class="px-3 pb-3 text-sm" bind:open={regionDropOpen}>
          <DropdownItem on:click={() => { regionStore.set('ar'); regionDropOpen = false; }} class="flex items-center gap-2 text-base font-semibold">
            <span class="fi fi-ar"></span>
            Argentina
          </DropdownItem>
          <DropdownItem on:click={() => { regionStore.set('br'); regionDropOpen = false; }} class="flex items-center gap-2 text-base font-semibold">
            <span class="fi fi-br"></span>
            Brasil
          </DropdownItem>
        </Dropdown>
        <DarkMode />
        {#if loading}
          <div class="pulse mr-3 h-4 w-20 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
          <Avatar size="sm" class="pulse" />
        {:else if $steamStore}
          <P>{$steamStore.personaname ?? ''}</P>
          <UserMenu />
        {:else}
          <Button on:click={() => goto('/api/auth/login')}>Login with Steam</Button>
        {/if}
      </div>
    </NavContainer>
</Navbar>
