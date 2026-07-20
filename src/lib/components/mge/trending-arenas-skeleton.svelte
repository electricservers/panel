<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { rows = 6 }: { rows?: number } = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-10">#</Table.Head>
			<Table.Head>Arena</Table.Head>
			<Table.Head class="text-right">Games</Table.Head>
			<Table.Head class="text-right">Share</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each Array.from({ length: rows }) as _, i (i)}
			<Table.Row>
				<Table.Cell><Skeleton class="h-4 w-4" /></Table.Cell>
				<Table.Cell><Skeleton class="h-4 w-28" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-10" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-10" /></Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
