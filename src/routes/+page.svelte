<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import RankingTable from '$lib/components/mge/ranking-table.svelte';
	import RankingTableSkeleton from '$lib/components/mge/ranking-table-skeleton.svelte';
	import DuelsTable from '$lib/components/mge/duels-table.svelte';
	import DuelsTableSkeleton from '$lib/components/mge/duels-table-skeleton.svelte';
	import TrendingArenas from '$lib/components/mge/trending-arenas.svelte';
	import SourceActivity from '$lib/components/mge/source-activity.svelte';

	let { data } = $props();
</script>

<div class="flex flex-1 flex-col gap-8">
	<section class="flex flex-col gap-3">
		<h1 class="font-heading text-3xl font-semibold tracking-tight">{data.settings.siteName}</h1>
		{#if !data.user}
			<Button href="/api/auth/login" class="w-fit">Sign in with Steam</Button>
		{/if}
	</section>

	{#if !data.mgeEnabled}
		<section class="flex flex-col gap-3">
			<h2 class="text-sm font-medium">MGE module is disabled</h2>
			<p class="text-sm text-muted-foreground">
				An owner can re-enable it from <code class="rounded bg-muted px-1 py-0.5"
					>/admin/settings</code
				>.
			</p>
		</section>
	{:else if !data.leaderboard || !data.recentGames}
		<section class="flex flex-col gap-3">
			<h2 class="text-sm font-medium">No source configured</h2>
			<p class="text-sm text-muted-foreground">
				Add a <code class="rounded bg-muted px-1 py-0.5">mgemod</code>-capable source from
				<code class="rounded bg-muted px-1 py-0.5">/admin/sources</code> to see rankings and games here.
			</p>
		</section>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<div class="flex flex-col gap-6 lg:col-span-8">
				<section class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-medium">Recent games</h2>
						<a href="/mge/games?source={data.sourceId}" class="text-sm text-brand hover:underline"
							>Browse all games</a
						>
					</div>
					<div class="overflow-hidden rounded-lg border border-border">
						{#await data.recentGames}
							<DuelsTableSkeleton rows={5} />
						{:then recentGames}
							<DuelsTable duels={recentGames.items} />
						{/await}
					</div>
				</section>

				{#if data.sourceActivity}
					{#key data.sourceId}
						<SourceActivity initialActivity={data.sourceActivity} sourceId={data.sourceId} />
					{/key}
				{/if}
			</div>

			<div class="flex flex-col gap-6 lg:col-span-4">
				<section class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-medium">Top players</h2>
						<a href="/mge/ranking?source={data.sourceId}" class="text-sm text-brand hover:underline"
							>View full ranking</a
						>
					</div>
					<div class="overflow-hidden rounded-lg border border-border">
						{#await data.leaderboard}
							<RankingTableSkeleton rows={5} />
						{:then leaderboard}
							<RankingTable rows={leaderboard.items} />
						{/await}
					</div>
				</section>

				{#if data.trendingArenas}
					{#key data.sourceId}
						<TrendingArenas initialArenas={data.trendingArenas} sourceId={data.sourceId} />
					{/key}
				{/if}
			</div>
		</div>
	{/if}
</div>
