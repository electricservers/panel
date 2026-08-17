<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import VolumeXIcon from '@lucide/svelte/icons/volume-x';
	import SearchIcon from '@lucide/svelte/icons/search';
	import LocateFixedIcon from '@lucide/svelte/icons/locate-fixed';
	import type { VoiceManifest } from '$lib/voice/types';
	import { VoicePlayer } from '$lib/voice/player';
	import {
		activeSteamIds,
		demoDuration,
		groupSpeakerTracks,
		nextUtteranceStart,
		type SpeakerTrack
	} from '$lib/voice/tracks';
	import { formatClockLabel, inferSessionStartMs } from '$lib/voice/session-clock';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import { cn } from '$lib/utils.js';

	let {
		demoId,
		manifest,
		filename,
		recordedAtMs = null,
		speakerAvatars = {}
	}: {
		demoId: string;
		manifest: VoiceManifest;
		filename: string;
		recordedAtMs?: number | null;
		speakerAvatars?: Record<string, string>;
	} = $props();

	const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
	const PX_PER_SEC = 12;
	const LANE_HEIGHT = 48;
	const RULER_HEIGHT = 20;

	let playing = $state(false);
	let buffering = $state(false);
	let currentTime = $state(0);
	let playbackRate = $state(1);
	let decodedCount = $state(0);
	let totalCount = $state(0);
	let mutedIds = new SvelteSet<string>();
	let soloIds = new SvelteSet<string>();
	let player: VoicePlayer | null = null;
	let scroller: HTMLDivElement | null = null;
	let speakerQuery = $state('');
	let focusedSteamId = $state<string | null>(null);
	let followPlayhead = $state(true);
	let suppressUserScrollUntil = 0;

	const tracks = $derived.by(() => groupSpeakerTracks(manifest));
	const duration = $derived.by(() => demoDuration(manifest));
	const sessionClock = $derived.by(() =>
		inferSessionStartMs({
			filename,
			recordedAtMs,
			durationSeconds: duration
		})
	);
	const sessionStartMs = $derived(sessionClock?.startMs ?? null);
	const clockHint = $derived(
		sessionClock?.source === 'filename'
			? 'Clock from the demo filename'
			: sessionClock?.source === 'mtime'
				? 'Approximate clock from the file date'
				: 'Elapsed time from the start of the demo'
	);
	const contentWidth = $derived(Math.max(duration * PX_PER_SEC, 120));
	const active = $derived.by(() => activeSteamIds(tracks, currentTime));
	const mutedCount = $derived(mutedIds.size);
	const soloCount = $derived(soloIds.size);
	const anySolo = $derived(soloCount > 0);
	const speakerFilter = $derived(speakerQuery.trim().toLowerCase());
	const visibleTracks = $derived.by(() => {
		if (!speakerFilter) return tracks;
		return tracks.filter(
			(track) =>
				track.name.toLowerCase().includes(speakerFilter) ||
				track.steamId.toLowerCase().includes(speakerFilter)
		);
	});
	const colorIndexBySteam = $derived.by(() => {
		const map: Record<string, number> = {};
		tracks.forEach((track, index) => {
			map[track.steamId] = index;
		});
		return map;
	});
	const ticks = $derived.by(() => {
		const step = duration > 1800 ? 120 : duration > 600 ? 60 : duration > 120 ? 15 : 10;
		const out: number[] = [];
		for (let t = 0; t <= duration; t += step) out.push(t);
		return out;
	});

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

	function trackVolume(steamId: string): number {
		if (mutedIds.has(steamId)) return 0;
		if (anySolo && !soloIds.has(steamId)) return 0;
		return 1;
	}

	function isAudible(steamId: string): boolean {
		return trackVolume(steamId) > 0;
	}

	function matchesFilter(track: SpeakerTrack): boolean {
		if (!speakerFilter) return true;
		return (
			track.name.toLowerCase().includes(speakerFilter) ||
			track.steamId.toLowerCase().includes(speakerFilter)
		);
	}

	function markProgrammaticScroll() {
		suppressUserScrollUntil = performance.now() + 120;
	}

	function setScrollerLeft(value: number) {
		const el = scroller;
		if (!el) return;
		markProgrammaticScroll();
		el.scrollLeft = value;
	}

	function scrollTimeIntoView(seconds: number) {
		const el = scroller;
		if (!el) return;
		const x = seconds * PX_PER_SEC;
		const margin = Math.min(160, el.clientWidth * 0.25);
		setScrollerLeft(Math.max(0, x - margin));
	}

	function keepPlayheadVisible() {
		if (!followPlayhead) return;
		const el = scroller;
		if (!el) return;
		const x = currentTime * PX_PER_SEC;
		const left = el.scrollLeft;
		const right = left + el.clientWidth;
		const margin = Math.min(120, el.clientWidth * 0.2);
		if (x > right - margin || x < left + 8) {
			setScrollerLeft(Math.max(0, x - margin));
		}
	}

	function onTimelineScroll() {
		if (performance.now() < suppressUserScrollUntil) return;
		followPlayhead = false;
	}

	function onTimelineWheel() {
		followPlayhead = false;
	}

	function resumeFollow() {
		followPlayhead = true;
		scrollTimeIntoView(currentTime);
	}

	function syncFromPlayer(p: VoicePlayer) {
		currentTime = p.getCurrentTime();
		playing = p.playing;
		buffering = p.buffering;
		decodedCount = p.decodedCount;
		totalCount = p.totalCount;
		if (p.playing) keepPlayheadVisible();
	}

	async function togglePlay() {
		if (!player || tracks.length === 0) return;
		await player.toggle();
		syncFromPlayer(player);
	}

	function setSpeed(rate: number) {
		playbackRate = rate;
		player?.setRate(rate);
	}

	function seekTo(seconds: number) {
		if (!player) return;
		followPlayhead = true;
		player.seek(seconds);
		currentTime = player.getCurrentTime();
	}

	function jumpToSpeaker(track: SpeakerTrack) {
		const start = nextUtteranceStart(track, currentTime);
		if (start == null) return;
		focusedSteamId = track.steamId;
		seekTo(start);
		scrollTimeIntoView(start);
	}

	function toggleMute(steamId: string) {
		if (mutedIds.has(steamId)) mutedIds.delete(steamId);
		else mutedIds.add(steamId);
		player?.setMuted(mutedIds);
	}

	function toggleSolo(steamId: string) {
		if (soloIds.has(steamId)) soloIds.delete(steamId);
		else soloIds.add(steamId);
		player?.setSolo(soloIds);
	}

	function clearMutes() {
		mutedIds.clear();
		player?.setMuted(mutedIds);
	}

	function clearSolos() {
		soloIds.clear();
		player?.setSolo(soloIds);
	}

	function unmuteAll() {
		mutedIds.clear();
		soloIds.clear();
		player?.setMuted(mutedIds);
		player?.setSolo(soloIds);
	}

	function onTimelineClick(event: MouseEvent) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLElement)) return;
		const rect = target.getBoundingClientRect();
		const x = event.clientX - rect.left;
		seekTo(x / PX_PER_SEC);
		const hit = event.target;
		if (hit instanceof HTMLElement && hit.dataset.steamId) {
			focusedSteamId = hit.dataset.steamId;
		}
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return;
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
		if (event.code === 'Space' || event.key === ' ') {
			event.preventDefault();
			void togglePlay();
			return;
		}
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			seekTo(currentTime - 5);
			return;
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			seekTo(currentTime + 5);
		}
	}

	function attachTimeline(demo: string, speakerTracks: SpeakerTrack[], total: number) {
		return (node: HTMLDivElement) => {
			scroller = node;
			const p = new VoicePlayer({
				demoId: demo,
				tracks: speakerTracks,
				duration: total
			});
			p.setRate(untrack(() => playbackRate));
			p.setMuted(untrack(() => mutedIds));
			p.setSolo(untrack(() => soloIds));
			p.prefetch();
			player = p;

			let raf = 0;
			const tick = () => {
				syncFromPlayer(p);
				raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);

			return () => {
				cancelAnimationFrame(raf);
				p.destroy();
				if (player === p) player = null;
				if (scroller === node) scroller = null;
			};
		};
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="flex w-full max-w-full min-w-0 flex-col gap-4 lg:flex-row">
	<div class="min-w-0 flex-1 space-y-3 overflow-hidden">
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-sm text-muted-foreground tabular-nums" title={clockHint}>
				{formatClockLabel(currentTime, sessionStartMs)}
				<span class="text-muted-foreground/70">
					({formatElapsed(currentTime)} / {formatElapsed(duration)})
				</span>
			</span>
			<span class="text-xs text-muted-foreground/80">{clockHint}</span>
			{#if decodedCount < totalCount}
				<span class="text-sm text-muted-foreground">
					Loading audio {decodedCount}/{totalCount}
				</span>
			{/if}
			{#if buffering}
				<span class="text-sm text-muted-foreground">Buffering…</span>
			{/if}
			<Button
				type="button"
				size="xs"
				variant={followPlayhead ? 'secondary' : 'outline'}
				onclick={resumeFollow}
				aria-pressed={followPlayhead}
				title="Keep the playhead in view while playing"
			>
				<LocateFixedIcon class="size-3.5" />
				{followPlayhead ? 'Following' : 'Follow cursor'}
			</Button>
		</div>
		<div
			class="min-h-40 w-full max-w-full overflow-x-auto rounded-lg border border-border bg-muted/20"
			onscroll={onTimelineScroll}
			onwheel={onTimelineWheel}
			{@attach attachTimeline(demoId, tracks, duration)}
		>
			<div class="flex w-max min-w-full">
				<div
					class="sticky left-0 z-20 w-44 shrink-0 border-r border-border bg-background shadow-[4px_0_12px_-8px_hsl(0_0%_0%_/_0.45)]"
				>
					<div
						class="flex items-center border-b border-border px-2 text-[10px] text-muted-foreground"
						style:height="{RULER_HEIGHT}px"
					>
						Speakers
					</div>
					{#each tracks as track, index (track.steamId)}
						{@const isActive = active.has(track.steamId)}
						{@const audible = isAudible(track.steamId)}
						{@const dimmed = !matchesFilter(track) || !audible}
						{@const focused = focusedSteamId === track.steamId}
						<button
							type="button"
							class={cn(
								'flex w-full items-center gap-2 border-b border-border/70 px-2 text-left last:border-b-0',
								isActive && audible && 'bg-brand/10',
								focused && 'ring-1 ring-brand/50 ring-inset',
								dimmed && 'opacity-40'
							)}
							style:height="{LANE_HEIGHT}px"
							onclick={() => jumpToSpeaker(track)}
							title="{track.name} · {track.segments.length} clips. Jump to next clip."
						>
							<span
								class="inline-flex shrink-0 rounded-full p-px"
								style:background={colorFor(index)}
							>
								<PlayerAvatar
									name={track.name}
									avatarUrl={speakerAvatars[track.steamId]}
									size="sm"
								/>
							</span>
							<span class="min-w-0 truncate text-xs font-medium">{track.name}</span>
						</button>
					{/each}
				</div>
				<div
					class="relative cursor-pointer select-none"
					style:width="{contentWidth}px"
					style:min-height="{RULER_HEIGHT + tracks.length * LANE_HEIGHT}px"
					role="slider"
					aria-label="Voice timeline"
					aria-valuemin={0}
					aria-valuemax={Math.round(duration)}
					aria-valuenow={Math.round(currentTime)}
					tabindex="0"
					onclick={onTimelineClick}
					onkeydown={onWindowKeydown}
				>
					<div class="relative border-b border-border" style:height="{RULER_HEIGHT}px">
						{#each ticks as tick (tick)}
							<span
								class="absolute top-0 text-[10px] leading-5 text-muted-foreground tabular-nums"
								style:left="{tick * PX_PER_SEC}px"
							>
								{formatClockLabel(tick, sessionStartMs)}
							</span>
						{/each}
					</div>
					{#each tracks as track, index (track.steamId)}
						<div
							class={cn(
								'relative border-b border-border/70 last:border-b-0',
								focusedSteamId === track.steamId && 'bg-brand/5'
							)}
							style:height="{LANE_HEIGHT}px"
							style:opacity={!matchesFilter(track) || !isAudible(track.steamId) ? '0.35' : '1'}
						>
							{#each track.segments as segment (`${segment.file}:${segment.start_seconds}`)}
								<div
									class="absolute top-2 bottom-2 rounded-sm"
									style:left="{segment.start_seconds * PX_PER_SEC}px"
									style:width="{Math.max(
										3,
										(segment.end_seconds - segment.start_seconds) * PX_PER_SEC
									)}px"
									style:background={colorFor(index)}
									data-steam-id={track.steamId}
									title="{track.name} · {formatElapsed(segment.start_seconds)}"
								></div>
							{/each}
						</div>
					{/each}
					<div
						class="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-brand"
						style:left="{currentTime * PX_PER_SEC}px"
					></div>
				</div>
			</div>
		</div>

		<div
			class="grid grid-cols-1 items-center gap-3 rounded-lg border border-border bg-muted/10 px-3 py-3 sm:grid-cols-[1fr_auto_1fr]"
		>
			<div class="hidden text-sm text-muted-foreground tabular-nums sm:block">
				{formatElapsed(currentTime)}
				<span class="text-muted-foreground/70">/ {formatElapsed(duration)}</span>
			</div>

			<Button
				type="button"
				variant="default"
				size="icon-lg"
				class="mx-auto rounded-full"
				onclick={togglePlay}
				disabled={tracks.length === 0}
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
						disabled={tracks.length === 0}
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
				<Button type="button" variant="ghost" size="xs" onclick={unmuteAll}>Reset audio</Button>
			{/if}
		</div>
		<div class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				class="pl-8"
				type="search"
				placeholder="Filter by name or SteamID"
				bind:value={speakerQuery}
				aria-label="Filter speakers"
			/>
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
			{#each visibleTracks as track (track.steamId)}
				{@const index = colorIndexBySteam[track.steamId] ?? 0}
				{@const isActive = active.has(track.steamId)}
				{@const steamHref = steamProfileUrl(track.steamId)}
				{@const isMuted = mutedIds.has(track.steamId)}
				{@const isSolo = soloIds.has(track.steamId)}
				{@const audible = isAudible(track.steamId)}
				{@const focused = focusedSteamId === track.steamId}
				<li
					class={cn(
						'rounded-lg border px-3 py-2 transition-colors',
						isActive && audible
							? 'border-brand bg-brand/10 shadow-sm'
							: 'border-border bg-background',
						focused && 'ring-1 ring-brand/40',
						!audible && 'opacity-55'
					)}
				>
					<div class="flex items-center gap-2">
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-2 text-left"
							onclick={() => jumpToSpeaker(track)}
							title="Jump to next clip"
						>
							<span
								class="inline-flex shrink-0 rounded-full p-0.5"
								style:background={colorFor(index)}
							>
								<PlayerAvatar
									name={track.name}
									avatarUrl={speakerAvatars[track.steamId]}
									size="sm"
								/>
							</span>
							<div class="flex min-w-0 flex-1 flex-col leading-tight">
								<span class="truncate text-sm font-medium hover:text-brand">{track.name}</span>
								<span class="text-[10px] text-muted-foreground">
									{track.segments.length}
									{track.segments.length === 1 ? 'clip' : 'clips'}
								</span>
							</div>
						</button>
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
					{#if steamHref}
						<a
							href={steamHref}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-1 block truncate font-mono text-[10px] text-muted-foreground hover:text-brand hover:underline"
						>
							{track.steamId}
						</a>
					{:else}
						<span class="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
							{track.steamId}
						</span>
					{/if}
				</li>
			{/each}
			{#if tracks.length === 0}
				<li class="text-sm text-muted-foreground">No speakers in this demo.</li>
			{:else if visibleTracks.length === 0}
				<li class="text-sm text-muted-foreground">No speakers match that filter.</li>
			{/if}
		</ul>
	</aside>
</div>
