<script lang="ts">
	import type { ArenaStatRow } from '$lib/server/sources/mgemod/types';

	let { arenas }: { arenas: ArenaStatRow[] } = $props();

	const maxMatches = $derived(Math.max(1, ...arenas.map((row) => row.matches)));
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Most-played arenas</h3>
	{#if arenas.length === 0}
		<p class="text-sm text-muted-foreground">No games in this window.</p>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each arenas as row (row.arena)}
				<li class="flex flex-col gap-1">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">{row.arena}</span>
						<span class="text-muted-foreground">{row.matches} games</span>
					</div>
					<div class="flex h-1.5 overflow-hidden rounded-full bg-muted">
						<div class="bg-success" style="width: {(row.wins / maxMatches) * 100}%"></div>
						<div class="bg-danger" style="width: {(row.losses / maxMatches) * 100}%"></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
