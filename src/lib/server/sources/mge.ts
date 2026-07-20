import { getSource, sourceHas } from './registry';
import { registerCapability } from './capability-registry';
import { buildMgeAdapter } from './mgemod/adapter';
import type { MgeAdapter } from './mgemod/types';
import type { SourceId } from './types';

const adapters = new Map<SourceId, MgeAdapter>();

/** Returns the (cached) `MgeAdapter` for a source. Throws if it lacks the `mgemod` capability. */
export function mgeFor(sourceId: SourceId): MgeAdapter {
	const existing = adapters.get(sourceId);
	if (existing) return existing;

	const source = getSource(sourceId);
	if (!sourceHas(sourceId, 'mgemod')) {
		throw new Error(`Source "${sourceId}" has no mgemod capability.`);
	}

	const adapter = buildMgeAdapter(source);
	adapters.set(sourceId, adapter);
	return adapter;
}

registerCapability('mgemod', { invalidate: (sourceId) => adapters.delete(sourceId) });
