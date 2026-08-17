import { error } from '@sveltejs/kit';
import { existsSync, statSync } from 'node:fs';
import { requireRole } from '$lib/server/require-role';
import { getSteamProfiles } from '$lib/server/steam-profiles';
import { getVoiceDemo, updateVoiceDemo } from '$lib/server/voice/db';
import { getVoiceSourcePath } from '$lib/server/voice/paths';
import { readVoiceManifest } from '$lib/server/voice/process';
import type { PageServerLoad } from './$types';

function resolveRecordedAt(demoId: string, recordedAt: Date | null): Date | null {
	if (recordedAt) return recordedAt;
	const sourcePath = getVoiceSourcePath(demoId);
	if (!existsSync(sourcePath)) return null;
	const mtime = statSync(sourcePath).mtime;
	updateVoiceDemo(demoId, { recordedAt: mtime });
	return mtime;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, ['admin', 'owner']);
	const demo = getVoiceDemo(params.id);
	if (!demo) {
		error(404, 'Demo not found.');
	}

	const recordedAt = resolveRecordedAt(demo.id, demo.recordedAt);

	if (demo.status !== 'processed') {
		return {
			demo: { ...demo, recordedAt },
			manifest: null,
			speakerAvatars: {} as Record<string, string>
		};
	}
	try {
		const manifest = await readVoiceManifest(demo.id);

		const profiles = await getSteamProfiles(Object.keys(manifest.players));
		const speakerAvatars: Record<string, string> = {};
		for (const [steam64, profile] of profiles) {
			if (profile.avatarmedium) speakerAvatars[steam64] = profile.avatarmedium;
		}

		return {
			demo: { ...demo, recordedAt },
			manifest,
			speakerAvatars
		};
	} catch {
		error(500, 'Processed demo is missing its manifest.');
	}
};
