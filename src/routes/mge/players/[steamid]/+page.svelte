<script lang="ts">
	import PlayerHeader from '$lib/components/mge/player-header.svelte';
	import PlayerHeaderSkeleton from '$lib/components/mge/player-header-skeleton.svelte';
	import PresenceBadges from '$lib/components/mge/presence-badges.svelte';
	import DuelsTable from '$lib/components/mge/duels-table.svelte';
	import DuelsTableSkeleton from '$lib/components/mge/duels-table-skeleton.svelte';
	import PlayerStatsCluster from '$lib/components/mge/player-stats-cluster.svelte';

	let { data } = $props();
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
	{#await data.player}
		<PlayerHeaderSkeleton />
	{:then player}
		<PlayerHeader {player} avatarUrl={player?.avatarUrl} viewerSteam64={data.user?.steamId}>
			{#snippet presence()}
				{#await data.presence then presence}
					<PresenceBadges {presence} sources={data.sources} steam64={data.steam64} />
				{/await}
			{/snippet}
		</PlayerHeader>
	{/await}

	{#key `${data.sourceId}:${data.steam64}`}
		<PlayerStatsCluster
			initialArenas={data.mostPlayedArenas}
			initialActivity={data.activity}
			initialFoes={data.topFoes}
			initialClassStats={data.classStats}
			initialRatingHistory={data.ratingHistory}
			steam64={data.steam64}
		/>
	{/key}

	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-medium">Recent games</h2>
			<a href="/mge/games?q={data.steam64}" class="text-sm text-brand hover:underline"
				>View all games</a
			>
		</div>
		<div class="overflow-hidden rounded-lg border border-border">
			{#await data.games}
				<DuelsTableSkeleton rows={10} />
			{:then games}
				<DuelsTable duels={games.items} perspective={data.steam64} />
			{/await}
		</div>
	</section>
</div>
