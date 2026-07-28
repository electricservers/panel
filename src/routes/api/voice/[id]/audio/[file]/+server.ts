import { error } from '@sveltejs/kit';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { requireRole } from '$lib/server/require-role';
import { getVoiceDemo } from '$lib/server/voice/db';
import { getVoiceAudioPath } from '$lib/server/voice/paths';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	requireRole(locals, ['admin', 'owner']);
	const demo = getVoiceDemo(params.id);
	if (!demo || demo.status !== 'processed') {
		error(404, 'Audio not found.');
	}

	const file = params.file;
	if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
		error(400, 'Invalid audio filename.');
	}
	if (!file.endsWith('.wav')) {
		error(400, 'Only WAV audio is served.');
	}

	const path = getVoiceAudioPath(params.id, file);
	if (!existsSync(path)) {
		error(404, 'Audio not found.');
	}

	const { size } = statSync(path);
	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, {
		headers: {
			'Content-Type': 'audio/wav',
			'Content-Length': String(size),
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
