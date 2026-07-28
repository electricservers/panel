import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { getPanelEnv } from '$lib/server/env';

function resolvePanelDataDir(): string {
	const { PANEL_DB_URL } = getPanelEnv();
	const withoutScheme = PANEL_DB_URL.startsWith('file:')
		? PANEL_DB_URL.slice('file:'.length)
		: PANEL_DB_URL;
	return dirname(resolve(withoutScheme));
}

/** Root directory for per-demo folders (`source.dem`, WAVs, manifest). */
function getVoiceDataDir(): string {
	const configured = env.VOICE_DATA_DIR?.trim();
	if (configured) return resolve(configured);
	return join(resolvePanelDataDir(), 'voice');
}

function getVoiceDemoDir(id: string): string {
	return join(getVoiceDataDir(), id);
}

export function getVoiceSourcePath(id: string): string {
	return join(getVoiceDemoDir(id), 'source.dem');
}

export function getVoiceManifestPath(id: string): string {
	return join(getVoiceDemoDir(id), 'manifest.json');
}

export function getVoiceAudioPath(id: string, file: string): string {
	return join(getVoiceDemoDir(id), file);
}

export function ensureVoiceDemoDir(id: string): string {
	const dir = getVoiceDemoDir(id);
	mkdirSync(dir, { recursive: true });
	return dir;
}

/** Absolute path to the `voice-processor` binary, or a name resolved via PATH. */
export function getVoiceProcessorPath(): string {
	const configured = env.VOICE_PROCESSOR_PATH?.trim();
	if (configured) return configured;
	return process.platform === 'win32' ? 'voice-processor.exe' : 'voice-processor';
}
