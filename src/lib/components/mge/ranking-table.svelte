<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import GlickoStatusBadge from '$lib/components/mge/glicko-status-badge.svelte';
	import { toSteamId64 } from '$lib/mge/steam-id';
	import { formatRd } from '$lib/mge/glicko';
	import type { RankRow } from '$lib/server/sources/mgemod/types';
	import type { Sourced } from '$lib/server/sources/types';

	let {
		rows,
		startRank = 1,
		glicko = false,
		showStatus = false
	}: {
		rows: (Sourced<RankRow> & { avatarUrl?: string })[];
		startRank?: number;
		glicko?: boolean;
		showStatus?: boolean;
	} = $props();
</script>

{#if rows.length === 0}
	<p class="text-muted-foreground py-8 text-center text-sm">No players found.</p>
{:else}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-10">#</Table.Head>
				<Table.Head>Player</Table.Head>
				<Table.Head class="text-right">Rating</Table.Head>
				{#if glicko}
					<Table.Head class="text-right">
						<Tooltip.Root>
							<Tooltip.Trigger class="cursor-help">RD</Tooltip.Trigger>
							<Tooltip.Content>
								Rating deviation. Lower is more certain. Ranked needs RD below 100 and at least 10
								games.
							</Tooltip.Content>
						</Tooltip.Root>
					</Table.Head>
				{/if}
				<Table.Head class="text-right">W</Table.Head>
				<Table.Head class="text-right">L</Table.Head>
				<Table.Head class="text-right">Games</Table.Head>
				<Table.Head class="text-right">Win rate</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as row, i (row.steamid)}
				<Table.Row>
					<Table.Cell class="text-muted-foreground">{startRank + i}</Table.Cell>
					<Table.Cell>
						<div class="flex items-center gap-2">
							<a
								href="/mge/players/{toSteamId64(row.steamid)}"
								class="hover:text-brand flex items-center gap-2 font-medium hover:underline"
							>
								<PlayerAvatar name={row.name} avatarUrl={row.avatarUrl} size="sm" />
								{row.name}
							</a>
							{#if showStatus}
								<GlickoStatusBadge status={row.status} />
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="text-right font-medium">{row.rating}</Table.Cell>
					{#if glicko}
						<Table.Cell class="text-muted-foreground text-right">{formatRd(row.rd)}</Table.Cell>
					{/if}
					<Table.Cell class="text-success text-right">{row.wins}</Table.Cell>
					<Table.Cell class="text-danger text-right">{row.losses}</Table.Cell>
					<Table.Cell class="text-muted-foreground text-right">{row.totalGames}</Table.Cell>
					<Table.Cell class="text-muted-foreground text-right">{row.winRate.toFixed(1)}%</Table.Cell
					>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
