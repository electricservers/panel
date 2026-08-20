export type RatingPoint = { at: Date; rating: number };

const DEFAULT_MAX_POINTS = 120;
const DENSE_COUNT = 80;

const DAY_MS = 86_400_000;
const LONG_WINDOW_MS = 14 * DAY_MS;

export function ratingExtrema(points: RatingPoint[]): {
	peak: RatingPoint | null;
	low: RatingPoint | null;
} {
	if (points.length === 0) return { peak: null, low: null };
	let peak = points[0];
	let low = points[0];
	for (const point of points) {
		if (point.rating > peak.rating || (point.rating === peak.rating && point.at < peak.at)) {
			peak = point;
		}
		if (point.rating < low.rating || (point.rating === low.rating && point.at < low.at)) {
			low = point;
		}
	}
	return { peak, low };
}

/**
 * Caps a chronological rating series for charting. Peak/low from `full` are
 * always kept. Long windows collapse to last-per-UTC-day before striding.
 */
export function downsampleRatingSeries(
	points: RatingPoint[],
	maxPoints = DEFAULT_MAX_POINTS
): RatingPoint[] {
	if (points.length <= 1) return points;
	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last) return points;
	const span = last.at.getTime() - first.at.getTime();
	const reduced =
		span > LONG_WINDOW_MS || points.length > DENSE_COUNT ? lastPerUtcDay(points) : points;
	if (reduced.length <= maxPoints) return ensureKeyPoints(reduced, points);
	return stride(reduced, maxPoints, points);
}

function lastPerUtcDay(points: RatingPoint[]): RatingPoint[] {
	const byDay = new Map<string, RatingPoint>();
	for (const point of points) {
		byDay.set(point.at.toISOString().slice(0, 10), point);
	}
	return Array.from(byDay.values()).sort((a, b) => a.at.getTime() - b.at.getTime());
}

function pointKey(point: RatingPoint): string {
	return `${point.at.getTime()}:${point.rating}`;
}

function ensureKeyPoints(reduced: RatingPoint[], full: RatingPoint[]): RatingPoint[] {
	const { peak, low } = ratingExtrema(full);
	const keys = new Set(reduced.map(pointKey));
	const extra: RatingPoint[] = [];
	for (const keyPoint of [peak, low]) {
		if (!keyPoint) continue;
		const key = pointKey(keyPoint);
		if (!keys.has(key)) {
			keys.add(key);
			extra.push(keyPoint);
		}
	}
	if (extra.length === 0) return reduced;
	return [...reduced, ...extra].sort((a, b) => a.at.getTime() - b.at.getTime());
}

function stride(points: RatingPoint[], maxPoints: number, full: RatingPoint[]): RatingPoint[] {
	const { peak, low } = ratingExtrema(full);
	const kept = new Map<string, RatingPoint>();
	const add = (point: RatingPoint) => kept.set(pointKey(point), point);
	add(points[0]);
	add(points[points.length - 1]);
	if (peak) add(peak);
	if (low) add(low);
	const budget = Math.max(1, maxPoints - kept.size);
	const step = Math.max(1, Math.ceil(points.length / budget));
	for (let i = step; i < points.length - 1; i += step) {
		add(points[i]);
		if (kept.size >= maxPoints) break;
	}
	return Array.from(kept.values()).sort((a, b) => a.at.getTime() - b.at.getTime());
}
