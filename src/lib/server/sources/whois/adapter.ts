import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { toSteamId2 } from '$lib/mge/steam-id';
import { stringSimilarity } from '$lib/whois/string-similarity';
import { classifyIp } from '$lib/server/ip-reputation';
import type { Source, Sourced } from '$lib/server/sources/types';
import { getWhoisDb } from './client';
import { whoisAltLinks, whoisLogs, whoisPermname } from './schema';
import type {
	AltCandidate,
	AltInvestigation,
	AltInvestigationLink,
	AltLink,
	AltLinkInput,
	WhoisAdapter,
	WhoisIpAccount,
	WhoisIpView,
	WhoisPlayerView,
	WhoisSessionLog
} from './types';

/** Logs beyond this age are still counted/aggregated, just not fetched for display. */
const FETCH_CAP = 2000;
const DEFAULT_TAKE = 200;
const MAX_TAKE = 1000;

const ALT_INVESTIGATION_DEFAULT_DAYS = 365;
const ALT_CANDIDATES_TAKE = 25;
/** Cap on rows fetched per query for the alt-candidate scan. */
const ALT_SCAN_FETCH_CAP = 5000;
const IP_OVERLAP_WEIGHT = 0.75;
const NAME_SIMILARITY_WEIGHT = 0.25;

type WhoisLogRow = typeof whoisLogs.$inferSelect;

function toLogDate(row: Pick<WhoisLogRow, 'timestamp' | 'date' | 'time'>): Date | null {
	if (row.timestamp) return new Date(row.timestamp * 1000);
	if (row.date) {
		const combined = new Date(`${row.date}T${row.time ?? '00:00:00'}`);
		return Number.isNaN(combined.getTime()) ? null : combined;
	}
	return null;
}

function mapLogRow(row: WhoisLogRow): WhoisSessionLog {
	return {
		steamid: row.steamId ?? '',
		name: row.name,
		action: row.action,
		at: toLogDate(row),
		ip: row.ip,
		serverIp: row.serverIp,
		serverName: row.serverName
	};
}

/** Matches rows within `days` of now, using `timestamp` when present and falling back to `date`. */
function windowCondition(days: number) {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const sinceUnix = Math.floor(since.getTime() / 1000);
	return or(
		gte(whoisLogs.timestamp, sinceUnix),
		and(isNull(whoisLogs.timestamp), gte(whoisLogs.date, since))
	);
}

/** Most recent `lastSeen` first; accounts with no activity sort last. */
function byMostRecentFirst(a: { lastSeen: Date | null }, b: { lastSeen: Date | null }): number {
	return (b.lastSeen?.getTime() ?? -Infinity) - (a.lastSeen?.getTime() ?? -Infinity);
}

function dedupeInOrder(values: (string | null)[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		if (!value || seen.has(value)) continue;
		seen.add(value);
		result.push(value);
	}
	return result;
}

/** Builds a `WhoisAdapter` backed by a source's MySQL `whois_*` tables. */
export function buildWhoisAdapter(source: Source): WhoisAdapter {
	const db = getWhoisDb(source);

	function tag<T>(data: T): Sourced<T> {
		return { ...data, sourceId: source.id };
	}

	return {
		async searchBySteam(steamid, opts) {
			const id2 = toSteamId2(steamid);
			const take = Math.min(opts?.take ?? DEFAULT_TAKE, MAX_TAKE);

			const [rows, [permRow], [{ total }]] = await Promise.all([
				db
					.select()
					.from(whoisLogs)
					.where(eq(whoisLogs.steamId, id2))
					.orderBy(desc(whoisLogs.entry))
					.limit(FETCH_CAP),
				db
					.select({ name: whoisPermname.name })
					.from(whoisPermname)
					.where(eq(whoisPermname.steamId, id2))
					.limit(1),
				db
					.select({ total: sql<number>`count(*)` })
					.from(whoisLogs)
					.where(eq(whoisLogs.steamId, id2))
			]);

			if (rows.length === 0 && Number(total) === 0 && !permRow) return null;

			const logs = rows.map(mapLogRow);
			const knownNames = dedupeInOrder(logs.map((log) => log.name));
			const distinctIps = dedupeInOrder(logs.map((log) => log.ip));
			const lastSeen = logs[0]?.at ?? null;

			let firstSeen: Date | null = null;
			if (Number(total) > 0) {
				const [earliest] = await db
					.select()
					.from(whoisLogs)
					.where(eq(whoisLogs.steamId, id2))
					.orderBy(asc(whoisLogs.entry))
					.limit(1);
				firstSeen = earliest ? toLogDate(earliest) : null;
			}

			const view: WhoisPlayerView = {
				steamid: id2,
				permName: permRow?.name ?? null,
				knownNames,
				distinctIps,
				firstSeen,
				lastSeen,
				sessionCount: Number(total),
				logs: logs.slice(0, take)
			};
			return tag(view);
		},

		async searchByIp(ip, opts) {
			const take = Math.min(opts?.take ?? DEFAULT_TAKE, MAX_TAKE);

			const rows = await db
				.select()
				.from(whoisLogs)
				.where(eq(whoisLogs.ip, ip))
				.orderBy(desc(whoisLogs.entry))
				.limit(FETCH_CAP);
			const logs = rows.map(mapLogRow);

			const byAccount = new Map<
				string,
				{ name: string | null; firstSeen: Date | null; lastSeen: Date | null; sessionCount: number }
			>();
			for (const log of logs) {
				if (!log.steamid) continue;
				const existing = byAccount.get(log.steamid);
				if (!existing) {
					byAccount.set(log.steamid, {
						name: log.name,
						firstSeen: log.at,
						lastSeen: log.at,
						sessionCount: 1
					});
					continue;
				}
				existing.sessionCount++;
				if (log.name && !existing.name) existing.name = log.name;
				if (log.at && (!existing.firstSeen || log.at < existing.firstSeen))
					existing.firstSeen = log.at;
				if (log.at && (!existing.lastSeen || log.at > existing.lastSeen))
					existing.lastSeen = log.at;
			}

			const accounts: WhoisIpAccount[] = Array.from(byAccount.entries())
				.map(([accountSteamid, agg]) => ({ steamid: accountSteamid, ...agg }))
				.sort((a, b) => (b.lastSeen?.getTime() ?? 0) - (a.lastSeen?.getTime() ?? 0));

			const view: WhoisIpView = { ip, accounts, logs: logs.slice(0, take) };
			return tag(view);
		},

		async listAltLinks() {
			const rows = await db.select().from(whoisAltLinks);
			return rows.map((row) => {
				const link: AltLink = {
					steamid: row.steamId,
					mainSteamId: row.mainSteamId,
					linkedAt: row.linkedAt ?? new Date(0),
					linkedBy: row.linkedBy
				};
				return tag(link);
			});
		},

		async upsertAltLink(input: AltLinkInput) {
			const altId = toSteamId2(input.steamid);
			const mainId = toSteamId2(input.mainSteamId);

			if (altId === mainId) {
				throw new Error('Cannot link a SteamID to itself.');
			}

			const [mainHasPermname] = await db
				.select({ steamId: whoisPermname.steamId })
				.from(whoisPermname)
				.where(eq(whoisPermname.steamId, mainId))
				.limit(1);
			if (!mainHasPermname) {
				throw new Error(
					`"${mainId}" has no permanent name yet. Set one before linking alts to it.`
				);
			}

			const [existingLink] = await db
				.select({ steamId: whoisAltLinks.steamId })
				.from(whoisAltLinks)
				.where(eq(whoisAltLinks.steamId, altId))
				.limit(1);

			if (!existingLink) {
				const [altHasPermname] = await db
					.select({ steamId: whoisPermname.steamId })
					.from(whoisPermname)
					.where(eq(whoisPermname.steamId, altId))
					.limit(1);
				if (altHasPermname) {
					throw new Error(
						`"${altId}" already has a permanent name and cannot be linked as an alt.`
					);
				}
			}

			await db
				.insert(whoisAltLinks)
				.values({ steamId: altId, mainSteamId: mainId, linkedBy: input.linkedBy })
				.onDuplicateKeyUpdate({ set: { mainSteamId: mainId, linkedBy: input.linkedBy } });
		},

		async deleteAltLink(steamid) {
			const id2 = toSteamId2(steamid);
			await db.delete(whoisAltLinks).where(eq(whoisAltLinks.steamId, id2));
		},

		async getPermName(steamid) {
			const id2 = toSteamId2(steamid);
			const [row] = await db
				.select({ name: whoisPermname.name })
				.from(whoisPermname)
				.where(eq(whoisPermname.steamId, id2))
				.limit(1);
			return row?.name ?? null;
		},

		async setPermName(steamid, name) {
			const id2 = toSteamId2(steamid);
			await db
				.insert(whoisPermname)
				.values({ steamId: id2, name })
				.onDuplicateKeyUpdate({ set: { name } });
		},

		async getAltInvestigation(steamid, opts) {
			const id2 = toSteamId2(steamid);
			const days = opts?.days ?? ALT_INVESTIGATION_DEFAULT_DAYS;
			const inWindow = windowCondition(days);

			const [subjectRows, linkedAltRows, [linkedMainRow]] = await Promise.all([
				db
					.select({ ip: whoisLogs.ip, name: whoisLogs.name })
					.from(whoisLogs)
					.where(and(eq(whoisLogs.steamId, id2), inWindow))
					.limit(ALT_SCAN_FETCH_CAP),
				db.select().from(whoisAltLinks).where(eq(whoisAltLinks.mainSteamId, id2)),
				db.select().from(whoisAltLinks).where(eq(whoisAltLinks.steamId, id2)).limit(1)
			]);

			const confirmedIds = Array.from(
				new Set<string>([
					...(linkedMainRow?.mainSteamId ? [linkedMainRow.mainSteamId] : []),
					...linkedAltRows.map((row) => row.steamId)
				])
			);

			const lastSeenByAccount = new Map<string, Date | null>();
			if (confirmedIds.length > 0) {
				const activityRows = await db
					.select({
						steamId: whoisLogs.steamId,
						lastTimestamp: sql<number | null>`max(${whoisLogs.timestamp})`
					})
					.from(whoisLogs)
					.where(inArray(whoisLogs.steamId, confirmedIds))
					.groupBy(whoisLogs.steamId);
				for (const row of activityRows) {
					if (!row.steamId) continue;
					lastSeenByAccount.set(
						row.steamId,
						row.lastTimestamp != null ? new Date(Number(row.lastTimestamp) * 1000) : null
					);
				}
			}

			const linkedAlts: AltInvestigationLink[] = linkedAltRows
				.map((row) => ({
					steamid: row.steamId,
					mainSteamId: row.mainSteamId,
					linkedAt: row.linkedAt ?? new Date(0),
					linkedBy: row.linkedBy,
					lastSeen: lastSeenByAccount.get(row.steamId) ?? null
				}))
				.sort(byMostRecentFirst);
			const linkedMain: AltInvestigationLink | null = linkedMainRow
				? {
						steamid: linkedMainRow.steamId,
						mainSteamId: linkedMainRow.mainSteamId,
						linkedAt: linkedMainRow.linkedAt ?? new Date(0),
						linkedBy: linkedMainRow.linkedBy,
						lastSeen: linkedMainRow.mainSteamId
							? (lastSeenByAccount.get(linkedMainRow.mainSteamId) ?? null)
							: null
					}
				: null;

			const rawSubjectIps = dedupeInOrder(subjectRows.map((row) => row.ip)).slice(0, 500);
			const subjectNames = dedupeInOrder(subjectRows.map((row) => row.name));

			// Drop known VPN/datacenter IPs before scanning for shared accounts: a public
			// VPN exit node coinciding with the subject is not evidence of an alt.
			const ipClassifications = await Promise.all(rawSubjectIps.map(classifyIp));
			const subjectIps = rawSubjectIps.filter((_, index) => ipClassifications[index] === null);

			if (subjectIps.length === 0) {
				return tag<AltInvestigation>({ candidates: [], linkedAlts, linkedMain });
			}

			const excluded = new Set<string>([
				id2,
				...linkedAlts.map((link) => link.steamid),
				...(linkedMain ? [linkedMain.mainSteamId ?? ''] : [])
			]);

			const sharedRows = await db
				.select({
					steamId: whoisLogs.steamId,
					ip: whoisLogs.ip,
					name: whoisLogs.name,
					timestamp: whoisLogs.timestamp,
					date: whoisLogs.date,
					time: whoisLogs.time
				})
				.from(whoisLogs)
				.where(and(inArray(whoisLogs.ip, subjectIps), inWindow))
				.limit(ALT_SCAN_FETCH_CAP);

			/** How many distinct accounts were seen on each subject IP (rarer IPs weigh more). */
			const accountsPerIp = new Map<string, Set<string>>();
			for (const row of sharedRows) {
				if (!row.ip || !row.steamId) continue;
				const set = accountsPerIp.get(row.ip) ?? new Set<string>();
				set.add(row.steamId);
				accountsPerIp.set(row.ip, set);
			}

			type CandidateAgg = { ips: Set<string>; names: Set<string>; lastSeen: Date | null };
			const candidatesById = new Map<string, CandidateAgg>();
			for (const row of sharedRows) {
				if (!row.steamId || !row.ip || excluded.has(row.steamId)) continue;
				const agg = candidatesById.get(row.steamId) ?? {
					ips: new Set(),
					names: new Set(),
					lastSeen: null
				};
				agg.ips.add(row.ip);
				if (row.name) agg.names.add(row.name);
				const rowDate = toLogDate(row);
				if (rowDate && (!agg.lastSeen || rowDate > agg.lastSeen)) agg.lastSeen = rowDate;
				candidatesById.set(row.steamId, agg);
			}

			const candidates: AltCandidate[] = Array.from(candidatesById.entries())
				.map(([candidateSteamid, agg]) => {
					const ipScore = Array.from(agg.ips).reduce((sum, ip) => {
						const accountCountOnIp = accountsPerIp.get(ip)?.size ?? 1;
						return sum + 1 / Math.min(accountCountOnIp, 10);
					}, 0);
					const ipOverlapScore = Math.min(1, ipScore / 3);

					const nameSimilarityScore = Math.max(
						0,
						...subjectNames.flatMap((subjectName) =>
							Array.from(agg.names).map(
								(candidateName) => stringSimilarity(subjectName, candidateName) * 0.6
							)
						),
						0
					);

					const score =
						ipOverlapScore * IP_OVERLAP_WEIGHT + nameSimilarityScore * NAME_SIMILARITY_WEIGHT;
					const label: AltCandidate['label'] =
						score >= 0.7 ? 'Likely' : score >= 0.4 ? 'Possible' : 'Unlikely';

					return {
						steamid: candidateSteamid,
						score,
						label,
						sharedIps: Array.from(agg.ips),
						knownNames: Array.from(agg.names),
						evidence: { ipOverlapScore, nameSimilarityScore },
						lastSeen: agg.lastSeen
					} satisfies AltCandidate;
				})
				.sort((a, b) => b.score - a.score)
				.slice(0, ALT_CANDIDATES_TAKE)
				.sort(byMostRecentFirst);

			return tag<AltInvestigation>({ candidates, linkedAlts, linkedMain });
		}
	};
}
