import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { sources, type SourceRow } from './schema';
import type { Capability, SourceId } from '$lib/server/sources/types';

export type NewSourceInput = {
	id: SourceId;
	label: string;
	dsnEnv: string;
	capabilities: Capability[];
	enabled: boolean;
};

export type SourcePatch = Partial<Omit<NewSourceInput, 'id'>>;

export function listSourceRows(): SourceRow[] {
	const db = getDb();
	return db.select().from(sources).orderBy(sources.id).all();
}

export function getSourceRow(id: SourceId): SourceRow | null {
	const db = getDb();
	return db.select().from(sources).where(eq(sources.id, id)).get() ?? null;
}

export function createSource(input: NewSourceInput): SourceRow {
	const db = getDb();
	const now = new Date();
	db.insert(sources)
		.values({
			id: input.id,
			label: input.label,
			dsnEnv: input.dsnEnv,
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
	db.update(sources)
		.set({ ...patch, updatedAt: new Date() })
		.where(eq(sources.id, id))
		.run();
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
