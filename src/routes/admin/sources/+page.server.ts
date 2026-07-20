import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role';
import {
	createSource,
	deleteSource,
	getSourceRow,
	listSourceRows,
	updateSource
} from '$lib/server/db/sources';
import { invalidateSourcesCache } from '$lib/server/sources/registry';
import { invalidateCapabilitiesForSource } from '$lib/server/sources/capability-registry';
import { invalidateSourcePool } from '$lib/server/sources/pool';
import { KNOWN_CAPABILITIES, type Capability } from '$lib/server/sources/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		sourceRows: listSourceRows(),
		knownCapabilities: KNOWN_CAPABILITIES
	};
};

function readCapabilities(form: FormData): Capability[] {
	return form
		.getAll('capabilities')
		.map(String)
		.filter((value): value is Capability => KNOWN_CAPABILITIES.includes(value as Capability));
}

/** Invalidates every cache that keys off a source id, regardless of which field changed. */
function invalidateSource(id: string) {
	invalidateSourcesCache();
	invalidateCapabilitiesForSource(id);
	invalidateSourcePool(id);
}

export const actions = {
	create: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const label = String(form.get('label') ?? '').trim();
		const dsnEnv = String(form.get('dsnEnv') ?? '').trim();
		const capabilities = readCapabilities(form);
		const enabled = form.get('enabled') === 'on';

		if (!id || !label || !dsnEnv) {
			return fail(400, { message: 'Id, label, and DSN env var are required.' });
		}
		if (!/^[a-z0-9-]+$/.test(id)) {
			return fail(400, { message: 'Id must be lowercase letters, numbers, and hyphens only.' });
		}
		if (getSourceRow(id)) {
			return fail(400, { message: `Source "${id}" already exists.` });
		}

		createSource({ id, label, dsnEnv, capabilities, enabled });
		invalidateSource(id);
		return { success: true };
	},

	update: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const label = String(form.get('label') ?? '').trim();
		const dsnEnv = String(form.get('dsnEnv') ?? '').trim();
		const capabilities = readCapabilities(form);
		const enabled = form.get('enabled') === 'on';

		if (!id || !getSourceRow(id)) {
			return fail(400, { message: 'Unknown source.' });
		}
		if (!label || !dsnEnv) {
			return fail(400, { message: 'Label and DSN env var are required.' });
		}

		updateSource(id, { label, dsnEnv, capabilities, enabled });
		invalidateSource(id);
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) {
			return fail(400, { message: 'Missing source id.' });
		}

		deleteSource(id);
		invalidateSource(id);
		return { success: true };
	}
};
