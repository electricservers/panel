import { error } from '@sveltejs/kit';
import { isModuleEnabled } from '$lib/server/db/module-toggles';
import type { Capability } from '$lib/server/sources/types';

/**
 * Throws a SvelteKit 404 unless `capability` is enabled in `/admin/settings`.
 * Call as the first line of every route `load`/`action` that belongs to a
 * toggleable module, so a disabled module disappears entirely instead of
 * just hiding its nav link (see docs/modules/admin.md).
 */
export function requireModule(capability: Capability): void {
	if (!isModuleEnabled(capability)) {
		error(404, 'Not found.');
	}
}
