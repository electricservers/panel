<script lang="ts">
  import '../app.pcss';
  import '/node_modules/flag-icons/css/flag-icons.min.css';
  import Navbar from '../lib/components/Navbar.svelte';
  import Sidebar from '../lib/components/Sidebar.svelte';
  let drawerHidden = $state(true);
  import { onMount } from 'svelte';
  import { steamStore } from '$lib/stores/steamStore';
  import { siteSettingsStore, loadSiteSettings } from '$lib/stores/siteSettingsStore';

  interface Props {
    data: any;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  onMount(() => {
    if (data.user) {
      steamStore.set(data.user);
    }
    // Load site settings
    loadSiteSettings();
  });

  // Update favicon when settings change
  $effect(() => {
    if (typeof window !== 'undefined' && $siteSettingsStore?.faviconPath) {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (link) {
        link.href = $siteSettingsStore.faviconPath;
      }
    }
  });

  // Update page title when settings change
  $effect(() => {
    if (typeof window !== 'undefined' && $siteSettingsStore?.siteName) {
      document.title = $siteSettingsStore.siteName;
    }
  });
</script>

<header class="fixed top-0 z-40 mx-auto w-full flex-none border-b border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
  <Navbar bind:drawerHidden />
</header>
<div class="overflow-hidden lg:flex">
  <Sidebar bind:drawerHidden />
  <div class="relative h-full w-full overflow-y-auto pt-[70px] lg:ml-64">
    {@render children?.()}
  </div>
</div>
