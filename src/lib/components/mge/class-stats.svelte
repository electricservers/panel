<script lang="ts">
	import { classDisplayName } from '$lib/mge/tf2-classes';
	import type { ClassStatRow } from '$lib/server/sources/mgemod/types';

	let { classes }: { classes: ClassStatRow[] } = $props();

	const maxMatches = $derived(Math.max(1, ...classes.map((row) => row.matches)));
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Classes played</h3>
	{#if classes.length === 0}
		<p class="text-sm text-muted-foreground">No class data in this window.</p>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each classes as row (row.classId)}
				<li class="flex flex-col gap-1">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">{classDisplayName(row.classId)}</span>
						<span class="text-muted-foreground">{row.matches} games</span>
					</div>
					<div class="flex h-1.5 overflow-hidden rounded-full bg-muted">
						<div class="bg-success" style="width: {(row.wins / maxMatches) * 100}%"></div>
						<div class="bg-danger" style="width: {(row.losses / maxMatches) * 100}%"></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
