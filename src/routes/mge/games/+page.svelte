<script lang="ts">
	import { page } from '$app/state';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DuelsTable from '$lib/components/mge/duels-table.svelte';
	import DuelsTableSkeleton from '$lib/components/mge/duels-table-skeleton.svelte';
	import { DATE_RANGE_PRESETS } from '$lib/mge/date-range';

	let { data } = $props();

	function hrefWith(overrides: Record<string, string | number | undefined>): string {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined || value === '') params.delete(key);
			else params.set(key, String(value));
		}
		return `?${params.toString()}`;
	}

	const selectClass = 'h-8 rounded-lg border border-input bg-transparent px-2 text-sm';
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Games</h1>

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<input type="hidden" name="source" value={data.sourceId} />
		<div class="flex flex-col gap-1">
			<label for="q" class="text-xs text-muted-foreground">Player</label>
			<Input
				id="q"
				type="search"
				name="q"
				placeholder="Name or SteamID"
				value={data.filters.q ?? ''}
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="arena" class="text-xs text-muted-foreground">Arena</label>
			<select id="arena" name="arena" class={selectClass}>
				<option value="" selected={!data.filters.arena}>Any</option>
				{#each data.arenas as arenaName (arenaName)}
					<option value={arenaName} selected={data.filters.arena === arenaName}>{arenaName}</option>
				{/each}
				{#if data.filters.arena && !data.arenas.includes(data.filters.arena)}
					<option value={data.filters.arena} selected>{data.filters.arena}</option>
				{/if}
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="outcome" class="text-xs text-muted-foreground">Outcome</label>
			<select id="outcome" name="outcome" class={selectClass}>
				<option value="" selected={!data.filters.outcome}>Any</option>
				<option value="win" selected={data.filters.outcome === 'win'}>Win</option>
				<option value="loss" selected={data.filters.outcome === 'loss'}>Loss</option>
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="from" class="text-xs text-muted-foreground">From</label>
			<Input id="from" type="date" name="from" value={data.filters.from ?? ''} />
		</div>
		<div class="flex flex-col gap-1">
			<label for="to" class="text-xs text-muted-foreground">To</label>
			<Input id="to" type="date" name="to" value={data.filters.to ?? ''} />
		</div>
		<Button type="submit" variant="outline">Apply</Button>
	</form>

	<div class="flex gap-2 text-sm text-muted-foreground">
		{#each DATE_RANGE_PRESETS as days (days)}
			<a
				href={hrefWith({ days, from: undefined, to: undefined, page: undefined })}
				class="hover:text-brand">Last {days}d</a
			>
		{/each}
		<a
			href={hrefWith({ days: undefined, from: undefined, to: undefined, page: undefined })}
			class="hover:text-brand">All time</a
		>
	</div>

	<div class="overflow-hidden rounded-lg border border-border">
		{#await data.games}
			<DuelsTableSkeleton rows={data.filters.pageSize} />
		{:then games}
			<DuelsTable duels={games.items} />
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
					class:pointer-events-none={games.items.length < data.filters.pageSize}
					class:opacity-40={games.items.length < data.filters.pageSize}
					class="text-brand hover:underline">Next</a
				>
			</div>
		{/await}
	</div>
</div>
