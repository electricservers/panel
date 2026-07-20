<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import SourceError from '$lib/components/shell/source-error.svelte';
	import type { FanOutResult, Source } from '$lib/server/sources/types';

	let {
		presence,
		sources,
		steam64
	}: {
		presence: FanOutResult<boolean>[];
		sources: Source[];
		steam64: string;
	} = $props();

	function labelFor(sourceId: string): string {
		return sources.find((source) => source.id === sourceId)?.label ?? sourceId;
	}
</script>

{#if presence.length > 0}
	<div class="flex flex-wrap items-center gap-1.5">
		<span class="text-xs text-muted-foreground">Also on:</span>
		{#each presence as result (result.sourceId)}
			{#if result.ok && result.data}
				<a href="/mge/players/{steam64}?source={result.sourceId}">
					<Badge variant="outline">{labelFor(result.sourceId)}</Badge>
				</a>
			{:else if !result.ok}
				<SourceError
					sourceLabel={labelFor(result.sourceId)}
					variant="badge"
					detail={result.error}
				/>
			{/if}
		{/each}
	</div>
{/if}
