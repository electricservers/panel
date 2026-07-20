<script lang="ts">
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import { steamProfileUrl } from '$lib/mge/steam-id';

	let {
		name,
		avatarUrl,
		steamid,
		size = 'default',
		class: className
	}: {
		name: string;
		avatarUrl?: string;
		/** When set, the avatar links to the player's Steam Community profile. */
		steamid?: string;
		size?: 'sm' | 'default' | 'lg' | 'xl';
		class?: string;
	} = $props();

	const initials = $derived((name || '?').slice(0, 2).toUpperCase());
	const href = $derived(steamid ? steamProfileUrl(steamid) : null);
</script>

{#snippet avatar()}
	<Avatar {size} class={className}>
		{#if avatarUrl}
			<AvatarImage src={avatarUrl} alt={name} />
		{/if}
		<AvatarFallback class="text-xs">{initials}</AvatarFallback>
	</Avatar>
{/snippet}

{#if href}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		title="Open Steam profile"
	>
		{@render avatar()}
	</a>
{:else}
	{@render avatar()}
{/if}
