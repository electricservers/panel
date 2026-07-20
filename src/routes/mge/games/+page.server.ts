import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { listSources } from '$lib/server/sources/registry';
import { parseDateRange } from '$lib/mge/date-range';
import { withDuelAvatars } from '$lib/server/duel-avatars';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 30;

export const load: PageServerLoad = async ({ url }) => {
	requireModule('mgemod');
	const sourceId = resolveMgeSourceId(url);
	const adapter = mgeFor(sourceId);

	const q = url.searchParams.get('q')?.trim() || undefined;
	const arena = url.searchParams.get('arena')?.trim() || undefined;
	const outcomeParam = url.searchParams.get('outcome');
	const outcome = outcomeParam === 'win' || outcomeParam === 'loss' ? outcomeParam : undefined;
	const { from, to } = parseDateRange(url);
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

	const games = adapter
		.getGames({
			q,
			arena,
			outcome,
			from,
			to,
			take: PAGE_SIZE,
			skip: (page - 1) * PAGE_SIZE
		})
		.then(withDuelAvatars);

	return {
		sourceId,
		sources: listSources({ capability: 'mgemod', enabled: true }),
		arenas: await adapter.getArenas(),
		games,
		filters: {
			q,
			arena,
			outcome,
			days: url.searchParams.get('days') ?? undefined,
			from: url.searchParams.get('from') ?? undefined,
			to: url.searchParams.get('to') ?? undefined,
			page,
			pageSize: PAGE_SIZE
		}
	};
};
