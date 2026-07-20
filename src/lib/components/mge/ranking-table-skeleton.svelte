<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { rows = 10 }: { rows?: number } = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-10">#</Table.Head>
			<Table.Head>Player</Table.Head>
			<Table.Head class="text-right">Rating</Table.Head>
			<Table.Head class="text-right">W</Table.Head>
			<Table.Head class="text-right">L</Table.Head>
			<Table.Head class="text-right">Games</Table.Head>
			<Table.Head class="text-right">Win rate</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each Array.from({ length: rows }) as _, i (i)}
			<Table.Row>
				<Table.Cell><Skeleton class="h-4 w-4" /></Table.Cell>
				<Table.Cell>
					<div class="flex items-center gap-2">
						<Skeleton class="size-6 rounded-full" />
						<Skeleton class="h-4 w-28" />
					</div>
				</Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-10" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-6" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-6" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-8" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-12" /></Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
