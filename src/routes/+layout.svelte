<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/shell/app-sidebar.svelte';
	import ModeToggle from '$lib/components/shell/mode-toggle.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<title>{data.settings.siteName}</title>
	{#if data.settings.siteDescription}
		<meta name="description" content={data.settings.siteDescription} />
	{/if}
	{#if data.settings.hasFavicon}
		<link rel="icon" href="/favicon.ico?v={data.settings.faviconUpdatedAt}" />
	{:else}
		<link rel="icon" href={favicon} />
	{/if}
</svelte:head>

<ModeWatcher defaultMode="dark" />

<Sidebar.Provider>
	<AppSidebar
		user={data.user}
		sources={data.sources}
		moduleToggles={data.moduleToggles}
		siteName={data.settings.siteName}
	/>
	<Sidebar.Inset class="min-w-0 overflow-x-hidden">
		<header class="flex h-12 items-center justify-between gap-2 border-b px-3">
			<Sidebar.Trigger />
			<ModeToggle />
		</header>
		<div class="flex min-w-0 flex-1 flex-col overflow-x-hidden px-4 py-8">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
