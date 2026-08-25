<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
	const DAYS = [0, 1, 2, 3, 4, 5, 6];
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<div class="mb-3 flex items-baseline justify-between">
		<h3 class="text-sm font-medium">Activity</h3>
		<Skeleton class="h-3 w-28" />
	</div>
	<div class="mb-4 grid grid-cols-3 gap-3">
		{#each ['a', 'b', 'c'] as slot (slot)}
			<div>
				<Skeleton class="mb-1 h-3 w-16" />
				<Skeleton class="h-4 w-24" />
			</div>
		{/each}
	</div>
	<div class="grid gap-px" style="grid-template-columns: 2.25rem repeat(24, minmax(0, 1fr));">
		<div></div>
		{#each HOURS as hour (hour)}
			<Skeleton class="mb-1 h-2 w-full" />
		{/each}
		{#each DAYS as day (day)}
			<Skeleton class="h-3 w-6" />
			{#each HOURS as hour (`${day}-${hour}`)}
				<Skeleton class="h-4 w-full" />
			{/each}
		{/each}
	</div>
</div>
