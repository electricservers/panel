import { getSteamProfiles } from '$lib/server/steam-profiles';
import { toSteamId64 } from '$lib/mge/steam-id';
import type {
	AltCandidate,
	AltInvestigation,
	AltInvestigationLink
} from '$lib/server/sources/whois/types';
import type { Sourced } from '$lib/server/sources/types';

export type SteamProfileInfo = { name: string; avatarUrl?: string };

export type AltCandidateWithProfile = AltCandidate & SteamProfileInfo;
export type AltInvestigationLinkWithProfile = AltInvestigationLink & SteamProfileInfo;

export type AltInvestigationWithProfiles = {
	candidates: AltCandidateWithProfile[];
	linkedAlts: AltInvestigationLinkWithProfile[];
	linkedMain: AltInvestigationLinkWithProfile | null;
};

function safeSteamId64(steamid2: string): string | null {
	try {
		return toSteamId64(steamid2);
	} catch {
		return null;
	}
}

/**
 * Batch-fetches Steam avatars/persona names for the subject plus every
 * confirmed alt and candidate surfaced across all sources' investigations,
 * then stamps each node with `name`/`avatarUrl` (falling back to the raw
 * SteamID as the name when the Steam API has nothing for it).
 */
export async function withAltProfiles(
	subjectSteamId: string,
	investigations: Sourced<AltInvestigation>[]
): Promise<{
	subjectProfile: SteamProfileInfo;
	bySource: Map<string, AltInvestigationWithProfiles>;
}> {
	const steamid2s = new Set<string>([subjectSteamId]);
	for (const investigation of investigations) {
		if (investigation.linkedMain?.mainSteamId) steamid2s.add(investigation.linkedMain.mainSteamId);
		for (const alt of investigation.linkedAlts) steamid2s.add(alt.steamid);
		for (const candidate of investigation.candidates) steamid2s.add(candidate.steamid);
	}

	const steam64Ids = Array.from(steamid2s)
		.map(safeSteamId64)
		.filter((id): id is string => Boolean(id));
	const profiles = await getSteamProfiles(steam64Ids);

	function profileFor(steamid2: string): SteamProfileInfo {
		const steam64 = safeSteamId64(steamid2);
		const profile = steam64 ? profiles.get(steam64) : undefined;
		return { name: profile?.personaname ?? steamid2, avatarUrl: profile?.avatarmedium };
	}

	const bySource = new Map<string, AltInvestigationWithProfiles>();
	for (const investigation of investigations) {
		bySource.set(investigation.sourceId, {
			candidates: investigation.candidates.map((candidate) => ({
				...candidate,
				...profileFor(candidate.steamid)
			})),
			linkedAlts: investigation.linkedAlts.map((alt) => ({ ...alt, ...profileFor(alt.steamid) })),
			linkedMain: investigation.linkedMain
				? { ...investigation.linkedMain, ...profileFor(investigation.linkedMain.mainSteamId ?? '') }
				: null
		});
	}

	return { subjectProfile: profileFor(subjectSteamId), bySource };
}
