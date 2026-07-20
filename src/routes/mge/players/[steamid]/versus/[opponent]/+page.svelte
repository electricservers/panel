<script lang="ts">
	import { page } from '$app/state';
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
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Head-to-head</h1>
	<p class="text-sm text-muted-foreground">
		<a href="/mge/players/{data.a}" class="hover:text-brand hover:underline">{data.a}</a>
		vs
		<a href="/mge/players/{data.b}" class="hover:text-brand hover:underline">{data.b}</a>
	</p>

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
			<VersusSummary a={versus.a} b={versus.b} summary={versus.summary} />
			<div class="overflow-hidden rounded-lg border border-border">
				<DuelsTable duels={versus.games} />
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
</div>
