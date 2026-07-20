import { listSourceRows } from '$lib/server/db/sources';
import type { Capability, FanOutResult, Source, SourceId } from './types';

let cachedSources: Source[] | null = null;
let cachedDsnEnvBySourceId: Map<SourceId, string> | null = null;

function loadSources(): Source[] {
	if (cachedSources) return cachedSources;

	const rows = listSourceRows();
	cachedSources = rows.map((row) => ({
		id: row.id,
		label: row.label,
		enabled: row.enabled,
		capabilities: row.capabilities
	}));
	cachedDsnEnvBySourceId = new Map(rows.map((row) => [row.id, row.dsnEnv]));
	return cachedSources;
}

/** Clears the in-memory sources cache so admin mutations take effect without a restart. */
export function invalidateSourcesCache(): void {
	cachedSources = null;
	cachedDsnEnvBySourceId = null;
}

/**
 * Internal-only lookup from source id to the env var name holding its DSN.
 * Kept out of the public `Source` type so UI code never sees env plumbing.
 */
export function getSourceDsnEnv(id: SourceId): string {
	loadSources();
	const dsnEnv = cachedDsnEnvBySourceId?.get(id);
	if (!dsnEnv) {
		throw new Error(`Unknown source id "${id}".`);
	}
	return dsnEnv;
}

export function listSources(filter?: { capability?: Capability; enabled?: boolean }): Source[] {
	let result = loadSources();
	if (filter?.enabled !== undefined) {
		result = result.filter((source) => source.enabled === filter.enabled);
	}
	if (filter?.capability) {
		result = result.filter((source) => source.capabilities.includes(filter.capability!));
	}
	return result;
}

export function getSource(id: string): Source {
	const source = loadSources().find((candidate) => candidate.id === id);
	if (!source) {
		throw new Error(`Unknown source id "${id}".`);
	}
	return source;
}

export function sourceHas(id: string, capability: Capability): boolean {
	return getSource(id).capabilities.includes(capability);
}

/**
 * Runs `run` against every given source in parallel and tags each result
 * with its sourceId. A failure in one source never throws for the others.
 *
 * @public consumed by presence badges on the M2 player profile.
 */
export async function fanOut<T>(
	sources: Source[],
	run: (source: Source) => Promise<T>
): Promise<FanOutResult<T>[]> {
	return Promise.all(
		sources.map(async (source): Promise<FanOutResult<T>> => {
			try {
				const data = await run(source);
				return { sourceId: source.id, ok: true, data };
			} catch (error) {
				return {
					sourceId: source.id,
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		})
	);
}
