import type { VoiceManifest, VoiceManifestSegment } from '$lib/voice/types';

export type SpeakerTrack = {
	steamId: string;
	name: string;
	segments: VoiceManifestSegment[];
};

export function groupSpeakerTracks(manifest: VoiceManifest): SpeakerTrack[] {
	const bySpeaker = new Map<string, VoiceManifestSegment[]>();
	for (const segment of manifest.segments) {
		const list = bySpeaker.get(segment.steam_id) ?? [];
		list.push(segment);
		bySpeaker.set(segment.steam_id, list);
	}

	const tracks: SpeakerTrack[] = [];
	for (const [steamId, segments] of bySpeaker) {
		if (segments.length === 0) continue;
		tracks.push({
			steamId,
			name: manifest.players[steamId]?.trim() || steamId,
			segments: [...segments].sort((a, b) => a.start_seconds - b.start_seconds)
		});
	}
	tracks.sort((a, b) => a.name.localeCompare(b.name));
	return tracks;
}

export function demoDuration(manifest: VoiceManifest): number {
	let maxEnd = manifest.duration_seconds;
	for (const segment of manifest.segments) {
		if (segment.end_seconds > maxEnd) maxEnd = segment.end_seconds;
	}
	return Number.isFinite(maxEnd) ? Math.max(maxEnd, 0) : 0;
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

/** Next clip start after `fromSeconds`, wrapping to the first clip. */
export function nextUtteranceStart(track: SpeakerTrack, fromSeconds: number): number | null {
	if (track.segments.length === 0) return null;
	const next = track.segments.find((segment) => segment.start_seconds > fromSeconds + 0.08);
	return (next ?? track.segments[0]).start_seconds;
}
