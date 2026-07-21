export const DATE_RANGE_PRESETS = [7, 30, 90] as const;

/**
 * Parses a `YYYY-MM-DD` URL param, as sent by `<input type="date">`, into a
 * `Date` at UTC midnight (or 23:59:59 for an inclusive end-of-range `to`).
 * Returns `undefined` for missing or unparseable values instead of an
 * invalid Date.
 */
function parseDateParam(value: string | null, endOfDay = false): Date | undefined {
	if (!value) return undefined;
	const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parses `from`/`to` (`YYYY-MM-DD`) or a rolling `days` preset from the URL
 * into a date range for `GamesQuery`. Explicit `from`/`to` win over `days`.
 * Unparseable `from`/`to` values are treated as absent rather than producing
 * an invalid Date, falling back to `days`.
 */
export function parseDateRange(url: URL): { from?: Date; to?: Date } {
	const from = parseDateParam(url.searchParams.get('from'));
	const to = parseDateParam(url.searchParams.get('to'), true);
	if (from || to) {
		return { from, to };
	}

	const days = Number(url.searchParams.get('days'));
	if (Number.isFinite(days) && days > 0) {
		return { from: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
	}

	return {};
}
