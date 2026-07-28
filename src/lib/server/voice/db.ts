import { desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { voiceDemos, type VoiceDemoRow } from '$lib/server/db/schema';

export type VoiceDemoStatus = VoiceDemoRow['status'];

export function listVoiceDemos(): VoiceDemoRow[] {
	return getDb().select().from(voiceDemos).orderBy(desc(voiceDemos.uploadedAt)).all();
}

export function getVoiceDemo(id: string): VoiceDemoRow | null {
	return getDb().select().from(voiceDemos).where(eq(voiceDemos.id, id)).get() ?? null;
}

export function insertVoiceDemo(input: {
	id: string;
	originalFilename: string;
	uploaderSteamId: string;
	recordedAt?: Date | null;
}): VoiceDemoRow {
	const now = new Date();
	getDb()
		.insert(voiceDemos)
		.values({
			id: input.id,
			originalFilename: input.originalFilename,
			uploaderSteamId: input.uploaderSteamId,
			status: 'uploaded',
			recordedAt: input.recordedAt ?? null,
			uploadedAt: now
		})
		.run();
	return getVoiceDemo(input.id)!;
}

export function updateVoiceDemo(
	id: string,
	patch: Partial<{
		status: VoiceDemoStatus;
		map: string | null;
		durationSeconds: number | null;
		errorMessage: string | null;
		recordedAt: Date | null;
		processedAt: Date | null;
	}>
): VoiceDemoRow | null {
	getDb().update(voiceDemos).set(patch).where(eq(voiceDemos.id, id)).run();
	return getVoiceDemo(id);
}
