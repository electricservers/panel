<script>
    import UserMenu from '../../routes/utils/widgets/UserMenu.svelte';
    import { Avatar, Button, DarkMode, NavBrand, NavHamburger, Navbar, P } from 'flowbite-svelte';
    import { steamStore } from '$lib/stores/steamStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    export let fluid = true;
    export let drawerHidden = false;
    export let list = false;

    let loading = true;

    onMount(() => {
        const unsubscribe = steamStore.subscribe((value) => {
            if (value !== undefined) {
                loading = false;
            }
        });

        return unsubscribe;
    });
</script>

<Navbar {fluid} class="text-black" color="default" let:NavContainer>
    <NavContainer class="mb-px mt-px px-1" {fluid}>
        <NavHamburger
            onClick={() => (drawerHidden = !drawerHidden)}
            class="m-0 me-3 md:block lg:hidden" />
        <NavBrand href="/" class={list ? 'w-40' : 'lg:w-60'}>
            <img src="/images/favicon.png" class="me-2.5 h-6 sm:h-8" alt="Flowbite Logo" />
            <span
                class="ml-px self-center whitespace-nowrap text-xl font-semibold dark:text-white sm:text-2xl">
                Electric Panel
            </span>
        </NavBrand>
        <div class="ms-auto flex items-center text-gray-500 dark:text-gray-400 sm:order-2">
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
