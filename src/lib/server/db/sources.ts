import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { sources, type SourceRow } from './schema';
import type { Capability, SourceId } from '$lib/server/sources/types';
import { decryptSourceDsn, encryptSourceDsn, redactDsn } from '$lib/server/secrets/dsn';

export type NewSourceInput = {
	id: SourceId;
	label: string;
	dsn: string;
	capabilities: Capability[];
	enabled: boolean;
};

export type SourcePatch = Partial<Omit<NewSourceInput, 'id'>>;

export type SourceAdminView = {
	id: SourceId;
	label: string;
	capabilities: Capability[];
	enabled: boolean;
	dsnPreview: string | null;
	dsnConfigured: boolean;
	dsnDecryptable: boolean;
};

export function listSourceRows(): SourceRow[] {
	const db = getDb();
	return db.select().from(sources).orderBy(sources.id).all();
}

export function getSourceRow(id: SourceId): SourceRow | null {
	const db = getDb();
	return db.select().from(sources).where(eq(sources.id, id)).get() ?? null;
}

function toSourceAdminView(row: SourceRow): SourceAdminView {
	const dsnConfigured = row.dsnCiphertext.length > 0;
	if (!dsnConfigured) {
		return {
			id: row.id,
			label: row.label,
			capabilities: row.capabilities,
			enabled: row.enabled,
			dsnPreview: null,
			dsnConfigured: false,
			dsnDecryptable: false
		};
	}
	try {
		return {
			id: row.id,
			label: row.label,
			capabilities: row.capabilities,
			enabled: row.enabled,
			dsnPreview: redactDsn(decryptSourceDsn(row.dsnCiphertext, row.id)),
			dsnConfigured: true,
			dsnDecryptable: true
		};
	} catch {
		return {
			id: row.id,
			label: row.label,
			capabilities: row.capabilities,
			enabled: row.enabled,
			dsnPreview: null,
			dsnConfigured: true,
			dsnDecryptable: false
		};
	}
}

export function listSourceAdminViews(): SourceAdminView[] {
	return listSourceRows().map(toSourceAdminView);
}

export function getSourceDsn(id: SourceId): string {
	const row = getSourceRow(id);
	if (!row) {
		throw new Error(`Unknown source id "${id}".`);
	}
	if (!row.dsnCiphertext) {
		throw new Error(`Source "${id}" has no connection string. Set it from /admin/sources.`);
	}
	return decryptSourceDsn(row.dsnCiphertext, id);
}

export function createSource(input: NewSourceInput): SourceRow {
	const db = getDb();
	const now = new Date();
	db.insert(sources)
		.values({
			id: input.id,
			label: input.label,
			dsnCiphertext: encryptSourceDsn(input.dsn, input.id),
			capabilities: input.capabilities,
			enabled: input.enabled,
			createdAt: now,
			updatedAt: now
		})
		.run();
	return getSourceRow(input.id)!;
}

export function updateSource(id: SourceId, patch: SourcePatch): SourceRow {
	const db = getDb();
	const values: Partial<SourceRow> = { updatedAt: new Date() };
	if (patch.label !== undefined) values.label = patch.label;
	if (patch.capabilities !== undefined) values.capabilities = patch.capabilities;
	if (patch.enabled !== undefined) values.enabled = patch.enabled;
	if (patch.dsn !== undefined) values.dsnCiphertext = encryptSourceDsn(patch.dsn, id);

	db.update(sources).set(values).where(eq(sources.id, id)).run();
	const row = getSourceRow(id);
	if (!row) {
		throw new Error(`Unknown source id "${id}".`);
	}
	return row;
}

export function deleteSource(id: SourceId): void {
	const db = getDb();
	db.delete(sources).where(eq(sources.id, id)).run();
}
