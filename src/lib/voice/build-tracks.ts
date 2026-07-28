import type { VoiceManifest, VoiceManifestSegment } from '$lib/voice/types';

export type SpeakerTrack = {
	steamId: string;
	name: string;
	segments: VoiceManifestSegment[];
	/** Object URL of a full-duration padded WAV for this speaker. */
	url: string;
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

function sessionDuration(manifest: VoiceManifest): number {
	const fromSegments = manifest.segments.reduce(
		(max, segment) => Math.max(max, segment.end_seconds),
		0
	);
	return Math.max(manifest.duration_seconds, fromSegments, 0.1);
}

/**
 * Builds one full-session audio track per speaker by placing each utterance
 * WAV at its `start_seconds` offset inside a silent buffer of session duration.
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
	const duration = sessionDuration(manifest);
	const bySpeaker = new Map<string, VoiceManifestSegment[]>();
	for (const segment of manifest.segments) {
		const list = bySpeaker.get(segment.steam_id) ?? [];
		list.push(segment);
		bySpeaker.set(segment.steam_id, list);
	}

	const tracks: SpeakerTrack[] = [];
	for (const [steamId, segments] of bySpeaker) {
		const totalSamples = Math.ceil(duration * sampleRate);
		const mixed = new Float32Array(totalSamples);

		for (const segment of segments) {
			const res = await fetch(`/api/voice/${demoId}/audio/${segment.file}`);
			if (!res.ok) continue;
			const arrayBuffer = await res.arrayBuffer();
			const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
			const channel = decoded.getChannelData(0);
			const start = Math.floor(segment.start_seconds * sampleRate);
			for (let i = 0; i < channel.length && start + i < mixed.length; i++) {
				mixed[start + i] += channel[i];
			}
		}

		const blob = encodeWav(mixed, sampleRate);
		tracks.push({
			steamId,
			name: manifest.players[steamId]?.trim() || steamId,
			segments,
			url: URL.createObjectURL(blob)
		});
	}

	await ctx.close();
	tracks.sort((a, b) => a.name.localeCompare(b.name));
	return tracks;
}

export function revokeSpeakerTracks(tracks: SpeakerTrack[]) {
	for (const track of tracks) {
		URL.revokeObjectURL(track.url);
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
