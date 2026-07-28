import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role';
import { getVoiceDemo } from '$lib/server/voice/db';
import { readVoiceManifest } from '$lib/server/voice/process';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	requireRole(locals, ['admin', 'owner']);
	const demo = getVoiceDemo(params.id);
	if (!demo || demo.status !== 'processed') {
		error(404, 'Manifest not found.');
	}
	try {
		const manifest = await readVoiceManifest(demo.id);
		return json(manifest);
	} catch {
		error(404, 'Manifest not found.');
	}
};
