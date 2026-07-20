<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';

	let { outcome }: { outcome: 'win' | 'loss' } = $props();
</script>

{#if outcome === 'win'}
	<Badge variant="outline" class="border-success/40 text-success">W</Badge>
{:else}
	<Badge variant="outline" class="border-danger/40 text-danger">L</Badge>
{/if}
