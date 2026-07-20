import { requireRole } from '$lib/server/require-role';
import { requireModule } from '$lib/server/require-module';
import { fanOut, listSources } from '$lib/server/sources/registry';
import { whoisFor } from '$lib/server/sources/whois';
import { resolveVanityToSteamId64 } from '$lib/server/steam-vanity';
import { withAltProfiles } from '$lib/server/whois-alt-avatars';
import { classifyWhoisQuery } from '$lib/whois/classify-query';
import type { Source } from '$lib/server/sources/types';
import type { PageServerLoad } from './$types';

async function investigateSteam(subjectSteamId: string, sources: Source[]) {
	const [panels, investigationResults] = await Promise.all([
		fanOut(sources, (source) => whoisFor(source.id).searchBySteam(subjectSteamId)),
		fanOut(sources, (source) => whoisFor(source.id).getAltInvestigation(subjectSteamId))
	]);

	const successfulInvestigations = investigationResults
		.filter((result) => result.ok)
		.map((result) => result.data);
	const { subjectProfile, bySource } = await withAltProfiles(
		subjectSteamId,
		successfulInvestigations
	);

	const investigations = investigationResults.map((result) => {
		if (!result.ok) return result;
		const data = bySource.get(result.sourceId) ?? {
			candidates: [],
			linkedAlts: [],
			linkedMain: null
		};
		return { ...result, data };
	});

	return { panels, investigations, subjectProfile };
}

async function investigate(q: string, sources: Source[]) {
	const query = classifyWhoisQuery(q);

	if (query.kind === 'invalid') {
		return { kind: 'invalid' as const };
	}

	if (query.kind === 'vanity') {
		const steam64 = await resolveVanityToSteamId64(query.value);
		if (!steam64) {
			return { kind: 'vanity-not-found' as const, value: query.value };
		}
		const { panels, investigations, subjectProfile } = await investigateSteam(steam64, sources);
		return { kind: 'steam' as const, value: steam64, panels, investigations, subjectProfile };
	}

	if (query.kind === 'steamid') {
		const { panels, investigations, subjectProfile } = await investigateSteam(query.value, sources);
		return {
			kind: 'steam' as const,
			value: query.value,
			panels,
			investigations,
			subjectProfile
		};
	}

	return {
		kind: 'ip' as const,
		value: query.value,
		panels: await fanOut(sources, (source) => whoisFor(source.id).searchByIp(query.value))
	};
}

export const load: PageServerLoad = ({ locals, url }) => {
	requireModule('whois');
	requireRole(locals, ['admin', 'owner']);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const sources = listSources({ capability: 'whois', enabled: true });

	return {
		q,
		sources,
		results: q ? investigate(q, sources) : null
	};
};
