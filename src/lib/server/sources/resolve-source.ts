import { error } from '@sveltejs/kit';
import { listSources } from './registry';
import type { SourceId } from './types';

/**
 * Resolves which source an MGE page should query: the `?source=` query
 * param if it names an enabled `mgemod` source, else the first enabled one.
 * Synchronous and fast, per docs/modules/loading.md's "fast in load" rule.
 */
export function resolveMgeSourceId(url: URL): SourceId {
	const enabledMgeSources = listSources({ capability: 'mgemod', enabled: true });

	const requested = url.searchParams.get('source');
	if (requested && enabledMgeSources.some((source) => source.id === requested)) {
		return requested;
	}

	const [first] = enabledMgeSources;
	if (!first) {
		throw error(503, 'No mgemod source is configured.');
	}
	return first.id;
}
