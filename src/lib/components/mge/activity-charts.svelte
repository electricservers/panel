<script lang="ts">
	import type { ActivitySummary } from '$lib/server/sources/mgemod/types';

	let { activity }: { activity: ActivitySummary } = $props();

	const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	/** Reindexes `byWeekday` (Sun=0..Sat=6) to Mon-first for display. */
	const weekday = $derived([1, 2, 3, 4, 5, 6, 0].map((day) => activity.byWeekday[day] ?? 0));
	const hour = $derived(activity.byHour);

	const weekdayMax = $derived(Math.max(1, ...weekday));
	const hourMax = $derived(Math.max(1, ...hour));
	const hasActivity = $derived(weekday.some((n) => n > 0) || hour.some((n) => n > 0));
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<h3 class="mb-3 text-sm font-medium">Activity</h3>
	{#if !hasActivity}
		<p class="text-sm text-muted-foreground">No games in this window.</p>
	{:else}
		<div class="flex flex-col gap-4">
			<div>
				<p class="mb-2 text-xs text-muted-foreground">By weekday</p>
				<div class="flex h-16 items-end gap-1.5">
					{#each weekday as count, i (i)}
						<div class="flex flex-1 flex-col items-center gap-1">
							<div
								class="w-full rounded-t-sm bg-brand"
								style="height: {(count / weekdayMax) * 100}%; min-height: {count > 0
									? '2px'
									: '0px'}"
								title="{WEEKDAY_LABELS[i]}: {count} games"
							></div>
							<span class="text-[10px] text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
						</div>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 text-xs text-muted-foreground">By hour (server time)</p>
				<div class="flex h-12 items-end gap-0.5">
					{#each hour as count, i (i)}
						<div
							class="flex-1 rounded-t-sm bg-brand/70"
							style="height: {(count / hourMax) * 100}%; min-height: {count > 0 ? '2px' : '0px'}"
							title="{i}:00 — {count} games"
						></div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
