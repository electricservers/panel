<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
</script>

<div class="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
	<div class="flex items-center gap-2">
		<Skeleton class="h-9 w-9 shrink-0 rounded-full" />
		<div class="flex flex-col gap-1">
			<Skeleton class="h-4 w-28" />
			<Skeleton class="h-3 w-20" />
		</div>
	</div>

	<ul class="ml-4 flex flex-col gap-2 border-l border-border pl-4">
		{#each Array.from({ length: 2 }) as _, i (i)}
			<li class="relative flex flex-col gap-1.5">
				<span class="absolute top-3 -left-4 h-px w-4 bg-border"></span>
				<Skeleton class="h-3 w-24" />
				<ul class="mt-1 flex flex-col gap-1.5 border-l border-border pl-4">
					{#each Array.from({ length: 2 }) as _, j (j)}
						<li class="relative flex items-center gap-2 py-0.5">
							<span class="absolute top-4 -left-4 h-px w-4 bg-border"></span>
							<Skeleton class="h-6 w-6 shrink-0 rounded-full" />
							<Skeleton class="h-4 w-32" />
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</div>
