<script lang="ts" module>
	const WEEKDAY_FULL = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday'
	];
	const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
	const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

	function padHour(hour: number): string {
		return `${String(hour).padStart(2, '0')}:00`;
	}

	function tzLabel(timeZone: string): string {
		if (timeZone === 'UTC') return 'UTC';
		const leaf = timeZone.split('/').pop() ?? timeZone;
		return leaf.replaceAll('_', ' ');
	}

	function formatDurationMin(min: number): string {
		const rounded = Math.max(1, Math.round(min));
		if (rounded < 60) return `~${rounded} min`;
		const hours = Math.floor(rounded / 60);
		const minutes = rounded % 60;
		return minutes ? `~${hours}h ${minutes}m` : `~${hours}h`;
	}

	function formatGameCount(count: number): string {
		const rounded = Math.max(1, Math.round(count));
		return `${rounded} game${rounded === 1 ? '' : 's'}`;
	}
</script>

<script lang="ts">
	import type { ActivitySummary } from '$lib/mge/activity';

	let { activity }: { activity: ActivitySummary } = $props();

	const maxCell = $derived(Math.max(1, ...activity.byWeekdayHour.flatMap((row) => row)));

	type HeatCell = { weekday: number; hour: number; count: number };
	let hover = $state<HeatCell | null>(null);

	const typicalLabel = $derived.by(() => {
		if (!activity.typicalHours) return null;
		return `${padHour(activity.typicalHours.start)}–${padHour(activity.typicalHours.end)}`;
	});

	const sessionLabel = $derived.by(() => {
		const parts: string[] = [];
		if (activity.sessions.medianDurationMin != null) {
			parts.push(formatDurationMin(activity.sessions.medianDurationMin));
		}
		if (activity.sessions.medianGames != null) {
			parts.push(formatGameCount(activity.sessions.medianGames));
		}
		return parts.length > 0 ? parts.join(' · ') : null;
	});

	const peakWeekdayLabel = $derived(
		activity.peakWeekday == null ? null : (WEEKDAY_FULL[activity.peakWeekday] ?? null)
	);

	function cellCount(weekday: number, hour: number): number {
		return activity.byWeekdayHour[weekday]?.[hour] ?? 0;
	}

	function cellFill(count: number): string {
		if (count <= 0) return 'var(--muted)';
		const t = 0.22 + 0.78 * (count / maxCell);
		return `color-mix(in oklab, var(--brand) ${Math.round(t * 100)}%, transparent)`;
	}
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
		<h3 class="text-sm font-medium">Activity</h3>
		<p class="text-xs text-muted-foreground">Hours in {tzLabel(activity.timeZone)}</p>
	</div>
	{#if activity.games === 0}
		<p class="text-sm text-muted-foreground">No games in this window.</p>
	{:else}
		<div class="mb-4 grid grid-cols-3 gap-3">
			<div>
				<p class="text-xs text-muted-foreground">Busiest day</p>
				<p class="text-sm font-medium">{peakWeekdayLabel ?? '—'}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Usually on</p>
				<p class="text-sm font-medium">{typicalLabel ?? '—'}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Typical session</p>
				<p class="text-sm font-medium">{sessionLabel ?? '—'}</p>
			</div>
		</div>
		<div class="overflow-x-auto">
			<div
				class="relative grid min-w-[36rem] gap-px"
				style="grid-template-columns: 2.25rem repeat(24, minmax(0, 1fr));"
			>
				<div></div>
				{#each HOURS as hour (hour)}
					<div class="pb-1 text-center text-[10px] text-muted-foreground">
						{hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
					</div>
				{/each}
				{#each MON_FIRST as weekday (weekday)}
					<div class="pr-1 text-[10px] leading-4 text-muted-foreground">
						{WEEKDAY_SHORT[weekday]}
					</div>
					{#each HOURS as hour (`${weekday}-${hour}`)}
						{@const count = cellCount(weekday, hour)}
						<button
							type="button"
							class="h-4 w-full rounded-[2px]"
							class:ring-1={activity.peakWeekday === weekday && activity.peakHour === hour}
							class:ring-success={activity.peakWeekday === weekday && activity.peakHour === hour}
							style:background-color={cellFill(count)}
							aria-label="{WEEKDAY_FULL[weekday]} {padHour(hour)}, {count} games"
							onpointerenter={() => (hover = { weekday, hour, count })}
							onpointerleave={() => (hover = null)}
							onfocus={() => (hover = { weekday, hour, count })}
							onblur={() => (hover = null)}
						></button>
					{/each}
				{/each}
			</div>
		</div>
		{#if hover}
			<p class="mt-2 text-xs text-muted-foreground">
				<span class="font-medium text-foreground"
					>{WEEKDAY_FULL[hover.weekday]} {padHour(hover.hour)}</span
				>
				· {hover.count} game{hover.count === 1 ? '' : 's'}
				· {Math.round((hover.count / activity.games) * 100)}%
			</p>
		{:else}
			<p class="mt-2 text-xs text-muted-foreground">
				Hover a square for that hour. Peak is outlined.
			</p>
		{/if}
	{/if}
</div>
