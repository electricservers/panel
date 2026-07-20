<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { rows = 5 }: { rows?: number } = $props();
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Top foes</h3>
	<div class="flex flex-col gap-3">
		{#each Array.from({ length: rows }) as _, i (i)}
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded-full" />
				<Skeleton class="h-4 flex-1" />
				<Skeleton class="h-4 w-14" />
			</div>
		{/each}
	</div>
</div>
