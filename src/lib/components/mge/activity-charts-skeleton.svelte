<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Activity</h3>
	<div class="flex flex-col gap-4">
		<div>
			<Skeleton class="mb-2 h-3 w-20" />
			<div class="flex h-16 items-end gap-1.5">
				{#each Array.from({ length: 7 }) as _, i (i)}
					<Skeleton class="w-full flex-1" style="height: {30 + ((i * 13) % 60)}%" />
				{/each}
			</div>
		</div>
		<div>
			<Skeleton class="mb-2 h-3 w-32" />
			<div class="flex h-12 items-end gap-0.5">
				{#each Array.from({ length: 24 }) as _, i (i)}
					<Skeleton class="flex-1" style="height: {20 + ((i * 7) % 70)}%" />
				{/each}
			</div>
		</div>
	</div>
</div>
