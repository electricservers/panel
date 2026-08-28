export const GLICKO_RANKED_RD = 100;
export const GLICKO_RANKED_MIN_GAMES = 10;
const GLICKO_PROVISIONAL_RD = 200;

export type GlickoStatus = 'elo' | 'ranked' | 'unranked' | 'provisional';

export type LeaderboardScope = 'ranked' | 'all';

export function parseOptionalRd(value: unknown): number | null {
	if (value == null || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

export function glickoStatus(rd: number | null, games: number): GlickoStatus {
	if (rd == null) return 'elo';
	if (rd < GLICKO_RANKED_RD && games >= GLICKO_RANKED_MIN_GAMES) return 'ranked';
	if (rd > GLICKO_PROVISIONAL_RD) return 'provisional';
	return 'unranked';
}

export function formatRd(rd: number | null): string {
	if (rd == null) return '—';
	return String(Math.round(rd));
}

export function unrankedReason(rd: number | null, games: number): string | null {
	const status = glickoStatus(rd, games);
	if (status === 'elo' || status === 'ranked') return null;
	const needed = GLICKO_RANKED_MIN_GAMES - games;
	if (needed > 0) {
		return `${needed} more game${needed === 1 ? '' : 's'} to qualify`;
	}
	return 'RD too high to qualify';
}

export function glickoStatusLabel(status: GlickoStatus): string | null {
	if (status === 'elo') return null;
	if (status === 'ranked') return 'Ranked';
	if (status === 'provisional') return 'Provisional';
	return 'Unranked';
}
