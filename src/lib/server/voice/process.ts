import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import {
	ensureVoiceDemoDir,
	getVoiceManifestPath,
	getVoiceProcessorPath,
	getVoiceSourcePath
} from '$lib/server/voice/paths';
import { updateVoiceDemo } from '$lib/server/voice/db';
import type { VoiceManifest } from '$lib/voice/types';

function runProcessor(demoPath: string, outDir: string): Promise<{ code: number; stderr: string }> {
	const bin = getVoiceProcessorPath();
	return new Promise((resolvePromise, reject) => {
		const child = spawn(bin, [demoPath, outDir], {
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});
		let stderr = '';
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('error', (err) => reject(err));
		child.on('close', (code) => {
			resolvePromise({ code: code ?? 1, stderr });
		});
	});
}

export async function readVoiceManifest(id: string): Promise<VoiceManifest> {
	const raw = await readFile(getVoiceManifestPath(id), 'utf8');
	return JSON.parse(raw) as VoiceManifest;
}

/**
 * Spawns `voice-processor` against the demo's on-disk `source.dem` and updates
 * the SQLite row from the resulting manifest (or marks the row failed).
 */
export async function processVoiceDemo(id: string): Promise<VoiceManifest> {
	const outDir = ensureVoiceDemoDir(id);
	const demoPath = getVoiceSourcePath(id);

	updateVoiceDemo(id, {
		status: 'processing',
		errorMessage: null
	});

	try {
		const { code, stderr } = await runProcessor(demoPath, outDir);
		if (code !== 0) {
			throw new Error(stderr.trim() || `voice-processor exited with code ${code}`);
		}

		const manifest = await readVoiceManifest(id);
		updateVoiceDemo(id, {
			status: 'processed',
			map: manifest.map || null,
			durationSeconds: Number.isFinite(manifest.duration_seconds)
				? Math.round(manifest.duration_seconds)
				: null,
			errorMessage: null,
			processedAt: new Date()
		});
		return manifest;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updateVoiceDemo(id, {
			status: 'failed',
			errorMessage: message.slice(0, 2000),
			processedAt: new Date()
		});
		throw err instanceof Error ? err : new Error(message);
	}
}
