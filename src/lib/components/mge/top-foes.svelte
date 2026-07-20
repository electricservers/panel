<script lang="ts">
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { steamProfileUrl, toSteamId64 } from '$lib/mge/steam-id';
	import type { FoeRow } from '$lib/server/sources/mgemod/types';

	let {
		foes,
		sourceId,
		perspective
	}: {
		foes: (FoeRow & { avatarUrl?: string })[];
		sourceId: string;
		/** Steam64 of the profile owner, so the record links to head-to-head. */
		perspective: string;
	} = $props();
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Top foes</h3>
	{#if foes.length === 0}
		<p class="text-sm text-muted-foreground">No opponents in this window.</p>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each foes as foe (foe.steamid)}
				{@const steam = steamProfileUrl(foe.steamid)}
				<li class="flex items-center gap-3">
					<PlayerAvatar name={foe.name} avatarUrl={foe.avatarUrl} steamid={foe.steamid} size="sm" />
					{#if steam}
						<a
							href={steam}
							target="_blank"
							rel="noopener noreferrer"
							class="flex-1 truncate text-sm font-medium hover:text-brand hover:underline"
						>
							{foe.name}
						</a>
					{:else}
						<span class="flex-1 truncate text-sm font-medium">{foe.name}</span>
					{/if}
					<a
						href="/mge/players/{perspective}/versus/{toSteamId64(foe.steamid)}?source={sourceId}"
						class="text-xs text-muted-foreground hover:text-brand"
						title="Head to head"
					>
						<span class="text-success">{foe.wins}W</span>
						·
						<span class="text-danger">{foe.losses}L</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
