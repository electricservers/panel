<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
</script>

<div class="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
	<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
		<div class="flex items-center gap-3 md:justify-end">
			<Skeleton class="h-4 w-24" />
			<Skeleton class="size-10 rounded-full" />
		</div>
		<div class="flex flex-col items-center gap-2">
			<Skeleton class="h-3 w-20" />
			<Skeleton class="h-8 w-16" />
			<Skeleton class="h-3 w-32" />
		</div>
		<div class="flex items-center gap-3">
			<Skeleton class="size-10 rounded-full" />
			<Skeleton class="h-4 w-24" />
		</div>
	</div>

	<Skeleton class="h-4 w-full rounded-full" />

	<div class="flex flex-col gap-2">
		<Skeleton class="h-3 w-32" />
		{#each Array.from({ length: 3 }) as _, i (i)}
			<Skeleton class="h-5 w-full rounded-full" />
		{/each}
	</div>
</div>
