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
			<p class="text-muted-foreground text-sm">
				An owner can re-enable it from <code class="bg-muted rounded px-1 py-0.5"
					>/admin/settings</code
				>.
			</p>
		</section>
	{:else if !data.leaderboard || !data.recentGames}
		<section class="flex flex-col gap-3">
			<h2 class="text-sm font-medium">No source configured</h2>
			<p class="text-muted-foreground text-sm">
				Add a <code class="bg-muted rounded px-1 py-0.5">mgemod</code>-capable source from
				<code class="bg-muted rounded px-1 py-0.5">/admin/sources</code> to see rankings and games here.
			</p>
		</section>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<div class="flex flex-col gap-6 lg:col-span-8">
				<section class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-medium">Recent games</h2>
						<a href="/mge/games" class="text-brand text-sm hover:underline">Browse all games</a>
					</div>
					<div class="border-border overflow-hidden rounded-lg border">
						{#await data.recentGames}
							<DuelsTableSkeleton rows={5} />
						{:then recentGames}
							<DuelsTable duels={recentGames.items} />
						{/await}
					</div>
				</section>

				{#if data.sourceActivity}
					{#key data.sourceId}
						<SourceActivity initialActivity={data.sourceActivity} />
					{/key}
				{/if}
			</div>

			<div class="flex flex-col gap-6 lg:col-span-4">
				<section class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-medium">Top players</h2>
						<a href="/mge/ranking" class="text-brand text-sm hover:underline">View full ranking</a>
					</div>
					<div class="border-border overflow-hidden rounded-lg border">
						{#await data.leaderboard}
							<RankingTableSkeleton rows={5} />
						{:then leaderboard}
							{#if leaderboard.glicko && leaderboard.items.length === 0}
								<p class="text-muted-foreground px-4 py-8 text-center text-sm">
									No ranked players yet.
									<a href="/mge/ranking?scope=all" class="text-brand hover:underline"
										>View all players</a
									>
								</p>
							{:else}
								<RankingTable rows={leaderboard.items} glicko={leaderboard.glicko} />
							{/if}
						{/await}
					</div>
				</section>

				{#if data.trendingArenas}
					{#key data.sourceId}
						<TrendingArenas initialArenas={data.trendingArenas} />
					{/key}
				{/if}
			</div>
		</div>
	{/if}
</div>
