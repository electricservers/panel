export const DATE_RANGE_PRESETS = [7, 30, 90] as const;

/**
 * Parses `from`/`to` (unix seconds) or a rolling `days` preset from the URL
 * into a date range for `GamesQuery`. Explicit `from`/`to` win over `days`.
 */
export function parseDateRange(url: URL): { from?: Date; to?: Date } {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (from || to) {
		return {
			from: from ? new Date(Number(from) * 1000) : undefined,
			to: to ? new Date(Number(to) * 1000) : undefined
		};
	}

	const days = Number(url.searchParams.get('days'));
	if (Number.isFinite(days) && days > 0) {
		return { from: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
	}

	return {};
}
