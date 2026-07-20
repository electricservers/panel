<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import SessionLogsTableSkeleton from './session-logs-table-skeleton.svelte';
	import AltNetworkTreeSkeleton from './alt-network-tree-skeleton.svelte';

	let { label }: { label: string } = $props();
</script>

<section class="flex flex-col gap-3 rounded-lg border border-border p-4">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-medium">{label}</h2>
		<Skeleton class="h-5 w-16" />
	</div>

	<div class="flex items-center gap-3">
		<Skeleton class="h-8 w-8 shrink-0 rounded-full" />
		<div class="flex flex-col gap-1">
			<Skeleton class="h-4 w-28" />
			<Skeleton class="h-3 w-36" />
		</div>
	</div>

	<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
		{#each Array.from({ length: 4 }) as _, i (i)}
			<div>
				<Skeleton class="h-3 w-16" />
				<Skeleton class="mt-1 h-4 w-10" />
			</div>
		{/each}
	</dl>

	<AltNetworkTreeSkeleton />

	<div class="overflow-hidden rounded-lg border border-border">
		<SessionLogsTableSkeleton rows={5} />
	</div>
</section>
