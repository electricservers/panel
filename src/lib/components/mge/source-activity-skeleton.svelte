<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
</script>

<div class="grid grid-cols-3 gap-3">
	{#each Array.from({ length: 3 }) as _, i (i)}
		<div class="rounded-lg border border-border bg-card p-3">
			<Skeleton class="h-3 w-16" />
			<Skeleton class="mt-2 h-7 w-12" />
		</div>
	{/each}
</div>
<div class="mt-4 rounded-lg border border-border bg-card p-4">
	<Skeleton class="mb-2 h-3 w-40" />
	<div class="flex h-24 items-end gap-0.5">
		{#each Array.from({ length: 24 }) as _, i (i)}
			<Skeleton class="flex-1" style="height: {20 + ((i * 7) % 80)}%" />
		{/each}
	</div>
</div>
