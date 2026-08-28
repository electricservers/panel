<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { glickoStatusLabel, type GlickoStatus } from '$lib/mge/glicko';

	let {
		status,
		class: className
	}: {
		status: GlickoStatus;
		class?: string;
	} = $props();

	const label = $derived(glickoStatusLabel(status));
	const variant = $derived(
		status === 'ranked' ? 'default' : status === 'provisional' ? 'secondary' : 'outline'
	);
</script>

{#if label}
	<Badge {variant} class={className}>{label}</Badge>
{/if}
