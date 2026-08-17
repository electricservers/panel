type WallClock = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

export type SessionClock = {
	startMs: number;
	source: 'filename' | 'mtime';
};

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;
const NEAR_MS = 20 * 60 * 1000;

function isValidWallClock(clock: WallClock): boolean {
	if (clock.year < YEAR_MIN || clock.year > YEAR_MAX) return false;
	if (clock.month < 1 || clock.month > 12) return false;
	if (clock.day < 1 || clock.day > 31) return false;
	if (clock.hour > 23 || clock.minute > 59 || clock.second > 59) return false;
	const date = new Date(
		clock.year,
		clock.month - 1,
		clock.day,
		clock.hour,
		clock.minute,
		clock.second
	);
	return (
		date.getFullYear() === clock.year &&
		date.getMonth() === clock.month - 1 &&
		date.getDate() === clock.day &&
		date.getHours() === clock.hour &&
		date.getMinutes() === clock.minute &&
		date.getSeconds() === clock.second
	);
}

function fromParts(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second: number
): WallClock | null {
	const clock = { year, month, day, hour, minute, second };
	return isValidWallClock(clock) ? clock : null;
}

function firstMatch(
	basename: string,
	regex: RegExp,
	toClock: (m: RegExpMatchArray) => WallClock | null
) {
	const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
	const global = new RegExp(regex.source, flags);
	for (const match of basename.matchAll(global)) {
		const clock = toClock(match);
		if (clock) return clock;
	}
	return null;
}

/** STV auto-record names usually embed the recording *start* as local wall-clock. */
function parseDemoFilenameWallClock(filename: string): WallClock | null {
	const base = filename.replace(/\\/g, '/').split('/').pop() ?? filename;
	const stem = base.replace(/\.dem$/i, '');

	const separated = firstMatch(
		stem,
		/(\d{4})[-_.](\d{2})[-_.](\d{2})[T_\- ](\d{2})[-_.](\d{2})(?:[-_.](\d{2}))?/,
		(m) =>
			fromParts(
				Number(m[1]),
				Number(m[2]),
				Number(m[3]),
				Number(m[4]),
				Number(m[5]),
				m[6] != null ? Number(m[6]) : 0
			)
	);
	if (separated) return separated;

	const compact = firstMatch(stem, /(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})?/, (m) =>
		fromParts(
			Number(m[1]),
			Number(m[2]),
			Number(m[3]),
			Number(m[4]),
			Number(m[5]),
			m[6] != null ? Number(m[6]) : 0
		)
	);
	if (compact) return compact;

	return firstMatch(stem, /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, (m) =>
		fromParts(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]))
	);
}

function wallClockToLocalMs(clock: WallClock): number {
	return new Date(
		clock.year,
		clock.month - 1,
		clock.day,
		clock.hour,
		clock.minute,
		clock.second
	).getTime();
}

export function instantToMs(value: Date | string | number | null | undefined): number | null {
	if (value == null) return null;
	const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isFinite(time) ? time : null;
}

/** Browser `File.lastModified` is ms. Multipart may send the same value as a string. */
export function parseBrowserLastModified(raw: unknown): Date | null {
	if (raw == null || raw === '') return null;
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || n <= 0) return null;
	const ms = n < 1e12 ? n * 1000 : n;
	const date = new Date(ms);
	const year = date.getUTCFullYear();
	if (year < YEAR_MIN || year > YEAR_MAX) return null;
	return date;
}

export function inferSessionStartMs(input: {
	filename: string;
	recordedAtMs: number | null;
	durationSeconds: number;
}): SessionClock | null {
	const durationMs = Math.round(Math.max(0, input.durationSeconds) * 1000);
	const endMs = input.recordedAtMs;
	const startFromMtime = endMs != null ? endMs - durationMs : null;
	const fromName = parseDemoFilenameWallClock(input.filename);

	if (fromName) {
		const namedMs = wallClockToLocalMs(fromName);
		if (endMs != null && startFromMtime != null) {
			const distEnd = Math.abs(namedMs - endMs);
			const distStart = Math.abs(namedMs - startFromMtime);
			if (distEnd <= NEAR_MS && distEnd < distStart) {
				return { startMs: startFromMtime, source: 'mtime' };
			}
		}
		return { startMs: namedMs, source: 'filename' };
	}

	if (startFromMtime != null) {
		return { startMs: startFromMtime, source: 'mtime' };
	}
	return null;
}

function formatWallClock(ms: number): string {
	const date = new Date(ms);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function formatClockLabel(offsetSeconds: number, sessionStartMs: number | null): string {
	if (sessionStartMs == null) {
		const total = Math.max(0, Math.floor(offsetSeconds));
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	}
	return formatWallClock(sessionStartMs + offsetSeconds * 1000);
}
