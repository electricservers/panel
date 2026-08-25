<script lang="ts">
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { toSteamId64 } from '$lib/mge/steam-id';
	import type { FoeRow } from '$lib/server/sources/mgemod/types';

	let {
		foes,
		perspective
	}: {
		foes: (FoeRow & { avatarUrl?: string })[];
		/** Steam64 of the profile owner, so links point at the head-to-head page. */
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
				<li>
					<a
						href="/mge/players/{perspective}/versus/{toSteamId64(foe.steamid)}"
						class="flex items-center gap-3 hover:text-brand"
					>
						<PlayerAvatar name={foe.name} avatarUrl={foe.avatarUrl} size="sm" />
						<span class="flex-1 truncate text-sm font-medium">{foe.name}</span>
						<span class="text-xs text-muted-foreground">
							<span class="text-success">{foe.wins}W</span>
							·
							<span class="text-danger">{foe.losses}L</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
