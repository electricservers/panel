export const TIMEZONE_COOKIE = 'mge-tz';

export type ActivityGame = {
	startMs: number | null;
	endMs: number;
};

export type ActivitySummary = {
	/** Sun=0..Sat=6. */
	byWeekday: number[];
	byHour: number[];
	/** `byWeekdayHour[weekday][hour]`, Sun=0. */
	byWeekdayHour: number[][];
	games: number;
	timeZone: string;
	peakWeekday: number | null;
	peakHour: number | null;
	/** Inclusive start hour, exclusive end hour, wrapping at 24. */
	typicalHours: { start: number; end: number } | null;
	sessions: {
		count: number;
		medianDurationMin: number | null;
		medianGames: number | null;
	};
};

const SESSION_GAP_MS = 45 * 60 * 1000;
const TYPICAL_WINDOW_HOURS = 4;
const WEEKDAY_SHORT: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6
};

const formatters = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(timeZone: string): boolean {
	try {
		Intl.DateTimeFormat(undefined, { timeZone });
		return true;
	} catch {
		return false;
	}
}

export function resolveTimeZone(input: string | null | undefined): string {
	if (input && isValidTimeZone(input)) return input;
	return 'UTC';
}

export function summarizeActivity(games: ActivityGame[], timeZone: string): ActivitySummary {
	const tz = resolveTimeZone(timeZone);
	const byWeekday = new Array(7).fill(0) as number[];
	const byHour = new Array(24).fill(0) as number[];
	const byWeekdayHour = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);

	for (const game of games) {
		const { weekday, hour } = zonedWeekdayAndHour(game.endMs, tz);
		byWeekday[weekday] += 1;
		byHour[hour] += 1;
		const row = byWeekdayHour[weekday];
		if (row) row[hour] += 1;
	}

	return {
		byWeekday,
		byHour,
		byWeekdayHour,
		games: games.length,
		timeZone: tz,
		peakWeekday: argMax(byWeekday),
		peakHour: argMax(byHour),
		typicalHours: typicalHourWindow(byHour),
		sessions: clusterSessions(games)
	};
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
	const cached = formatters.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		weekday: 'short',
		hour: 'numeric',
		hourCycle: 'h23'
	});
	formatters.set(timeZone, formatter);
	return formatter;
}

function zonedWeekdayAndHour(ms: number, timeZone: string): { weekday: number; hour: number } {
	const parts = formatterFor(timeZone).formatToParts(new Date(ms));
	let weekday = 0;
	let hour = 0;
	for (const part of parts) {
		if (part.type === 'weekday') weekday = WEEKDAY_SHORT[part.value] ?? 0;
		if (part.type === 'hour') hour = Number(part.value) % 24;
	}
	return { weekday, hour };
}

function argMax(values: number[]): number | null {
	let best = -1;
	let index: number | null = null;
	for (let i = 0; i < values.length; i++) {
		const value = values[i] ?? 0;
		if (value > best) {
			best = value;
			index = i;
		}
	}
	return best > 0 ? index : null;
}

function typicalHourWindow(byHour: number[]): { start: number; end: number } | null {
	const total = byHour.reduce((sum, count) => sum + count, 0);
	if (total === 0) return null;
	let bestStart = 0;
	let bestSum = -1;
	for (let start = 0; start < 24; start++) {
		let sum = 0;
		for (let offset = 0; offset < TYPICAL_WINDOW_HOURS; offset++) {
			sum += byHour[(start + offset) % 24] ?? 0;
		}
		if (sum > bestSum) {
			bestSum = sum;
			bestStart = start;
		}
	}
	return { start: bestStart, end: (bestStart + TYPICAL_WINDOW_HOURS) % 24 };
}

function clusterSessions(games: ActivityGame[]): ActivitySummary['sessions'] {
	if (games.length === 0) {
		return { count: 0, medianDurationMin: null, medianGames: null };
	}
	const sorted = [...games].sort((a, b) => a.endMs - b.endMs);
	const durations: number[] = [];
	const sizes: number[] = [];
	let sessionStart = sorted[0]!.startMs ?? sorted[0]!.endMs;
	let sessionEnd = sorted[0]!.endMs;
	let sessionGames = 1;

	const flush = () => {
		sizes.push(sessionGames);
		const duration = sessionEnd - sessionStart;
		if (duration > 0) durations.push(duration);
	};

	for (let i = 1; i < sorted.length; i++) {
		const game = sorted[i]!;
		const prev = sorted[i - 1]!;
		if (game.endMs - prev.endMs > SESSION_GAP_MS) {
			flush();
			sessionStart = game.startMs ?? game.endMs;
			sessionEnd = game.endMs;
			sessionGames = 1;
		} else {
			sessionEnd = game.endMs;
			sessionGames += 1;
		}
	}
	flush();

	const medianDuration = median(durations);
	return {
		count: sizes.length,
		medianDurationMin: medianDuration == null ? null : medianDuration / 60_000,
		medianGames: median(sizes)
	};
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const a = sorted[mid];
	if (a == null) return null;
	if (sorted.length % 2 === 1) return a;
	const b = sorted[mid - 1];
	return b == null ? a : (a + b) / 2;
}
