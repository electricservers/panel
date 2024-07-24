<script>
    import UserMenu from '../routes/utils/widgets/UserMenu.svelte';
    import { DarkMode, NavBrand, NavHamburger, Navbar } from 'flowbite-svelte';
    import '../app.pcss';
    import Users from '../routes/data/users.json';

    export let fluid = true;
    export let drawerHidden = false;
    export let list = false;
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
            <UserMenu {...Users[4]} />
        </div>
    </NavContainer>
</Navbar>
