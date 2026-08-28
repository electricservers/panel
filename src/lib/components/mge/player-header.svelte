<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import GlickoStatusBadge from '$lib/components/mge/glicko-status-badge.svelte';
	import { steamProfileUrl, toSteamId64 } from '$lib/mge/steam-id';
	import { formatRd, unrankedReason } from '$lib/mge/glicko';
	import type { PlayerSummary } from '$lib/server/sources/mgemod/types';
	import type { Sourced } from '$lib/server/sources/types';

	let {
		player,
		avatarUrl,
		presence,
		viewerSteam64
	}: {
		player: Sourced<PlayerSummary> | null;
		avatarUrl?: string;
		presence?: Snippet;
		viewerSteam64?: string | null;
	} = $props();

	const totalGames = $derived(player ? player.wins + player.losses : 0);
	const winRate = $derived(
		player && totalGames > 0 ? ((player.wins / totalGames) * 100).toFixed(1) : '0.0'
	);
	const steamHref = $derived(player ? steamProfileUrl(player.steamid) : null);
	const profile64 = $derived.by(() => {
		if (!player) return null;
		try {
			return toSteamId64(player.steamid);
		} catch {
			return null;
		}
	});
	const vsHref = $derived.by(() => {
		if (!profile64) return null;
		if (viewerSteam64 && viewerSteam64 === profile64) return null;
		if (viewerSteam64) {
			return `/mge/players/${profile64}/versus/${viewerSteam64}`;
		}
		const returnTo = `/mge/players/${profile64}/versus/me`;
		return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
	});
	const glicko = $derived(player != null && player.status !== 'elo');
	const reason = $derived(player ? unrankedReason(player.rd, totalGames) : null);
	const ratingMark = $derived(player?.status === 'provisional' ? '?' : '');
</script>

{#if !player}
	<div class="rounded-lg border border-border bg-card p-6">
		<p class="text-sm text-muted-foreground">
			This player has no MGE stats on the selected source yet.
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
		<div
			class="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left"
		>
			<PlayerAvatar
				name={player.name}
				{avatarUrl}
				steamid={player.steamid}
				size="xl"
				class="ring-2 ring-brand/50 ring-offset-2 ring-offset-card"
			/>
			<div class="flex flex-1 flex-col items-center gap-2 sm:items-start">
				<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
					{#if steamHref}
						<a
							href={steamHref}
							target="_blank"
							rel="noopener noreferrer"
							class="font-heading text-3xl font-semibold tracking-tight hover:text-brand hover:underline"
						>
							{player.name}
						</a>
					{:else}
						<h1 class="font-heading text-3xl font-semibold tracking-tight">{player.name}</h1>
					{/if}
					{#if glicko}
						<GlickoStatusBadge status={player.status} />
					{/if}
					{#if player.rank != null}
						<span
							class="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand"
						>
							Rank #{player.rank}
							<span class="ml-1 font-normal text-brand/70">
								/ {glicko ? player.totalRanked : player.totalPlayers}
							</span>
						</span>
					{/if}
				</div>
				<div
					class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm sm:justify-start"
				>
					<span>
						<span class="font-medium">{player.rating}{ratingMark}</span> rating
					</span>
					{#if glicko}
						<span class="text-muted-foreground">
							<span class="font-medium text-foreground">{formatRd(player.rd)}</span> RD
						</span>
					{/if}
					<span class="text-success"><span class="font-medium">{player.wins}</span> wins</span>
					<span class="text-danger"><span class="font-medium">{player.losses}</span> losses</span>
					<span class="text-muted-foreground">{winRate}% win rate</span>
				</div>
				{#if glicko && player.rank === null}
					<p class="text-xs text-muted-foreground">
						Not on the public leaderboard{reason ? ` (${reason})` : ''}. #{player.rawRank} of {player.totalPlayers}
						by raw rating.
					</p>
				{:else if glicko}
					<p class="text-xs text-muted-foreground">
						#{player.rawRank} of {player.totalPlayers} by raw rating.
					</p>
				{/if}
				{#if vsHref}
					<Button href={vsHref} variant="outline" size="sm">See my stats vs this player</Button>
				{/if}
			</div>
		</div>
		{#if presence}
			{@render presence()}
		{/if}
	</div>
{/if}
