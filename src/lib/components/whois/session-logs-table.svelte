<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { formatDateTime } from '$lib/format-date';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import type { WhoisSessionLog } from '$lib/server/sources/whois/types';

	let {
		logs,
		showAccount = false
	}: {
		logs: WhoisSessionLog[];
		showAccount?: boolean;
	} = $props();

	function actionVariant(action: string | null): 'default' | 'outline' | 'secondary' {
		if (action === 'connect' || action === 'connect-late') return 'default';
		if (action === 'namechange') return 'secondary';
		return 'outline';
	}
</script>

{#if logs.length === 0}
	<p class="py-8 text-center text-sm text-muted-foreground">No session logs found.</p>
{:else}
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
			{#each logs as log, i (i)}
				{@const steam = log.steamid ? steamProfileUrl(log.steamid) : null}
				<Table.Row>
					{#if showAccount}
						<Table.Cell class="text-muted-foreground">
							{#if steam}
								<a
									href={steam}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-brand hover:underline">{log.steamid}</a
								>
							{:else}
								{log.steamid}
							{/if}
						</Table.Cell>
					{/if}
					<Table.Cell class="font-medium text-foreground">
						{#if steam && log.name}
							<a
								href={steam}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-brand hover:underline">{log.name}</a
							>
						{:else}
							{log.name ?? '—'}
						{/if}
					</Table.Cell>
					<Table.Cell>
						{#if log.action}
							<Badge variant={actionVariant(log.action)}>{log.action}</Badge>
						{:else}
							—
						{/if}
					</Table.Cell>
					<Table.Cell class="text-muted-foreground">{log.ip ?? '—'}</Table.Cell>
					<Table.Cell class="text-muted-foreground"
						>{log.serverName ?? log.serverIp ?? '—'}</Table.Cell
					>
					<Table.Cell class="text-right text-muted-foreground"
						>{log.at ? formatDateTime(log.at) : '—'}</Table.Cell
					>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
