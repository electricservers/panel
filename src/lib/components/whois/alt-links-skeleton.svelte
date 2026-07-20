<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { groups = 3 }: { groups?: number } = $props();
</script>

<div class="flex flex-col gap-4">
	{#each Array.from({ length: groups }) as _, i (i)}
		<section class="flex flex-col gap-3 rounded-lg border border-border p-4">
			<Skeleton class="h-4 w-40" />
			<div class="flex flex-col gap-2">
				{#each Array.from({ length: 2 }) as _, j (j)}
					<Skeleton class="h-8 w-full" />
				{/each}
			</div>
		</section>
	{/each}
</div>
