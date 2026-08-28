import { describe, expect, test } from 'bun:test';
import {
	GLICKO_RANKED_MIN_GAMES,
	GLICKO_RANKED_RD,
	formatRd,
	glickoStatus,
	glickoStatusLabel,
	parseOptionalRd,
	unrankedReason
} from './glicko';

describe('glickoStatus', () => {
	test('null RD is Elo', () => {
		expect(glickoStatus(null, 80)).toBe('elo');
	});

	test('qualifies when RD is under the ranked bar with enough games', () => {
		expect(glickoStatus(GLICKO_RANKED_RD - 0.1, GLICKO_RANKED_MIN_GAMES)).toBe('ranked');
	});

	test('does not qualify at the ranked RD threshold', () => {
		expect(glickoStatus(GLICKO_RANKED_RD, 80)).toBe('unranked');
	});

	test('does not qualify with too few games even if RD is low', () => {
		expect(glickoStatus(80, GLICKO_RANKED_MIN_GAMES - 1)).toBe('unranked');
	});

	test('marks high RD as provisional', () => {
		expect(glickoStatus(201, 3)).toBe('provisional');
	});

	test('RD equal to the provisional bar is unranked, not provisional', () => {
		expect(glickoStatus(200, 20)).toBe('unranked');
	});
});

describe('parseOptionalRd', () => {
	test('accepts numbers and numeric strings', () => {
		expect(parseOptionalRd(110.744)).toBe(110.744);
		expect(parseOptionalRd('89.07')).toBe(89.07);
	});

	test('treats empty values as missing', () => {
		expect(parseOptionalRd(null)).toBeNull();
		expect(parseOptionalRd(undefined)).toBeNull();
		expect(parseOptionalRd('')).toBeNull();
		expect(parseOptionalRd('nope')).toBeNull();
	});
});

describe('formatRd', () => {
	test('rounds for display', () => {
		expect(formatRd(110.744)).toBe('111');
		expect(formatRd(null)).toBe('—');
	});
});

describe('unrankedReason', () => {
	test('returns null for Elo and ranked players', () => {
		expect(unrankedReason(null, 10)).toBeNull();
		expect(unrankedReason(80, 20)).toBeNull();
	});

	test('counts remaining games before the ranked floor', () => {
		expect(unrankedReason(90, 9)).toBe('1 more game to qualify');
		expect(unrankedReason(90, 8)).toBe('2 more games to qualify');
	});

	test('blames RD when the game count is already enough', () => {
		expect(unrankedReason(110.7, 78)).toBe('RD too high to qualify');
	});
});

describe('glickoStatusLabel', () => {
	test('hides Elo and labels the rest', () => {
		expect(glickoStatusLabel('elo')).toBeNull();
		expect(glickoStatusLabel('ranked')).toBe('Ranked');
		expect(glickoStatusLabel('unranked')).toBe('Unranked');
		expect(glickoStatusLabel('provisional')).toBe('Provisional');
	});
});
