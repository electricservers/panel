import type { Capability, SourceId } from './types';

type CapabilityHooks = {
	invalidate(sourceId: SourceId): void;
};

const registry = new Map<Capability, CapabilityHooks>();

/**
 * Called once by each capability module (e.g. `mge.ts`, `whois.ts`) to
 * register its own adapter-cache invalidation. Keeps the admin layer from
 * having to name every capability when a source changes.
 */
export function registerCapability(capability: Capability, hooks: CapabilityHooks): void {
	registry.set(capability, hooks);
}

/** Invalidates every registered capability's adapter cache for a source. */
export function invalidateCapabilitiesForSource(sourceId: SourceId): void {
	for (const hooks of registry.values()) {
		hooks.invalidate(sourceId);
	}
}
