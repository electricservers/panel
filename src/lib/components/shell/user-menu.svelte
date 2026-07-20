<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import type { SessionUser } from '$lib/server/session';

	let { user }: { user: SessionUser } = $props();

	const initials = $derived((user.name ?? user.steamId).slice(0, 2).toUpperCase());
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
	>
		<Avatar class="size-6">
			{#if user.avatar}
				<AvatarImage src={user.avatar} alt={user.name ?? user.steamId} />
			{/if}
			<AvatarFallback class="text-xs">{initials}</AvatarFallback>
		</Avatar>
		<span class="hidden sm:inline">{user.name ?? user.steamId}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>{user.role}</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			{#snippet child({ props })}
				<a {...props} href="/api/auth/logout">Sign out</a>
			{/snippet}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
