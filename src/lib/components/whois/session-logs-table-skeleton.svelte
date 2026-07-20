<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';

	let { rows = 6, showAccount = false }: { rows?: number; showAccount?: boolean } = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			{#if showAccount}
				<Table.Head>Account</Table.Head>
			{/if}
			<Table.Head>Name</Table.Head>
			<Table.Head>Action</Table.Head>
			<Table.Head>IP</Table.Head>
			<Table.Head>Server</Table.Head>
			<Table.Head class="text-right">When</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each Array.from({ length: rows }) as _, i (i)}
			<Table.Row>
				{#if showAccount}
					<Table.Cell><Skeleton class="h-4 w-28" /></Table.Cell>
				{/if}
				<Table.Cell><Skeleton class="h-4 w-24" /></Table.Cell>
				<Table.Cell><Skeleton class="h-4 w-16" /></Table.Cell>
				<Table.Cell><Skeleton class="h-4 w-20" /></Table.Cell>
				<Table.Cell><Skeleton class="h-4 w-24" /></Table.Cell>
				<Table.Cell class="text-right"><Skeleton class="ml-auto h-4 w-24" /></Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
