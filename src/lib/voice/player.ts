import type { VoiceManifestSegment } from '$lib/voice/types';
import type { SpeakerTrack } from '$lib/voice/tracks';

const FETCH_CONCURRENCY = 8;
const FETCH_HORIZON_SECONDS = 12;
const PLAY_HORIZON_SECONDS = 0.15;

type ScheduledSegment = VoiceManifestSegment & { key: string };

function segmentKey(segment: VoiceManifestSegment): string {
	return `${segment.steam_id}:${segment.file}:${segment.start_seconds}`;
}

function hasPcmPayload(arrayBuffer: ArrayBuffer): boolean {
	if (arrayBuffer.byteLength <= 44) return false;
	const view = new DataView(arrayBuffer);
	if (view.getUint32(0, false) !== 0x52494646) return false;
	if (view.getUint32(8, false) !== 0x57415645) return false;
	const dataSize = view.getUint32(40, true);
	return dataSize > 0;
}

export class VoicePlayer {
	playing = false;
	decodedCount = 0;
	readonly totalCount: number;
	readonly duration: number;

	private ctx: AudioContext;
	private master: GainNode;
	private gains = new Map<string, GainNode>();
	private buffers = new Map<string, AudioBuffer>();
	private failed = new Set<string>();
	private inflight = new Map<string, Promise<void>>();
	private sources = new Set<AudioBufferSourceNode>();
	private started = new Set<string>();
	private segments: ScheduledSegment[];
	private filesByStart: string[];
	private demoId: string;
	private rate = 1;
	private pausedAt = 0;
	private anchorCtx = 0;
	private anchorDemo = 0;
	private stallFrozenAt: number | null = null;
	private muted = new Set<string>();
	private solo = new Set<string>();
	private closed = false;
	private abort = new AbortController();
	private timer = 0;

	constructor(input: { demoId: string; tracks: SpeakerTrack[]; duration: number }) {
		this.demoId = input.demoId;
		this.duration = input.duration;
		this.ctx = new AudioContext({ sampleRate: 24000 });
		this.master = this.ctx.createGain();
		this.master.connect(this.ctx.destination);

		this.segments = [];
		const firstStart = new Map<string, number>();
		for (const track of input.tracks) {
			this.gainFor(track.steamId);
			for (const segment of track.segments) {
				this.segments.push({ ...segment, key: segmentKey(segment) });
				const prev = firstStart.get(segment.file);
				if (prev == null || segment.start_seconds < prev) {
					firstStart.set(segment.file, segment.start_seconds);
				}
			}
		}
		this.segments.sort((a, b) => a.start_seconds - b.start_seconds);
		this.filesByStart = [...firstStart.entries()].sort((a, b) => a[1] - b[1]).map(([file]) => file);
		this.totalCount = this.filesByStart.length;
	}

	get buffering(): boolean {
		return this.stallFrozenAt != null;
	}

	getCurrentTime(): number {
		return Math.min(this.duration, Math.max(0, this.demoTimeNow()));
	}

	async toggle(): Promise<void> {
		if (this.playing) this.pause();
		else await this.play();
	}

	async play(): Promise<void> {
		if (this.closed || this.playing) return;
		await this.ctx.resume();
		this.playing = true;
		this.anchorDemo = this.pausedAt;
		this.anchorCtx = this.ctx.currentTime;
		this.stallFrozenAt = null;
		this.started.clear();
		this.schedule();
		this.armTimer();
	}

	pause(): void {
		if (this.closed || !this.playing) return;
		this.pausedAt = this.getCurrentTime();
		this.playing = false;
		this.stallFrozenAt = null;
		this.stopSources();
		this.started.clear();
		this.clearTimer();
	}

	seek(seconds: number): void {
		if (this.closed) return;
		const next = Math.min(this.duration, Math.max(0, seconds));
		this.pausedAt = next;
		this.stallFrozenAt = null;
		this.stopSources();
		this.started.clear();
		if (this.playing) {
			this.anchorDemo = next;
			this.anchorCtx = this.ctx.currentTime;
			this.schedule();
		}
	}

	setRate(rate: number): void {
		if (this.closed) return;
		const t = this.getCurrentTime();
		this.rate = rate;
		this.pausedAt = t;
		this.stopSources();
		this.started.clear();
		if (this.playing) {
			this.anchorDemo = t;
			this.anchorCtx = this.ctx.currentTime;
			this.schedule();
		}
	}

	setMuted(ids: Iterable<string>): void {
		this.muted = new Set(ids);
		this.applyGains();
	}

	setSolo(ids: Iterable<string>): void {
		this.solo = new Set(ids);
		this.applyGains();
	}

	prefetch(): void {
		void this.runPrefetch();
	}

	destroy(): void {
		this.closed = true;
		this.playing = false;
		this.clearTimer();
		this.abort.abort();
		this.stopSources();
		void this.ctx.close();
	}

	private demoTimeNow(): number {
		if (!this.playing) return this.pausedAt;
		if (this.stallFrozenAt != null) return this.stallFrozenAt;
		return this.anchorDemo + (this.ctx.currentTime - this.anchorCtx) * this.rate;
	}

	private missingOverlap(t: number): boolean {
		for (const segment of this.segments) {
			if (segment.end_seconds <= t) continue;
			if (segment.start_seconds > t + 0.02) break;
			if (this.failed.has(segment.file)) continue;
			if (!this.buffers.has(segment.file)) return true;
		}
		return false;
	}

	private tickClock(): void {
		if (this.closed || !this.playing) return;
		const t = this.demoTimeNow();
		if (this.stallFrozenAt == null && this.missingOverlap(t)) {
			this.stallFrozenAt = Math.min(this.duration, Math.max(0, t));
			this.stopSources();
			this.started.clear();
		} else if (this.stallFrozenAt != null && !this.missingOverlap(this.stallFrozenAt)) {
			this.pausedAt = this.stallFrozenAt;
			this.stallFrozenAt = null;
			this.anchorDemo = this.pausedAt;
			this.anchorCtx = this.ctx.currentTime;
			this.schedule();
		}
		if (this.getCurrentTime() >= this.duration) {
			this.pause();
			this.pausedAt = this.duration;
			return;
		}
		this.schedule();
	}

	private schedule(): void {
		if (this.closed || !this.playing || this.stallFrozenAt != null) return;
		const now = this.demoTimeNow();
		const fetchUntil = now + FETCH_HORIZON_SECONDS * this.rate;
		const playUntil = now + PLAY_HORIZON_SECONDS;

		for (const segment of this.segments) {
			if (segment.end_seconds <= now) continue;
			if (segment.start_seconds > fetchUntil) break;
			void this.ensureBuffer(segment.file);
			if (this.started.has(segment.key)) continue;
			if (segment.start_seconds > playUntil) continue;
			const buffer = this.buffers.get(segment.file);
			if (!buffer) continue;
			const offset = Math.max(0, now - segment.start_seconds);
			if (offset >= buffer.duration) {
				this.started.add(segment.key);
				continue;
			}
			const delay = Math.max(0, segment.start_seconds - now) / this.rate;
			this.startSource(segment, buffer, this.ctx.currentTime + delay, offset);
			this.started.add(segment.key);
		}
	}

	private startSource(
		segment: ScheduledSegment,
		buffer: AudioBuffer,
		when: number,
		offset: number
	): void {
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.playbackRate.value = this.rate;
		source.connect(this.gainFor(segment.steam_id));
		source.onended = () => {
			this.sources.delete(source);
		};
		try {
			source.start(when, offset);
			this.sources.add(source);
		} catch {
			this.sources.delete(source);
		}
	}

	private stopSources(): void {
		for (const source of this.sources) {
			source.onended = null;
			try {
				source.stop();
			} catch {
				// already stopped
			}
		}
		this.sources.clear();
	}

	private gainFor(steamId: string): GainNode {
		const existing = this.gains.get(steamId);
		if (existing) return existing;
		const gain = this.ctx.createGain();
		gain.gain.value = this.volumeFor(steamId);
		gain.connect(this.master);
		this.gains.set(steamId, gain);
		return gain;
	}

	private volumeFor(steamId: string): number {
		if (this.muted.has(steamId)) return 0;
		if (this.solo.size > 0 && !this.solo.has(steamId)) return 0;
		return 1;
	}

	private applyGains(): void {
		for (const [steamId, gain] of this.gains) {
			gain.gain.value = this.volumeFor(steamId);
		}
	}

	private async runPrefetch(): Promise<void> {
		let cursor = 0;
		const worker = async () => {
			while (!this.closed) {
				const file = this.filesByStart[cursor];
				cursor += 1;
				if (!file) return;
				await this.ensureBuffer(file);
			}
		};
		await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, () => worker()));
	}

	private ensureBuffer(file: string): Promise<void> {
		if (this.closed || this.buffers.has(file) || this.failed.has(file)) {
			return Promise.resolve();
		}
		const pending = this.inflight.get(file);
		if (pending) return pending;
		const task = this.decodeFile(file).finally(() => {
			this.inflight.delete(file);
		});
		this.inflight.set(file, task);
		return task;
	}

	private async decodeFile(file: string): Promise<void> {
		try {
			const res = await fetch(`/api/voice/${this.demoId}/audio/${encodeURIComponent(file)}`, {
				signal: this.abort.signal
			});
			if (!res.ok) {
				this.markFailed(file);
				return;
			}
			const arrayBuffer = await res.arrayBuffer();
			if (!hasPcmPayload(arrayBuffer)) {
				this.markFailed(file);
				return;
			}
			const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
			if (this.closed) return;
			if (decoded.length === 0) {
				this.markFailed(file);
				return;
			}
			this.buffers.set(file, decoded);
			this.decodedCount += 1;
			if (this.playing) this.schedule();
		} catch (err) {
			if (this.closed) return;
			if (err instanceof DOMException && err.name === 'AbortError') return;
			this.markFailed(file);
		}
	}

	private markFailed(file: string): void {
		if (this.failed.has(file)) return;
		this.failed.add(file);
		this.decodedCount += 1;
	}

	private armTimer(): void {
		this.clearTimer();
		this.timer = window.setInterval(() => this.tickClock(), 40);
	}

	private clearTimer(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = 0;
		}
	}
}
