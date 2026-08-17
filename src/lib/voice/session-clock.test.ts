import { describe, expect, test } from 'bun:test';
import { formatClockLabel, inferSessionStartMs, parseBrowserLastModified } from './session-clock';

function localMs(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second = 0
): number {
	return new Date(year, month - 1, day, hour, minute, second).getTime();
}

function startFromFilename(filename: string) {
	return inferSessionStartMs({ filename, recordedAtMs: null, durationSeconds: 0 });
}

describe('inferSessionStartMs from filename', () => {
	test('parses SourceTV auto names with dashes', () => {
		const session = startFromFilename('auto-2026-08-16-23-55-33.dem');
		expect(session?.source).toBe('filename');
		expect(session?.startMs).toBe(localMs(2026, 8, 16, 23, 55, 33));
	});

	test('parses underscore time and a map suffix', () => {
		const session = startFromFilename('auto-2026-08-16_23-55-00-cp_process_final.dem');
		expect(session?.startMs).toBe(localMs(2026, 8, 16, 23, 55, 0));
	});

	test('parses compact YYYYMMDD-HHMMSS', () => {
		const session = startFromFilename('auto-20260816-235533.dem');
		expect(session?.startMs).toBe(localMs(2026, 8, 16, 23, 55, 33));
	});

	test('parses compact YYYYMMDD-HHMM', () => {
		const session = startFromFilename('20260816-2355-cp_process.dem');
		expect(session?.startMs).toBe(localMs(2026, 8, 16, 23, 55, 0));
	});

	test('returns null when there is no timestamp and no mtime', () => {
		expect(startFromFilename('pickup-finals.dem')).toBeNull();
	});
});

describe('inferSessionStartMs', () => {
	const durationSeconds = 90 * 60;
	const startMs = localMs(2026, 8, 16, 23, 55, 0);

	test('prefers a filename start over an afternoon upload mtime', () => {
		const afternoonUpload = localMs(2026, 8, 17, 14, 0, 0);
		const session = inferSessionStartMs({
			filename: 'auto-2026-08-16-23-55-00.dem',
			recordedAtMs: afternoonUpload,
			durationSeconds
		});
		expect(session?.source).toBe('filename');
		expect(session?.startMs).toBe(startMs);
		expect(formatClockLabel(15 * 60, session!.startMs)).toBe('00:10');
		expect(formatClockLabel(65 * 60, session!.startMs)).toBe('01:00');
	});

	test('treats a filename timestamp near mtime as the recording end', () => {
		const endMs = startMs + durationSeconds * 1000;
		const session = inferSessionStartMs({
			filename: 'stv-2026-08-17-01-25-00.dem',
			recordedAtMs: endMs,
			durationSeconds
		});
		expect(session?.source).toBe('mtime');
		expect(session?.startMs).toBe(startMs);
	});

	test('keeps a filename start even when mtime is only minutes later', () => {
		const session = inferSessionStartMs({
			filename: 'auto-2026-08-16-12-00-00.dem',
			recordedAtMs: localMs(2026, 8, 16, 12, 10, 0),
			durationSeconds: 15 * 60
		});
		expect(session?.source).toBe('filename');
		expect(session?.startMs).toBe(localMs(2026, 8, 16, 12, 0, 0));
	});

	test('subtracts duration from mtime when the filename has no clock', () => {
		const endMs = startMs + durationSeconds * 1000;
		const session = inferSessionStartMs({
			filename: 'pickup-finals.dem',
			recordedAtMs: endMs,
			durationSeconds
		});
		expect(session?.source).toBe('mtime');
		expect(session?.startMs).toBe(startMs);
	});
});

describe('formatClockLabel', () => {
	test('uses 24-hour local hours including midnight', () => {
		const midnight = localMs(2026, 8, 17, 0, 10, 0);
		expect(formatClockLabel(0, midnight)).toBe('00:10');
		expect(formatClockLabel(50 * 60, midnight)).toBe('01:00');
		expect(formatClockLabel(0, localMs(2026, 8, 17, 13, 0, 0))).toBe('13:00');
	});
});

describe('parseBrowserLastModified', () => {
	test('accepts millisecond timestamps from the File API', () => {
		const date = new Date(2026, 7, 17, 1, 30, 0);
		expect(parseBrowserLastModified(String(date.getTime()))?.getTime()).toBe(date.getTime());
	});

	test('rejects missing or nonsense values', () => {
		expect(parseBrowserLastModified(null)).toBeNull();
		expect(parseBrowserLastModified('0')).toBeNull();
		expect(parseBrowserLastModified('not-a-date')).toBeNull();
	});
});
