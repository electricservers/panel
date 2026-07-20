<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import type { RankRow } from '$lib/server/sources/mgemod/types';
	import type { Sourced } from '$lib/server/sources/types';

	let {
		rows,
		startRank = 1
	}: { rows: (Sourced<RankRow> & { avatarUrl?: string })[]; startRank?: number } = $props();
</script>

{#if rows.length === 0}
	<p class="py-8 text-center text-sm text-muted-foreground">No players found.</p>
{:else}
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
			{#each rows as row, i (row.steamid)}
				{@const steam = steamProfileUrl(row.steamid)}
				<Table.Row>
					<Table.Cell class="text-muted-foreground">{startRank + i}</Table.Cell>
					<Table.Cell>
						<div class="flex items-center gap-2 font-medium">
							<PlayerAvatar
								name={row.name}
								avatarUrl={row.avatarUrl}
								steamid={row.steamid}
								size="sm"
							/>
							{#if steam}
								<a
									href={steam}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-brand hover:underline">{row.name}</a
								>
							{:else}
								{row.name}
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="text-right font-medium">{row.rating}</Table.Cell>
					<Table.Cell class="text-right text-success">{row.wins}</Table.Cell>
					<Table.Cell class="text-right text-danger">{row.losses}</Table.Cell>
					<Table.Cell class="text-right text-muted-foreground">{row.totalGames}</Table.Cell>
					<Table.Cell class="text-right text-muted-foreground">{row.winRate.toFixed(1)}%</Table.Cell
					>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
