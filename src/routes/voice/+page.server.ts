import { fail } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import { requireRole } from '$lib/server/require-role';
import { insertVoiceDemo, listVoiceDemos } from '$lib/server/voice/db';
import { ensureVoiceDemoDir, getVoiceSourcePath } from '$lib/server/voice/paths';
import { processVoiceDemo } from '$lib/server/voice/process';
import { parseBrowserLastModified } from '$lib/voice/session-clock';
import type { Actions, PageServerLoad } from './$types';

const MAX_DEMO_BYTES = 200 * 1024 * 1024;

export const load: PageServerLoad = ({ locals }) => {
	requireRole(locals, ['admin', 'owner']);
	return {
		demos: listVoiceDemos()
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const user = requireRole(locals, ['admin', 'owner']);
		const form = await request.formData();
		const file = form.get('demo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choose a .dem file to upload.' });
		}
		if (!file.name.toLowerCase().endsWith('.dem')) {
			return fail(400, { message: 'Only .dem files are accepted.' });
		}
		if (file.size > MAX_DEMO_BYTES) {
			return fail(400, { message: 'Demo file is too large (max 200 MB).' });
		}

		const id = crypto.randomUUID();
		ensureVoiceDemoDir(id);
		const bytes = Buffer.from(await file.arrayBuffer());
		await writeFile(getVoiceSourcePath(id), bytes);
		const recordedAt = parseBrowserLastModified(form.get('lastModified'));
		insertVoiceDemo({
			id,
			originalFilename: file.name,
			uploaderSteamId: user.steamId,
			recordedAt
		});
		return { success: true, id };
	},

	process: async ({ request, locals }) => {
		requireRole(locals, ['admin', 'owner']);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) {
			return fail(400, { message: 'Missing demo id.' });
		}
		try {
			await processVoiceDemo(id);
			return { success: true, id };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Processing failed.';
			return fail(500, { message, id });
		}
	}
};
