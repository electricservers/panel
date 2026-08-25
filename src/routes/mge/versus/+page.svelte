<script lang="ts">
	import { page } from '$app/state';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DuelsTable from '$lib/components/mge/duels-table.svelte';
	import VersusSummary from '$lib/components/mge/versus-summary.svelte';
	import VersusSummarySkeleton from '$lib/components/mge/versus-summary-skeleton.svelte';

	let { data } = $props();

	function hrefWith(overrides: Record<string, string | number | undefined>): string {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined || value === '') params.delete(key);
			else params.set(key, String(value));
		}
		return `?${params.toString()}`;
	}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-4">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Versus</h1>
	<p class="text-sm text-muted-foreground">
		Compare two players head-to-head on the selected source. Enter a SteamID (Steam2, Steam3, or
		Steam64) or a Steam profile URL for each player.
	</p>

	<div class="rounded-lg border border-border bg-card p-4">
		<form method="GET" class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
			<div class="flex flex-col gap-1">
				<label for="a" class="text-xs text-muted-foreground">Player A</label>
				<Input
					id="a"
					type="text"
					name="a"
					placeholder="SteamID or profile URL"
					value={data.aInput}
				/>
			</div>
			<div class="hidden items-center justify-center pb-2 text-sm text-muted-foreground md:flex">
				vs
			</div>
			<div class="flex flex-col gap-1">
				<label for="b" class="text-xs text-muted-foreground">Player B</label>
				<Input
					id="b"
					type="text"
					name="b"
					placeholder="SteamID or profile URL"
					value={data.bInput}
				/>
			</div>
			<Button type="submit" variant="outline">Compare</Button>
		</form>

		{#if data.invalidInput}
			<p class="mt-3 text-sm text-danger">Couldn't recognize one of those SteamIDs.</p>
		{/if}
	</div>

	{#if data.versus}
		{#await data.versus}
			<VersusSummarySkeleton />
		{:then versus}
			{#if !versus.a.exists || !versus.b.exists}
				<p class="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
					{#if !versus.a.exists && !versus.b.exists}
						Neither player exists on this source.
					{:else if !versus.a.exists}
						Player A does not exist on this source.
					{:else}
						Player B does not exist on this source.
					{/if}
				</p>
			{:else if !versus.summary}
				<p class="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
					These players exist but have not played each other on this source.
				</p>
			{:else}
				<VersusSummary
					a={versus.a}
					b={versus.b}
					summary={versus.summary}
					perspective={data.user?.steamId === versus.a.steam64 ||
					data.user?.steamId === versus.b.steam64
						? data.user?.steamId
						: undefined}
				/>
				<div class="overflow-hidden rounded-lg border border-border">
					<DuelsTable
						duels={versus.games}
						perspective={data.user?.steamId === versus.a.steam64 ||
						data.user?.steamId === versus.b.steam64
							? data.user?.steamId
							: undefined}
					/>
					<div class="flex items-center justify-between border-t border-border px-4 py-2 text-sm">
						<a
							href={hrefWith({ page: Math.max(1, data.page - 1) })}
							class:pointer-events-none={data.page <= 1}
							class:opacity-40={data.page <= 1}
							class="text-brand hover:underline">Previous</a
						>
						<span class="text-muted-foreground">Page {data.page}</span>
						<a
							href={hrefWith({ page: data.page + 1 })}
							class:pointer-events-none={versus.games.length < data.pageSize}
							class:opacity-40={versus.games.length < data.pageSize}
							class="text-brand hover:underline">Next</a
						>
					</div>
				</div>
			{/if}
		{/await}
	{/if}
</div>
