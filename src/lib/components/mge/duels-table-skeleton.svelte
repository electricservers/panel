<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { rows = 8 }: { rows?: number } = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>Winner</Table.Head>
			<Table.Head>Loser</Table.Head>
			<Table.Head>Arena</Table.Head>
			<Table.Head class="text-right">Score</Table.Head>
			<Table.Head class="text-right">When</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each Array.from({ length: rows }) as _, i (i)}
			<Table.Row>
				<Table.Cell>
					<div class="flex items-center gap-2">
						<Skeleton class="size-6 rounded-full" />
						<Skeleton class="h-4 w-24" />
					</div>
				</Table.Cell>
				<Table.Cell>
					<div class="flex items-center gap-2">
						<Skeleton class="size-6 rounded-full" />
						<Skeleton class="h-4 w-24" />
					</div>
				</Table.Cell>
				<Table.Cell><Skeleton class="h-4 w-32" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-10" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-24" /></Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
