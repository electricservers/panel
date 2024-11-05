<script>
    import '../app.pcss';
    import '/node_modules/flag-icons/css/flag-icons.min.css';
    import Navbar from '../lib/components/Navbar.svelte';
    import Sidebar from '../lib/components/Sidebar.svelte';
    let drawerHidden = $state(false);
    import { onMount } from 'svelte';
    import { steamStore } from '$lib/stores/steamStore';

    /** @type {{data: any, children?: import('svelte').Snippet}} */
    let { data, children } = $props();

    onMount(() => {
        if (data.user) {
            steamStore.set(data.user);
        }
    });
</script>

<header
    class="fixed top-0 z-40 mx-auto w-full flex-none border-b border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
    <Navbar bind:drawerHidden />
</header>
<div class="overflow-hidden lg:flex">
    <Sidebar bind:drawerHidden />
    <div class="relative h-full w-full overflow-y-auto pt-[70px] lg:ml-64">
        {@render children?.()}
    </div>
</div>
