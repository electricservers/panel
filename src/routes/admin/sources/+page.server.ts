import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role';
import {
	createSource,
	deleteSource,
	getSourceRow,
	listSourceAdminViews,
	updateSource
} from '$lib/server/db/sources';
import { assertMysqlDsn } from '$lib/server/secrets/dsn';
import { invalidateSourcesCache } from '$lib/server/sources/registry';
import { invalidateCapabilitiesForSource } from '$lib/server/sources/capability-registry';
import { invalidateSourcePool } from '$lib/server/sources/pool';
import { KNOWN_CAPABILITIES, type Capability } from '$lib/server/sources/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		sourceRows: listSourceAdminViews(),
		knownCapabilities: KNOWN_CAPABILITIES
	};
};

function readCapabilities(form: FormData): Capability[] {
	return form
		.getAll('capabilities')
		.map(String)
		.filter((value): value is Capability => KNOWN_CAPABILITIES.includes(value as Capability));
}

function readDsn(form: FormData): string {
	return String(form.get('dsn') ?? '').trim();
}

function invalidDsnMessage(dsn: string): string | null {
	try {
		assertMysqlDsn(dsn);
		return null;
	} catch (error) {
		return error instanceof Error ? error.message : 'Invalid connection string.';
	}
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
		const dsn = readDsn(form);
		const capabilities = readCapabilities(form);
		const enabled = form.get('enabled') === 'on';

		if (!id || !label || !dsn) {
			return fail(400, { message: 'Id, label, and connection string are required.' });
		}
		if (!/^[a-z0-9-]+$/.test(id)) {
			return fail(400, { message: 'Id must be lowercase letters, numbers, and hyphens only.' });
		}
		if (getSourceRow(id)) {
			return fail(400, { message: `Source "${id}" already exists.` });
		}
		const dsnError = invalidDsnMessage(dsn);
		if (dsnError) {
			return fail(400, { message: dsnError });
		}

		createSource({ id, label, dsn, capabilities, enabled });
		invalidateSource(id);
		return { success: true };
	},

	update: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const label = String(form.get('label') ?? '').trim();
		const dsn = readDsn(form);
		const capabilities = readCapabilities(form);
		const enabled = form.get('enabled') === 'on';

		if (!id || !getSourceRow(id)) {
			return fail(400, { message: 'Unknown source.' });
		}
		if (!label) {
			return fail(400, { message: 'Label is required.' });
		}
		if (dsn) {
			const dsnError = invalidDsnMessage(dsn);
			if (dsnError) {
				return fail(400, { message: dsnError });
			}
		}

		updateSource(id, {
			label,
			capabilities,
			enabled,
			...(dsn ? { dsn } : {})
		});
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
