<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { Source } from '$lib/server/sources/types';

	let { sources }: { sources: Source[] } = $props();

	const currentSourceId = $derived(
		(page.data.sourceId as string | undefined) ?? sources[0]?.id ?? undefined
	);
	const currentLabel = $derived(
		sources.find((source) => source.id === currentSourceId)?.label ?? 'Select source'
	);

	async function selectSource(sourceId: string) {
		if (!sourceId || sourceId === currentSourceId) return;
		const form = new FormData();
		form.set('source', sourceId);
		const res = await fetch('/api/source', { method: 'POST', body: form });
		if (!res.ok) return;
		await invalidateAll();
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
