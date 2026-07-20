<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import OutcomeBadge from '$lib/components/mge/outcome-badge.svelte';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { formatDateTime } from '$lib/format-date';
	import { steamProfileUrl, toSteamId2 } from '$lib/mge/steam-id';
	import type { DuelWithAvatars } from '$lib/server/duel-avatars';

	let {
		duels,
		perspective
	}: {
		duels: DuelWithAvatars[];
		perspective?: string;
	} = $props();

	const perspectiveId2 = $derived(perspective ? toSteamId2(perspective) : undefined);

	function steamHref(steamid2: string): string | null {
		return steamProfileUrl(steamid2);
	}

	function outcomeFor(duel: DuelWithAvatars): 'win' | 'loss' | null {
		if (!perspectiveId2) return null;
		if (duel.winner === perspectiveId2) return 'win';
		if (duel.loser === perspectiveId2) return 'loss';
		return null;
	}
</script>

{#if duels.length === 0}
	<p class="py-8 text-center text-sm text-muted-foreground">No games found.</p>
{:else}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				{#if perspectiveId2}
					<Table.Head class="w-14">Result</Table.Head>
				{/if}
				<Table.Head>Winner</Table.Head>
				<Table.Head>Loser</Table.Head>
				<Table.Head>Arena</Table.Head>
				<Table.Head class="text-right">Score</Table.Head>
				<Table.Head class="text-right">When</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each duels as duel (duel.id + duel.sourceId)}
				{@const winnerSteam = steamHref(duel.winner)}
				{@const loserSteam = steamHref(duel.loser)}
				<Table.Row>
					{#if perspectiveId2}
						<Table.Cell>
							{#if outcomeFor(duel)}
								<OutcomeBadge outcome={outcomeFor(duel)!} />
							{/if}
						</Table.Cell>
					{/if}
					<Table.Cell>
						<div class="flex items-center gap-2 font-medium text-foreground">
							<PlayerAvatar
								name={duel.winnerName}
								avatarUrl={duel.winnerAvatarUrl}
								steamid={duel.winner}
								size="sm"
							/>
							{#if winnerSteam}
								<a
									href={winnerSteam}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-brand hover:underline">{duel.winnerName}</a
								>
							{:else}
								{duel.winnerName}
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell>
						<div class="flex items-center gap-2">
							<PlayerAvatar
								name={duel.loserName}
								avatarUrl={duel.loserAvatarUrl}
								steamid={duel.loser}
								size="sm"
							/>
							{#if loserSteam}
								<a
									href={loserSteam}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-brand hover:underline">{duel.loserName}</a
								>
							{:else}
								{duel.loserName}
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="text-muted-foreground">{duel.arenaNameCanonical || '—'}</Table.Cell>
					<Table.Cell class="text-right text-muted-foreground">
						{duel.winnerScore ?? '?'}&ndash;{duel.loserScore ?? '?'}
					</Table.Cell>
					<Table.Cell class="text-right text-muted-foreground"
						>{formatDateTime(duel.endedAt)}</Table.Cell
					>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
