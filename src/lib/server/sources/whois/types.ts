import type { SteamId } from '$lib/mge/steam-id';
import type { Sourced } from '$lib/server/sources/types';

export type WhoisSessionLog = {
	steamid: SteamId;
	name: string | null;
	/** connect | disconnect | namechange | connect-late */
	action: string | null;
	at: Date | null;
	ip: string | null;
	serverIp: string | null;
	serverName: string | null;
};

export type WhoisPlayerView = {
	steamid: SteamId;
	permName: string | null;
	/** Distinct names, most recent first. */
	knownNames: string[];
	distinctIps: string[];
	firstSeen: Date | null;
	lastSeen: Date | null;
	sessionCount: number;
	/** Most recent first, capped. */
	logs: WhoisSessionLog[];
};

export type WhoisIpAccount = {
	steamid: SteamId;
	name: string | null;
	firstSeen: Date | null;
	lastSeen: Date | null;
	sessionCount: number;
};

export type WhoisIpView = {
	ip: string;
	accounts: WhoisIpAccount[];
	logs: WhoisSessionLog[];
};

export type AltLink = {
	steamid: SteamId;
	mainSteamId: SteamId | null;
	linkedAt: Date;
	linkedBy: string | null;
};

export type AltLinkInput = {
	steamid: SteamId;
	mainSteamId: SteamId;
	linkedBy: string | null;
};

export type AltCandidate = {
	steamid: SteamId;
	score: number;
	label: 'Likely' | 'Possible' | 'Unlikely';
	sharedIps: string[];
	knownNames: string[];
	evidence: { ipOverlapScore: number; nameSimilarityScore: number };
	/** Most recent `whois_logs` activity for this account, if any. */
	lastSeen: Date | null;
};

/** An `AltLink` plus the account's most recent `whois_logs` activity. */
export type AltInvestigationLink = AltLink & {
	lastSeen: Date | null;
};

export type AltInvestigation = {
	/**
	 * Top 25 by score, then re-sorted most-recent-activity-first so the
	 * freshest sightings surface at the top of each confidence bucket.
	 */
	candidates: AltCandidate[];
	/** Confirmed alt links where the subject is the main, most recent activity first. */
	linkedAlts: AltInvestigationLink[];
	/** Confirmed alt link where the subject is the alt, or `null`. */
	linkedMain: AltInvestigationLink | null;
};

export interface WhoisAdapter {
	searchBySteam(
		steamid: SteamId,
		opts?: { take?: number }
	): Promise<Sourced<WhoisPlayerView> | null>;
	searchByIp(ip: string, opts?: { take?: number }): Promise<Sourced<WhoisIpView>>;
	listAltLinks(): Promise<Sourced<AltLink>[]>;
	/**
	 * Throws if `mainSteamId` has no `whois_permname` row, or if `steamid`
	 * already has a permname or an existing alt link (mirrors the `sm_link`
	 * admin command's validation in the whois SourceMod plugin).
	 */
	upsertAltLink(input: AltLinkInput): Promise<void>;
	deleteAltLink(steamid: SteamId): Promise<void>;
	getPermName(steamid: SteamId): Promise<string | null>;
	setPermName(steamid: SteamId, name: string): Promise<void>;
	/**
	 * Advisory alt-candidate scoring for a Steam search: other accounts seen
	 * on the subject's IPs in the window, ranked by shared-IP rarity + name
	 * similarity, plus their confirmed alt links. Never mutates anything.
	 */
	getAltInvestigation(
		steamid: SteamId,
		opts?: { days?: number }
	): Promise<Sourced<AltInvestigation>>;
}
