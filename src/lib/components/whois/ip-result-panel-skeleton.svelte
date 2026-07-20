<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import SessionLogsTableSkeleton from './session-logs-table-skeleton.svelte';

	let { label }: { label: string } = $props();
</script>

<section class="flex flex-col gap-3 rounded-lg border border-border p-4">
	<h2 class="text-sm font-medium">{label}</h2>

	<ul class="flex flex-col gap-2">
		{#each Array.from({ length: 3 }) as _, i (i)}
			<li class="flex items-center justify-between gap-2">
				<Skeleton class="h-4 w-32" />
				<Skeleton class="h-4 w-24" />
			</li>
		{/each}
	</ul>

	<div class="overflow-hidden rounded-lg border border-border">
		<SessionLogsTableSkeleton rows={5} showAccount />
	</div>
</section>
