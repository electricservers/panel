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
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="font-heading text-2xl font-semibold tracking-tight">Ranking</h1>
		<form method="GET" class="flex gap-2">
			<Input type="search" name="q" placeholder="Search player" value={data.filters.q ?? ''} />
			<Button type="submit" variant="outline">Search</Button>
		</form>
	</div>

	<div class="flex gap-3 text-sm text-muted-foreground">
		<a href={sortHref('rating')} class="hover:text-brand">Rating</a>
		<a href={sortHref('wins')} class="hover:text-brand">Wins</a>
		<a href={sortHref('losses')} class="hover:text-brand">Losses</a>
		<a href={sortHref('games')} class="hover:text-brand">Games</a>
	</div>

	<div class="overflow-hidden rounded-lg border border-border">
		{#await data.leaderboard}
			<RankingTableSkeleton rows={data.filters.pageSize} />
		{:then leaderboard}
			<RankingTable
				rows={leaderboard.items}
				startRank={(data.filters.page - 1) * data.filters.pageSize + 1}
			/>
			<div class="flex items-center justify-between border-t border-border px-4 py-2 text-sm">
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
		{/await}
	</div>
</div>
