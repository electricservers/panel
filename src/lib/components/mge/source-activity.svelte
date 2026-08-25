<script lang="ts">
	import SourceActivitySkeleton from './source-activity-skeleton.svelte';
	import type { SourceActivity } from '$lib/server/sources/mgemod/types';

	let { initialActivity }: { initialActivity: Promise<SourceActivity> } = $props();

	const DAY_CHIPS = [
		{ label: '1d', days: 1 },
		{ label: '7d', days: 7 },
		{ label: '30d', days: 30 },
		{ label: '90d', days: 90 }
	] as const;

	let statsDays = $state<number>(7);
	let activityOverride = $state<Promise<SourceActivity> | null>(null);
	const activity = $derived(activityOverride ?? initialActivity);

	function selectDays(days: number) {
		statsDays = days;
		const params = new URLSearchParams({ days: String(days) });
		activityOverride = fetch(`/mge/source-stats?${params}`).then((res) => res.json());
	}

	const MAX_AXIS_LABELS = 8;

	function formatAxisLabel(label: string, granularity: SourceActivity['granularity']): string {
		if (granularity === 'hour') return label.slice(0, 2);
		const date = new Date(`${label}T00:00:00Z`);
		return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
	}
</script>

<section class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-medium">Source activity</h2>
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
	{#await activity}
		<SourceActivitySkeleton />
	{:then stats}
		<div class="grid grid-cols-3 gap-3">
			<div class="rounded-lg border border-border bg-card p-3">
				<p class="text-xs text-muted-foreground">Games</p>
				<p class="text-2xl font-semibold">{stats.games.toLocaleString()}</p>
			</div>
			<div class="rounded-lg border border-border bg-card p-3">
				<p class="text-xs text-muted-foreground">Active players</p>
				<p class="text-2xl font-semibold">{stats.activePlayers.toLocaleString()}</p>
			</div>
			<div class="rounded-lg border border-border bg-card p-3">
				<p class="text-xs text-muted-foreground">Arenas played</p>
				<p class="text-2xl font-semibold">{stats.arenasPlayed.toLocaleString()}</p>
			</div>
		</div>
		<div class="rounded-lg border border-border bg-card p-4">
			{#if stats.games === 0}
				<p class="text-sm text-muted-foreground">No games in this window.</p>
			{:else}
				{@const max = Math.max(1, ...stats.series.map((point) => point.count))}
				{@const axisStep = Math.max(1, Math.ceil(stats.series.length / MAX_AXIS_LABELS))}
				<p class="mb-2 text-xs text-muted-foreground">
					Games over time ({stats.granularity === 'hour' ? 'by hour, server time' : 'by day'})
				</p>
				<div class="flex h-24 items-end gap-0.5">
					{#each stats.series as point (point.label)}
						<div
							class="flex-1 rounded-t-sm bg-brand"
							style="height: {(point.count / max) * 100}%; min-height: {point.count > 0
								? '2px'
								: '0px'}"
							title="{point.label} — {point.count} games"
						></div>
					{/each}
				</div>
				<div class="mt-1 flex gap-0.5">
					{#each stats.series as point, i (point.label)}
						<div class="flex-1 text-center text-[10px] text-muted-foreground">
							{#if i % axisStep === 0 || i === stats.series.length - 1}
								{formatAxisLabel(point.label, stats.granularity)}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/await}
</section>
