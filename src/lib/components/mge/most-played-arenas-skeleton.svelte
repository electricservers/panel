<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { rows = 5 }: { rows?: number } = $props();
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Most-played arenas</h3>
	<div class="flex flex-col gap-3">
		{#each Array.from({ length: rows }) as _, i (i)}
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between">
					<Skeleton class="h-4 w-28" />
					<Skeleton class="h-4 w-14" />
				</div>
				<Skeleton class="h-1.5 w-full rounded-full" />
			</div>
		{/each}
	</div>
</div>
