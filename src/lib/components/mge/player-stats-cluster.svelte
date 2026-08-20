<script lang="ts">
	import MostPlayedArenas from './most-played-arenas.svelte';
	import MostPlayedArenasSkeleton from './most-played-arenas-skeleton.svelte';
	import ActivityCharts from './activity-charts.svelte';
	import ActivityChartsSkeleton from './activity-charts-skeleton.svelte';
	import TopFoes from './top-foes.svelte';
	import TopFoesSkeleton from './top-foes-skeleton.svelte';
	import ClassStats from './class-stats.svelte';
	import ClassStatsSkeleton from './class-stats-skeleton.svelte';
	import RatingChart from './rating-chart.svelte';
	import RatingChartSkeleton from './rating-chart-skeleton.svelte';
	import type {
		ActivitySummary,
		ArenaStatRow,
		ClassStatRow,
		FoeRow,
		RatingHistory
	} from '$lib/server/sources/mgemod/types';

	type StatsCluster = {
		mostPlayedArenas: ArenaStatRow[];
		activity: ActivitySummary;
		topFoes: (FoeRow & { avatarUrl?: string })[];
		classStats: ClassStatRow[];
		ratingHistory: RatingHistory;
	};

	let {
		initialArenas,
		initialActivity,
		initialFoes,
		initialClassStats,
		initialRatingHistory,
		sourceId,
		steam64
	}: {
		initialArenas: Promise<ArenaStatRow[]>;
		initialActivity: Promise<ActivitySummary>;
		initialFoes: Promise<(FoeRow & { avatarUrl?: string })[]>;
		initialClassStats: Promise<ClassStatRow[]>;
		initialRatingHistory: Promise<RatingHistory>;
		sourceId: string;
		steam64: string;
	} = $props();

	const DAY_CHIPS = [
		{ label: '7d', days: 7 },
		{ label: '30d', days: 30 },
		{ label: '90d', days: 90 },
		{ label: 'All', days: undefined }
	] as const;

	function combineInitial(): Promise<StatsCluster> {
		return Promise.all([
			initialArenas,
			initialActivity,
			initialFoes,
			initialClassStats,
			initialRatingHistory
		]).then(([mostPlayedArenas, activity, topFoes, classStats, ratingHistory]) => ({
			mostPlayedArenas,
			activity,
			topFoes,
			classStats,
			ratingHistory
		}));
	}

	let statsDays = $state<number | undefined>(undefined);
	let statsOverride = $state<Promise<StatsCluster> | null>(null);
	const stats = $derived(statsOverride ?? combineInitial());

	function selectStatsDays(days: number | undefined) {
		statsDays = days;
		const params = new URLSearchParams({ source: sourceId });
		if (days) params.set('days', String(days));
		statsOverride = fetch(`/mge/players/${steam64}/stats?${params}`).then((res) => res.json());
	}
</script>

<section class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-medium">Player stats</h2>
		<div class="flex gap-1">
			{#each DAY_CHIPS as chip (chip.label)}
				<button
					type="button"
					onclick={() => selectStatsDays(chip.days)}
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
	{#await stats}
		<RatingChartSkeleton />
		<div class="grid gap-3 md:grid-cols-2">
			<MostPlayedArenasSkeleton />
			<ClassStatsSkeleton />
			<ActivityChartsSkeleton />
			<TopFoesSkeleton />
		</div>
	{:then s}
		<RatingChart history={s.ratingHistory} />
		<div class="grid gap-3 md:grid-cols-2">
			<MostPlayedArenas arenas={s.mostPlayedArenas} />
			<ClassStats classes={s.classStats} />
			<ActivityCharts activity={s.activity} />
			<TopFoes foes={s.topFoes} {sourceId} perspective={steam64} />
		</div>
	{/await}
</section>
