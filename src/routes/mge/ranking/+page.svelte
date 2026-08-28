<script lang="ts">
	import { page } from '$app/state';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import RankingTable from '$lib/components/mge/ranking-table.svelte';
	import RankingTableSkeleton from '$lib/components/mge/ranking-table-skeleton.svelte';

	let { data } = $props();

	function hrefWith(overrides: Record<string, string | number | undefined>): string {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined || value === '') params.delete(key);
			else params.set(key, String(value));
		}
		return `?${params.toString()}`;
	}

	function sortHref(key: string): string {
		const nextDir =
			data.filters.sortKey === key && data.filters.sortDir === 'desc' ? 'asc' : 'desc';
		return hrefWith({ sortKey: key, sortDir: nextDir, page: undefined });
	}

	const scopeHref = $derived({
		ranked: hrefWith({ scope: 'ranked', page: undefined }),
		all: hrefWith({ scope: 'all', page: undefined })
	});
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="font-heading text-2xl font-semibold tracking-tight">Ranking</h1>
		<form method="GET" class="flex gap-2">
			{#if data.filters.sortKey !== 'rating'}
				<input type="hidden" name="sortKey" value={data.filters.sortKey} />
			{/if}
			{#if data.filters.sortDir !== 'desc'}
				<input type="hidden" name="sortDir" value={data.filters.sortDir} />
			{/if}
			{#if data.filters.scope === 'all'}
				<input type="hidden" name="scope" value="all" />
			{/if}
			<Input type="search" name="q" placeholder="Search player" value={data.filters.q ?? ''} />
			<Button type="submit" variant="outline">Search</Button>
		</form>
	</div>

	{#await data.leaderboard}
		<div class="text-muted-foreground flex gap-3 text-sm">
			<span>Rating</span>
			<span>Wins</span>
			<span>Losses</span>
			<span>Games</span>
		</div>
		<div class="border-border overflow-hidden rounded-lg border">
			<RankingTableSkeleton rows={data.filters.pageSize} />
		</div>
	{:then leaderboard}
		{#if leaderboard.glicko}
			<div class="flex gap-1">
				<a
					href={scopeHref.ranked}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
					class:bg-muted={data.filters.scope === 'ranked'}
					class:text-foreground={data.filters.scope === 'ranked'}
					class:text-muted-foreground={data.filters.scope !== 'ranked'}
				>
					Ranked
				</a>
				<a
					href={scopeHref.all}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
					class:bg-muted={data.filters.scope === 'all'}
					class:text-foreground={data.filters.scope === 'all'}
					class:text-muted-foreground={data.filters.scope !== 'all'}
				>
					All
				</a>
			</div>
		{/if}

		<div class="text-muted-foreground flex flex-wrap gap-3 text-sm">
			<a href={sortHref('rating')} class="hover:text-brand">Rating</a>
			{#if leaderboard.glicko}
				<a href={sortHref('rd')} class="hover:text-brand">RD</a>
			{/if}
			<a href={sortHref('wins')} class="hover:text-brand">Wins</a>
			<a href={sortHref('losses')} class="hover:text-brand">Losses</a>
			<a href={sortHref('games')} class="hover:text-brand">Games</a>
		</div>

		<div class="border-border overflow-hidden rounded-lg border">
			{#if leaderboard.glicko && data.filters.scope === 'ranked' && leaderboard.items.length === 0 && !data.filters.q}
				<p class="text-muted-foreground px-4 py-8 text-center text-sm">
					Nobody has RD below 100 with at least 10 games yet.
					<a href={scopeHref.all} class="text-brand hover:underline">View all players</a>
				</p>
			{:else}
				<RankingTable
					rows={leaderboard.items}
					startRank={(data.filters.page - 1) * data.filters.pageSize + 1}
					glicko={leaderboard.glicko}
					showStatus={leaderboard.glicko && data.filters.scope === 'all'}
				/>
			{/if}
			<div class="border-border flex items-center justify-between border-t px-4 py-2 text-sm">
				<a
					href={hrefWith({ page: Math.max(1, data.filters.page - 1) })}
					class:pointer-events-none={data.filters.page <= 1}
					class:opacity-40={data.filters.page <= 1}
					class="text-brand hover:underline">Previous</a
				>
				<span class="text-muted-foreground">Page {data.filters.page}</span>
				<a
					href={hrefWith({ page: data.filters.page + 1 })}
					class:pointer-events-none={leaderboard.items.length < data.filters.pageSize}
					class:opacity-40={leaderboard.items.length < data.filters.pageSize}
					class="text-brand hover:underline">Next</a
				>
			</div>
		</div>
	{/await}
</div>
