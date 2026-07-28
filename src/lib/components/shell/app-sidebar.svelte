<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import UserMenu from '$lib/components/shell/user-menu.svelte';
	import SourceSwitcher from '$lib/components/mge/source-switcher.svelte';
	import type { SessionUser } from '$lib/server/session';
	import type { Source, Capability } from '$lib/server/sources/types';
	import type { ModuleToggle } from '$lib/server/db/module-toggles';

	let {
		user,
		sources,
		moduleToggles,
		siteName
	}: {
		user: SessionUser | null;
		sources: Source[];
		moduleToggles: ModuleToggle[];
		siteName: string;
	} = $props();

	const mgeSources = $derived(sources.filter((source) => source.capabilities.includes('mgemod')));

	function isEnabled(capability: Capability): boolean {
		return moduleToggles.find((toggle) => toggle.capability === capability)?.enabled ?? true;
	}

	const mgeEnabled = $derived(isEnabled('mgemod'));
	const whoisEnabled = $derived(isEnabled('whois'));

	const playerLinks = $derived(
		mgeEnabled
			? [
					{ href: '/', label: 'Home' },
					{ href: '/mge/ranking', label: 'Ranking' },
					{ href: '/mge/games', label: 'Games' },
					{ href: '/mge/versus', label: 'Versus' },
					...(user ? [{ href: '/mge/me', label: 'My profile' }] : [])
				]
			: [{ href: '/', label: 'Home' }]
	);

	const staffLinks = $derived.by(() => {
		const links: { href: string; label: string }[] = [];
		if (whoisEnabled) {
			links.push({ href: '/whois', label: 'Search' }, { href: '/whois/alt', label: 'Alt links' });
		}
		links.push({ href: '/voice', label: 'Voice' });
		return links;
	});

	const isStaff = $derived(user?.role === 'admin' || user?.role === 'owner');
	const isOwner = $derived(user?.role === 'owner');

	const adminLinks = [
		{ href: '/admin/sources', label: 'Sources' },
		{ href: '/admin/users', label: 'Users' },
		{ href: '/admin/settings', label: 'Settings' }
	];

	function isActive(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}

	const brandLabel = $derived.by(() => {
		const trimmed = siteName.trim();
		const words = trimmed.split(/\s+/).filter(Boolean);
		const lastWord = words.at(-1);
		if (lastWord && lastWord.toLowerCase() === 'panel') {
			return {
				kind: 'split' as const,
				prefix: words.slice(0, -1).join(' '),
				accent: lastWord
			};
		}
		return { kind: 'plain' as const, name: trimmed };
	});

	const initials = $derived.by(() => {
		const words = siteName.trim().split(/\s+/).filter(Boolean);
		if (words.length === 0) return '';
		if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
		return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
	});
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<a href="/" class="flex items-center gap-2 px-2 py-1">
			<span
				class="font-heading text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden"
			>
				{#if brandLabel.kind === 'split'}
					{#if brandLabel.prefix}{brandLabel.prefix}
					{/if}<span class="text-brand">{brandLabel.accent}</span>
				{:else}
					{brandLabel.name}
				{/if}
			</span>
			<span
				class="hidden font-heading text-base font-semibold group-data-[collapsible=icon]:inline"
			>
				{#if initials.length >= 2}
					{initials[0]}<span class="text-brand">{initials[1]}</span>
				{:else}
					{initials}
				{/if}
			</span>
		</a>
		{#if mgeSources.length > 0}
			<div class="px-2 pt-1 group-data-[collapsible=icon]:hidden">
				<SourceSwitcher sources={mgeSources} />
			</div>
		{/if}
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Player</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each playerLinks as link (link.href)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={isActive(link.href)} tooltipContent={link.label}>
								{#snippet child({ props })}
									<a {...props} href={link.href}>{link.label}</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		{#if isStaff}
			<Sidebar.Group>
				<Sidebar.GroupLabel>Staff</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each staffLinks as link (link.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(link.href)} tooltipContent={link.label}>
									{#snippet child({ props })}
										<a {...props} href={link.href}>{link.label}</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}

		{#if isOwner}
			<Sidebar.Group>
				<Sidebar.GroupLabel>Admin</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each adminLinks as link (link.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(link.href)} tooltipContent={link.label}>
									{#snippet child({ props })}
										<a {...props} href={link.href}>{link.label}</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>

	<Sidebar.Footer>
		{#if user}
			<UserMenu {user} />
		{:else}
			<Button href="/api/auth/login" variant="outline" size="sm" class="w-full">
				Sign in with Steam
			</Button>
		{/if}
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
