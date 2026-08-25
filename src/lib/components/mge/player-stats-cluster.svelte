<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { TIMEZONE_COOKIE } from '$lib/mge/activity';
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
	import type { ActivitySummary } from '$lib/mge/activity';
	import type {
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
		steam64
	}: {
		initialArenas: Promise<ArenaStatRow[]>;
		initialActivity: Promise<ActivitySummary>;
		initialFoes: Promise<(FoeRow & { avatarUrl?: string })[]>;
		initialClassStats: Promise<ClassStatRow[]>;
		initialRatingHistory: Promise<RatingHistory>;
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

	function viewerTimeZone(): string {
		if (!browser) return 'UTC';
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		} catch {
			return 'UTC';
		}
	}

	function persistTimeZone(tz: string) {
		document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)};path=/;max-age=31536000;samesite=lax`;
	}

	function fetchCluster(days: number | undefined, tz: string): Promise<StatsCluster> {
		const params = new URLSearchParams({ tz });
		if (days) params.set('days', String(days));
		return fetch(`/mge/players/${steam64}/stats?${params}`).then((res) => res.json());
	}

	let statsDays = $state<number | undefined>(undefined);
	let statsOverride = $state<Promise<StatsCluster> | null>(null);
	let activityOverlay = $state<ActivitySummary | null>(null);
	const stats = $derived(statsOverride ?? combineInitial());

	function selectStatsDays(days: number | undefined) {
		statsDays = days;
		activityOverlay = null;
		statsOverride = fetchCluster(days, viewerTimeZone());
	}

	onMount(() => {
		const tz = viewerTimeZone();
		persistTimeZone(tz);
		if (statsOverride) return;
		void combineInitial().then((cluster) => {
			if (statsOverride) return;
			if (cluster.activity.timeZone === tz) return;
			return fetchCluster(statsDays, tz).then((next) => {
				if (statsOverride) return;
				activityOverlay = next.activity;
			});
		});
	});
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
		<ActivityChartsSkeleton />
		<div class="grid gap-3 md:grid-cols-2">
			<MostPlayedArenasSkeleton />
			<ClassStatsSkeleton />
			<TopFoesSkeleton />
		</div>
	{:then s}
		<RatingChart history={s.ratingHistory} />
		<ActivityCharts activity={activityOverlay ?? s.activity} />
		<div class="grid gap-3 md:grid-cols-2">
			<MostPlayedArenas arenas={s.mostPlayedArenas} />
			<ClassStats classes={s.classStats} />
			<TopFoes foes={s.topFoes} perspective={steam64} />
		</div>
	{/await}
</section>
