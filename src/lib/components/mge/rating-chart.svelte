<script lang="ts" module>
	function niceTicks(min: number, max: number, count: number): number[] {
		if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
		if (min === max) {
			const pad = min === 0 ? 1 : Math.max(1, Math.round(Math.abs(min) * 0.02));
			return [min - pad, min, min + pad];
		}
		const span = max - min;
		const raw = span / Math.max(1, count - 1);
		const mag = Math.pow(10, Math.floor(Math.log10(raw)));
		const residual = raw / mag;
		const step = residual <= 1 ? mag : residual <= 2 ? 2 * mag : residual <= 5 ? 5 * mag : 10 * mag;
		const niceMin = Math.floor(min / step) * step;
		const niceMax = Math.ceil(max / step) * step;
		const ticks: number[] = [];
		for (let value = niceMin; value <= niceMax + step / 2; value += step) {
			ticks.push(Math.round(value));
		}
		return ticks;
	}

	function formatAxisDate(date: Date): string {
		const dd = String(date.getDate()).padStart(2, '0');
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}`;
	}

	function pointerToViewBoxX(event: PointerEvent, svg: SVGSVGElement): number | null {
		const ctm = svg.getScreenCTM();
		if (!ctm) return null;
		const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
		return cursor.x;
	}
</script>

<script lang="ts">
	import { formatDate, formatDateTime } from '$lib/format-date';
	import type { RatingHistory } from '$lib/server/sources/mgemod/types';

	let { history }: { history: RatingHistory } = $props();

	function asDate(value: Date | string): Date {
		return value instanceof Date ? value : new Date(value);
	}

	const series = $derived(
		history.series.map((point) => ({ at: asDate(point.at), rating: point.rating }))
	);
	const peak = $derived(
		history.peak ? { at: asDate(history.peak.at), rating: history.peak.rating } : null
	);

	const WIDTH = 720;
	const HEIGHT = 240;
	const PAD_L = 52;
	const PAD_R = 16;
	const PAD_T = 16;
	const PAD_B = 32;
	const INNER_W = WIDTH - PAD_L - PAD_R;
	const INNER_H = HEIGHT - PAD_T - PAD_B;
	const X_TICKS = 6;
	const DOT_LIMIT = 60;

	type Plotted = { at: Date; rating: number; x: number; y: number };

	let hover = $state<Plotted | null>(null);

	const plot = $derived.by(() => {
		if (series.length === 0) return null;
		const ratings = series.map((point) => point.rating);
		const dataMin = Math.min(...ratings);
		const dataMax = Math.max(...ratings);
		const yTicks = niceTicks(dataMin, dataMax, 6);
		const min = yTicks[0];
		const max = yTicks[yTicks.length - 1];
		if (min == null || max == null || max === min) return null;

		const times = series.map((point) => point.at.getTime());
		const t0 = Math.min(...times);
		const t1 = Math.max(...times);
		const tSpan = Math.max(1, t1 - t0);
		const xOf = (at: Date) => PAD_L + ((at.getTime() - t0) / tSpan) * INNER_W;
		const yOf = (rating: number) => PAD_T + ((max - rating) / (max - min)) * INNER_H;

		const plotted: Plotted[] = series.map((point) => ({
			...point,
			x: xOf(point.at),
			y: yOf(point.rating)
		}));
		const firstPlotted = plotted[0];
		if (!firstPlotted) return null;

		const d = plotted
			.map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
			.join(' ');

		const tickCount = Math.min(X_TICKS, Math.max(2, plotted.length));
		const xTicks: { at: Date; x: number; label: string }[] = [];
		for (let i = 0; i < tickCount; i++) {
			const at = new Date(t0 + (i / Math.max(1, tickCount - 1)) * tSpan);
			xTicks.push({ at, x: xOf(at), label: formatAxisDate(at) });
		}

		const peakPlotted = plotted.reduce(
			(best, point) => (point.rating > best.rating ? point : best),
			firstPlotted
		);

		return { min, max, yTicks, xTicks, d, plotted, peakPlotted };
	});

	function onPointerMove(event: PointerEvent) {
		if (!plot) return;
		const svg = event.currentTarget as SVGSVGElement;
		const x = pointerToViewBoxX(event, svg);
		if (x == null) return;
		let nearest = plot.plotted[0];
		if (!nearest) return;
		let best = Math.abs(nearest.x - x);
		for (const point of plot.plotted) {
			const dist = Math.abs(point.x - x);
			if (dist < best) {
				best = dist;
				nearest = point;
			}
		}
		hover = nearest;
	}

	function onPointerLeave() {
		hover = null;
	}

	const tooltipLeft = $derived(hover ? Math.min(92, Math.max(8, (hover.x / WIDTH) * 100)) : 50);
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
		<h3 class="text-sm font-medium">Rating over time</h3>
		{#if peak}
			<p class="text-xs text-muted-foreground">
				Peak <span class="font-medium text-success">{peak.rating}</span>
				· {formatDate(peak.at)}
			</p>
		{/if}
	</div>
	{#if !plot}
		<p class="text-sm text-muted-foreground">
			No tracked rating in this window. Older games were logged before ELO history.
		</p>
	{:else}
		<div class="relative aspect-[3/1] w-full rounded-md bg-muted/40 px-1 pt-1">
			<svg
				class="h-full w-full cursor-crosshair text-brand"
				viewBox="0 0 {WIDTH} {HEIGHT}"
				role="img"
				aria-label="Rating over time{peak ? `, peak ${peak.rating}` : ''}"
				onpointermove={onPointerMove}
				onpointerleave={onPointerLeave}
			>
				{#each plot.yTicks as tick (tick)}
					<line
						x1={PAD_L}
						y1={PAD_T + ((plot.max - tick) / (plot.max - plot.min)) * INNER_H}
						x2={WIDTH - PAD_R}
						y2={PAD_T + ((plot.max - tick) / (plot.max - plot.min)) * INNER_H}
						class="stroke-border"
						stroke-width="1"
					/>
					<text
						x={PAD_L - 8}
						y={PAD_T + ((plot.max - tick) / (plot.max - plot.min)) * INNER_H + 4}
						text-anchor="end"
						class="fill-muted-foreground"
						font-size="11">{tick}</text
					>
				{/each}
				{#each plot.xTicks as tick (`${tick.x}:${tick.label}`)}
					<line
						x1={tick.x}
						y1={PAD_T}
						x2={tick.x}
						y2={HEIGHT - PAD_B}
						class="stroke-border"
						stroke-width="1"
					/>
					<text
						x={tick.x}
						y={HEIGHT - 8}
						text-anchor="middle"
						class="fill-muted-foreground"
						font-size="11">{tick.label}</text
					>
				{/each}
				<path
					d={plot.d}
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
				{#if plot.plotted.length <= DOT_LIMIT}
					{#each plot.plotted as point (`${point.at.getTime()}:${point.rating}`)}
						<circle cx={point.x} cy={point.y} r="3" class="fill-brand" />
					{/each}
				{/if}
				<circle cx={plot.peakPlotted.x} cy={plot.peakPlotted.y} r="5" class="fill-success" />
				{#if hover}
					<line
						x1={hover.x}
						y1={PAD_T}
						x2={hover.x}
						y2={HEIGHT - PAD_B}
						class="stroke-brand"
						opacity="0.45"
						stroke-width="1"
					/>
					<circle
						cx={hover.x}
						cy={hover.y}
						r="5"
						class="fill-brand stroke-background"
						stroke-width="2"
					/>
				{/if}
			</svg>
			{#if hover}
				<div
					class="pointer-events-none absolute top-2 rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm"
					style:left="{tooltipLeft}%"
					style:transform="translateX(-50%)"
				>
					<p class="font-medium text-foreground">{hover.rating}</p>
					<p class="text-muted-foreground">{formatDateTime(hover.at)}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
