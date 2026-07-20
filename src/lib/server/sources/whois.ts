import { getSource, sourceHas } from './registry';
import { registerCapability } from './capability-registry';
import { buildWhoisAdapter } from './whois/adapter';
import type { WhoisAdapter } from './whois/types';
import type { SourceId } from './types';

const adapters = new Map<SourceId, WhoisAdapter>();

/** Returns the (cached) `WhoisAdapter` for a source. Throws if it lacks the `whois` capability. */
export function whoisFor(sourceId: SourceId): WhoisAdapter {
	const existing = adapters.get(sourceId);
	if (existing) return existing;

	const source = getSource(sourceId);
	if (!sourceHas(sourceId, 'whois')) {
		throw new Error(`Source "${sourceId}" has no whois capability.`);
	}

	const adapter = buildWhoisAdapter(source);
	adapters.set(sourceId, adapter);
	return adapter;
}

registerCapability('whois', { invalidate: (sourceId) => adapters.delete(sourceId) });
