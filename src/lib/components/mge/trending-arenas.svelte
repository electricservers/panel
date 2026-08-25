<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import TrendingArenasSkeleton from './trending-arenas-skeleton.svelte';
	import type { TrendingArenaRow } from '$lib/server/sources/mgemod/types';

	let { initialArenas }: { initialArenas: Promise<TrendingArenaRow[]> } = $props();

	const DAY_CHIPS = [
		{ label: '7d', days: 7 },
		{ label: '14d', days: 14 },
		{ label: '30d', days: 30 },
		{ label: '90d', days: 90 }
	] as const;

	let statsDays = $state<number>(7);
	let arenasOverride = $state<Promise<TrendingArenaRow[]> | null>(null);
	const arenas = $derived(arenasOverride ?? initialArenas);

	function selectDays(days: number) {
		statsDays = days;
		const params = new URLSearchParams({ days: String(days) });
		arenasOverride = fetch(`/mge/trending-arenas?${params}`).then((res) => res.json());
	}
</script>

<section class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-medium">Trending arenas</h2>
		<div class="flex gap-1">
			{#each DAY_CHIPS as chip (chip.label)}
				<button
					type="button"
					onclick={() => selectDays(chip.days)}
					class="rounded-md px-2 py-1 text-xs transition-colors"
					class:bg-muted={statsDays === chip.days}
					class:text-foreground={statsDays === chip.days}
					class:text-muted-foreground={statsDays !== chip.days}
				>
					{chip.label}
				</button>
			{/each}
		</div>
	</div>
	<div class="overflow-hidden rounded-lg border border-border">
		{#await arenas}
			<TrendingArenasSkeleton />
		{:then rows}
			{#if rows.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">No games in this window.</p>
			{:else}
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
						{#each rows as row, i (row.arena)}
							<Table.Row>
								<Table.Cell class="text-muted-foreground">{i + 1}</Table.Cell>
								<Table.Cell class="font-medium">{row.arena}</Table.Cell>
								<Table.Cell class="text-right">{row.matches}</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground"
									>{(row.share * 100).toFixed(0)}%</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		{/await}
	</div>
</section>
