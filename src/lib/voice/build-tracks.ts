import type { VoiceManifest, VoiceManifestSegment } from '$lib/voice/types';

/** Max contiguous remix window per Multitrack clip (~55MB float @ 24 kHz). */
const MAX_SPAN_SECONDS = 600;

export type SpeakerClip = {
	url: string;
	/** Timeline offset in seconds (Multitrack `startPosition`). */
	startPosition: number;
};

export type SpeakerTrack = {
	steamId: string;
	name: string;
	segments: VoiceManifestSegment[];
	clips: SpeakerClip[];
};

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
	const buffer = new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(buffer);
	const writeStr = (offset: number, str: string) => {
		for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
	};
	writeStr(0, 'RIFF');
	view.setUint32(4, 36 + samples.length * 2, true);
	writeStr(8, 'WAVE');
	writeStr(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeStr(36, 'data');
	view.setUint32(40, samples.length * 2, true);
	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const s = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
		offset += 2;
	}
	return new Blob([buffer], { type: 'audio/wav' });
}

/** True when the buffer looks like a WAV with at least one PCM sample. */
function hasPcmPayload(arrayBuffer: ArrayBuffer): boolean {
	if (arrayBuffer.byteLength <= 44) return false;
	const view = new DataView(arrayBuffer);
	if (view.getUint32(0, false) !== 0x52494646) return false; // RIFF
	if (view.getUint32(8, false) !== 0x57415645) return false; // WAVE
	// Standard PCM header from voice-processor: data size at byte 40.
	const dataSize = view.getUint32(40, true);
	return dataSize > 0;
}

/**
 * Packs segments into windows where (last.end - first.start) <= maxSpan,
 * preserving chronological order.
 */
function windowSegments(
	segments: VoiceManifestSegment[],
	maxSpan: number
): VoiceManifestSegment[][] {
	const sorted = [...segments].sort((a, b) => a.start_seconds - b.start_seconds);
	const windows: VoiceManifestSegment[][] = [];
	let current: VoiceManifestSegment[] = [];
	let windowStart = 0;

	for (const segment of sorted) {
		if (current.length === 0) {
			current = [segment];
			windowStart = segment.start_seconds;
			continue;
		}
		if (segment.end_seconds - windowStart > maxSpan) {
			windows.push(current);
			current = [segment];
			windowStart = segment.start_seconds;
		} else {
			current.push(segment);
		}
	}
	if (current.length > 0) windows.push(current);
	return windows;
}

async function decodeSegment(
	ctx: AudioContext,
	demoId: string,
	segment: VoiceManifestSegment
): Promise<Float32Array | null> {
	const res = await fetch(`/api/voice/${demoId}/audio/${segment.file}`);
	if (!res.ok) return null;
	const arrayBuffer = await res.arrayBuffer();
	if (!hasPcmPayload(arrayBuffer)) return null;
	try {
		const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
		if (decoded.length === 0) return null;
		return decoded.getChannelData(0);
	} catch {
		return null;
	}
}

async function mixWindow(
	ctx: AudioContext,
	demoId: string,
	segments: VoiceManifestSegment[],
	sampleRate: number
): Promise<SpeakerClip | null> {
	const startPosition = Math.min(...segments.map((s) => s.start_seconds));
	const endSeconds = Math.max(...segments.map((s) => s.end_seconds));
	const span = Math.max(endSeconds - startPosition, 0.05);
	const mixed = new Float32Array(Math.ceil(span * sampleRate));
	let placed = 0;

	for (const segment of segments) {
		const channel = await decodeSegment(ctx, demoId, segment);
		if (!channel) continue;
		const start = Math.floor((segment.start_seconds - startPosition) * sampleRate);
		for (let i = 0; i < channel.length && start + i < mixed.length; i++) {
			mixed[start + i] += channel[i];
		}
		placed += 1;
	}

	if (placed === 0) return null;
	const blob = encodeWav(mixed, sampleRate);
	return { url: URL.createObjectURL(blob), startPosition };
}

/**
 * Builds one or more timeline clips per speaker. Empty / undecodable utterance
 * WAVs are skipped. Long speaker spans are split into windows so the browser
 * never allocates a multi-hour mix buffer.
 *
 * `decodeAudioData` resamples into the AudioContext's rate, so the mix buffer
 * and output WAV must use that same rate — not the source files' 24 kHz header.
 */
export async function buildSpeakerTracks(
	demoId: string,
	manifest: VoiceManifest
): Promise<SpeakerTrack[]> {
	const ctx = new AudioContext({ sampleRate: 24000 });
	const sampleRate = ctx.sampleRate;
	const bySpeaker = new Map<string, VoiceManifestSegment[]>();
	for (const segment of manifest.segments) {
		const list = bySpeaker.get(segment.steam_id) ?? [];
		list.push(segment);
		bySpeaker.set(segment.steam_id, list);
	}

	const tracks: SpeakerTrack[] = [];
	for (const [steamId, segments] of bySpeaker) {
		const clips: SpeakerClip[] = [];
		for (const window of windowSegments(segments, MAX_SPAN_SECONDS)) {
			const clip = await mixWindow(ctx, demoId, window, sampleRate);
			if (clip) clips.push(clip);
		}
		if (clips.length === 0) continue;
		tracks.push({
			steamId,
			name: manifest.players[steamId]?.trim() || steamId,
			segments,
			clips
		});
	}

	await ctx.close();
	tracks.sort((a, b) => a.name.localeCompare(b.name));
	return tracks;
}

export function revokeSpeakerTracks(tracks: SpeakerTrack[]) {
	for (const track of tracks) {
		for (const clip of track.clips) {
			URL.revokeObjectURL(clip.url);
		}
	}
}

export function activeSteamIds(tracks: SpeakerTrack[], time: number): Set<string> {
	const active = new Set<string>();
	for (const track of tracks) {
		if (
			track.segments.some(
				(segment) => time >= segment.start_seconds && time <= segment.end_seconds + 0.05
			)
		) {
			active.add(track.steamId);
		}
	}
	return active;
}
