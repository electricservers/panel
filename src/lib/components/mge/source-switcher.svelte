<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { Source } from '$lib/server/sources/types';

	let { sources }: { sources: Source[] } = $props();

	const STORAGE_KEY = 'mge:sourceId';

	const currentSourceId = $derived(
		page.url.searchParams.get('source') ?? sources[0]?.id ?? undefined
	);
	const currentLabel = $derived(
		sources.find((source) => source.id === currentSourceId)?.label ?? 'Select source'
	);

	function selectSource(sourceId: string) {
		try {
			localStorage.setItem(STORAGE_KEY, sourceId);
		} catch {
			// localStorage may be unavailable (privacy mode); URL param is still authoritative.
		}
		const url = new URL(page.url);
		url.searchParams.set('source', sourceId);
		goto(url, { keepFocus: true, noScroll: true, invalidateAll: true });
	}
</script>

{#if sources.length > 0}
	<Select.Root type="single" value={currentSourceId} onValueChange={selectSource}>
		<Select.Trigger size="sm" class="w-full">
			{currentLabel}
		</Select.Trigger>
		<Select.Content>
			{#each sources as source (source.id)}
				<Select.Item value={source.id} label={source.label} />
			{/each}
		</Select.Content>
	</Select.Root>
{/if}
