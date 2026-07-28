<script lang="ts">
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import MultiTrack from 'wavesurfer-multitrack';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import VolumeXIcon from '@lucide/svelte/icons/volume-x';
	import type { VoiceManifest } from '$lib/voice/types';
	import {
		activeSteamIds,
		buildSpeakerTracks,
		revokeSpeakerTracks,
		type SpeakerTrack
	} from '$lib/voice/build-tracks';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import { cn } from '$lib/utils.js';

	let {
		demoId,
		manifest,
		sessionStartedAtMs = null,
		speakerAvatars = {}
	}: {
		demoId: string;
		manifest: VoiceManifest;
		/** Epoch ms for demo t=0 (wall clock). Null falls back to relative HH:mm. */
		sessionStartedAtMs?: number | null;
		/** Steam64 → medium avatar URL from GetPlayerSummaries. */
		speakerAvatars?: Record<string, string>;
	} = $props();

	const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

	let container: HTMLDivElement | undefined = $state();
	let tracks = $state<SpeakerTrack[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let playing = $state(false);
	let currentTime = $state(0);
	let playbackRate = $state(1);
	let active = $state<Set<string>>(new Set());
	let mutedIds = new SvelteSet<string>();
	let soloIds = new SvelteSet<string>();
	let multitrack = $state<MultiTrack | null>(null);

	const mutedCount = $derived(mutedIds.size);
	const soloCount = $derived(soloIds.size);
	const anySolo = $derived(soloCount > 0);

	const colors = [
		'hsl(220 90% 56%)',
		'hsl(160 70% 40%)',
		'hsl(30 90% 50%)',
		'hsl(280 65% 55%)',
		'hsl(0 75% 55%)',
		'hsl(190 80% 40%)'
	];

	function colorFor(index: number) {
		return colors[index % colors.length];
	}

	function formatElapsed(seconds: number) {
		const s = Math.max(0, Math.floor(seconds));
		const m = Math.floor(s / 60);
		const rem = s % 60;
		return `${m}:${rem.toString().padStart(2, '0')}`;
	}

	function formatClockLabel(offsetSeconds: number) {
		if (sessionStartedAtMs == null) {
			const total = Math.max(0, Math.floor(offsetSeconds));
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor((total % 3600) / 60);
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
		}
		const at = new Date(sessionStartedAtMs + offsetSeconds * 1000);
		return at.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function applyPlaybackRate(mt: MultiTrack | null, rate: number) {
		if (!mt) return;
		const audios = (mt as unknown as { audios?: Array<{ playbackRate?: number; preservesPitch?: boolean }> })
			.audios;
		if (!audios) return;
		for (const audio of audios) {
			if (!audio || typeof audio.playbackRate !== 'number') continue;
			audio.playbackRate = rate;
			if ('preservesPitch' in audio) audio.preservesPitch = true;
		}
	}

	function togglePlay() {
		if (!multitrack || loading || loadError) return;
		if (multitrack.isPlaying()) multitrack.pause();
		else {
			applyPlaybackRate(multitrack, playbackRate);
			multitrack.play();
		}
		playing = multitrack.isPlaying();
	}

	function setSpeed(rate: number) {
		playbackRate = rate;
		applyPlaybackRate(multitrack, rate);
	}

	function trackVolume(steamId: string): number {
		if (mutedIds.has(steamId)) return 0;
		if (anySolo && !soloIds.has(steamId)) return 0;
		return 1;
	}

	function isAudible(steamId: string): boolean {
		return trackVolume(steamId) > 0;
	}

	function applyTrackVolumes(mt: MultiTrack | null = multitrack) {
		if (!mt) return;
		for (let index = 0; index < tracks.length; index++) {
			mt.setTrackVolume(index, trackVolume(tracks[index].steamId));
		}
	}

	function toggleMute(steamId: string) {
		if (mutedIds.has(steamId)) mutedIds.delete(steamId);
		else mutedIds.add(steamId);
		applyTrackVolumes();
	}

	function toggleSolo(steamId: string) {
		if (soloIds.has(steamId)) soloIds.delete(steamId);
		else soloIds.add(steamId);
		applyTrackVolumes();
	}

	function clearMutes() {
		mutedIds.clear();
		applyTrackVolumes();
	}

	function clearSolos() {
		soloIds.clear();
		applyTrackVolumes();
	}

	function unmuteAll() {
		mutedIds.clear();
		soloIds.clear();
		applyTrackVolumes();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.code !== 'Space' && event.key !== ' ') return;
		const target = event.target;
		if (target instanceof HTMLElement) {
			const tag = target.tagName;
			if (
				tag === 'INPUT' ||
				tag === 'TEXTAREA' ||
				tag === 'SELECT' ||
				tag === 'BUTTON' ||
				target.isContentEditable
			) {
				return;
			}
		}
		event.preventDefault();
		togglePlay();
	}

	$effect(() => {
		if (!browser || !container) return;

		const host = container;
		const startedAt = sessionStartedAtMs;
		let cancelled = false;
		let localTracks: SpeakerTrack[] = [];
		let localMt: MultiTrack | null = null;
		let raf = 0;

		loading = true;
		loadError = null;

		void (async () => {
			try {
				const built = await buildSpeakerTracks(demoId, manifest);
				if (cancelled) {
					revokeSpeakerTracks(built);
					return;
				}
				localTracks = built;
				tracks = built;
				mutedIds.clear();
				soloIds.clear();
				localMt = MultiTrack.create(
					built.map((track, index) => ({
						id: track.steamId,
						url: track.url,
						startPosition: 0,
						draggable: false,
						options: {
							height: 48,
							waveColor: colorFor(index),
							progressColor: colorFor(index),
							normalize: true
						}
					})),
					{
						container: host,
						minPxPerSec: 12,
						cursorWidth: 2,
						cursorColor: 'var(--brand)',
						trackBackground: 'transparent',
						trackBorderColor: 'var(--border)',
						timelineOptions: {
							height: 20,
							formatTimeCallback: (seconds: number) => {
								if (startedAt == null) {
									const total = Math.max(0, Math.floor(seconds));
									const hours = Math.floor(total / 3600);
									const minutes = Math.floor((total % 3600) / 60);
									return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
								}
								const at = new Date(startedAt + seconds * 1000);
								return at.toLocaleTimeString(undefined, {
									hour: '2-digit',
									minute: '2-digit',
									hour12: false
								});
							}
						}
					}
				);
				multitrack = localMt;
				applyPlaybackRate(localMt, untrack(() => playbackRate));
				applyTrackVolumes(localMt);
				localMt.on('canplay', () => {
					if (!cancelled) applyTrackVolumes(localMt);
				});

				const tick = () => {
					if (!localMt || cancelled) return;
					currentTime = localMt.getCurrentTime();
					active = activeSteamIds(localTracks, currentTime);
					playing = localMt.isPlaying();
					raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
			} catch (err) {
				if (!cancelled) {
					loadError = err instanceof Error ? err.message : 'Failed to build timeline.';
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			localMt?.destroy();
			multitrack = null;
			revokeSpeakerTracks(localTracks);
		};
	});
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="flex min-w-0 w-full max-w-full flex-col gap-4 lg:flex-row">
	<div class="min-w-0 flex-1 space-y-3 overflow-hidden">
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-sm text-muted-foreground tabular-nums">
				{formatClockLabel(currentTime)}
				<span class="text-muted-foreground/70">
					({formatElapsed(currentTime)} / {formatElapsed(manifest.duration_seconds)})
				</span>
			</span>
			{#if loading}
				<span class="text-sm text-muted-foreground">Building speaker tracks…</span>
			{/if}
		</div>
		{#if loadError}
			<p class="text-sm text-destructive">{loadError}</p>
		{/if}
		<!-- Outer shell owns the viewport width; Multitrack expands the inner
		     node to the full timeline, so scroll stays inside this box only. -->
		<div class="min-h-40 w-full max-w-full overflow-x-auto rounded-lg border border-border bg-muted/20 p-2">
			<div bind:this={container} class="min-w-0"></div>
		</div>

		<div
			class="grid grid-cols-1 items-center gap-3 rounded-lg border border-border bg-muted/10 px-3 py-3 sm:grid-cols-[1fr_auto_1fr]"
		>
			<div class="hidden tabular-nums text-sm text-muted-foreground sm:block">
				{formatElapsed(currentTime)}
				<span class="text-muted-foreground/70">/ {formatElapsed(manifest.duration_seconds)}</span>
			</div>

			<Button
				type="button"
				variant="default"
				size="icon-lg"
				class="mx-auto rounded-full"
				onclick={togglePlay}
				disabled={loading || !!loadError}
				aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
				title="Space"
			>
				{#if playing}
					<PauseIcon class="size-5" />
				{:else}
					<PlayIcon class="size-5 translate-x-px" />
				{/if}
			</Button>

			<div
				class="flex flex-wrap items-center justify-center gap-1 sm:justify-end"
				role="group"
				aria-label="Playback speed"
			>
				<span class="mr-1 text-xs text-muted-foreground">Speed</span>
				{#each SPEED_OPTIONS as rate (rate)}
					<Button
						type="button"
						size="xs"
						variant={playbackRate === rate ? 'secondary' : 'ghost'}
						class={cn('min-w-10 tabular-nums', playbackRate === rate && 'ring-1 ring-border')}
						onclick={() => setSpeed(rate)}
						disabled={loading || !!loadError}
						aria-pressed={playbackRate === rate}
					>
						{rate === 1 ? '1×' : `${rate}×`}
					</Button>
				{/each}
			</div>
		</div>
	</div>

	<aside
		class="w-full shrink-0 space-y-2 overflow-y-auto lg:max-h-[calc(100vh-8rem)] lg:w-64 lg:max-w-64"
	>
		<div class="flex items-center justify-between gap-2">
			<h2 class="font-heading text-sm font-semibold tracking-tight">Speakers</h2>
			{#if mutedCount > 0 || soloCount > 0}
				<Button
					type="button"
					variant="ghost"
					size="xs"
					onclick={unmuteAll}
					disabled={loading || !!loadError}
				>
					Reset audio
				</Button>
			{/if}
		</div>
		{#if mutedCount > 0 || soloCount > 0}
			<div class="flex flex-wrap gap-1">
				{#if soloCount > 0}
					<Button type="button" variant="outline" size="xs" onclick={clearSolos}>
						Clear solo ({soloCount})
					</Button>
				{/if}
				{#if mutedCount > 0}
					<Button type="button" variant="outline" size="xs" onclick={clearMutes}>
						Unmute all ({mutedCount})
					</Button>
				{/if}
			</div>
		{/if}
		<ul class="space-y-1">
			{#each tracks as track, index (track.steamId)}
				{@const isActive = active.has(track.steamId)}
				{@const steamHref = steamProfileUrl(track.steamId)}
				{@const isMuted = mutedIds.has(track.steamId)}
				{@const isSolo = soloIds.has(track.steamId)}
				{@const audible = isAudible(track.steamId)}
				<li
					class={cn(
						'rounded-lg border px-3 py-2 transition-colors',
						isActive && audible
							? 'border-brand bg-brand/10 shadow-sm'
							: 'border-border bg-background',
						!audible && 'opacity-55'
					)}
				>
					<div class="flex items-center gap-2">
						<span
							class="inline-flex shrink-0 rounded-full p-0.5"
							style:background={colorFor(index)}
						>
							<PlayerAvatar
								name={track.name}
								avatarUrl={speakerAvatars[track.steamId]}
								steamid={track.steamId}
								size="sm"
							/>
						</span>
						<div class="flex min-w-0 flex-1 flex-col leading-tight">
							{#if steamHref}
								<a
									href={steamHref}
									target="_blank"
									rel="noopener noreferrer"
									class="truncate text-sm font-medium hover:text-brand hover:underline"
									title="Open Steam profile"
								>
									{track.name}
								</a>
							{:else}
								<span class="truncate text-sm font-medium">{track.name}</span>
							{/if}
							{#if steamHref}
								<a
									href={steamHref}
									target="_blank"
									rel="noopener noreferrer"
									class="truncate font-mono text-[10px] text-muted-foreground hover:text-brand hover:underline"
								>
									{track.steamId}
								</a>
							{:else}
								<span class="truncate font-mono text-[10px] text-muted-foreground">
									{track.steamId}
								</span>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-0.5">
							{#if isActive && audible}
								<Badge variant="secondary" class="mr-1">talking</Badge>
							{/if}
							<Button
								type="button"
								variant={isSolo ? 'secondary' : 'ghost'}
								size="icon-xs"
								class={cn(isSolo && 'text-brand ring-1 ring-brand/40')}
								onclick={() => toggleSolo(track.steamId)}
								disabled={loading || !!loadError}
								aria-pressed={isSolo}
								aria-label={isSolo ? `Unsolo ${track.name}` : `Solo ${track.name}`}
								title={isSolo ? 'Unsolo' : 'Solo'}
							>
								<HeadphonesIcon class="size-3.5" />
							</Button>
							<Button
								type="button"
								variant={isMuted ? 'secondary' : 'ghost'}
								size="icon-xs"
								class={cn(isMuted && 'text-destructive')}
								onclick={() => toggleMute(track.steamId)}
								disabled={loading || !!loadError}
								aria-pressed={isMuted}
								aria-label={isMuted ? `Unmute ${track.name}` : `Mute ${track.name}`}
								title={isMuted ? 'Unmute' : 'Mute'}
							>
								{#if isMuted}
									<VolumeXIcon class="size-3.5" />
								{:else}
									<Volume2Icon class="size-3.5" />
								{/if}
							</Button>
						</div>
					</div>
				</li>
			{/each}
			{#if !loading && tracks.length === 0}
				<li class="text-sm text-muted-foreground">No speakers in this demo.</li>
			{/if}
		</ul>
	</aside>
</div>
