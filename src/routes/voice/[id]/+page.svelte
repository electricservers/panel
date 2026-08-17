<script lang="ts">
	import { browser } from '$app/environment';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import VoiceTimeline from '$lib/components/voice/voice-timeline.svelte';
	import { instantToMs } from '$lib/voice/session-clock';

	let { data } = $props();
</script>

<div class="flex w-full max-w-full min-w-0 flex-col gap-4 overflow-x-hidden">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<h1 class="font-heading text-2xl font-semibold tracking-tight">
					{data.demo.originalFilename}
				</h1>
				<Badge variant="outline">{data.demo.status}</Badge>
			</div>
			<p class="text-sm text-muted-foreground">
				{#if data.demo.map}{data.demo.map} ·
				{/if}
				{#if data.manifest}
					{data.manifest.server} · {Math.round(data.manifest.duration_seconds)}s ·
					{Object.keys(data.manifest.players).length} speaker(s) ·
					{data.manifest.segments.length} clip(s)
				{:else}
					Not processed yet.
				{/if}
			</p>
		</div>
		<Button href="/voice" variant="outline" size="sm">Back to list</Button>
	</div>

	{#if data.manifest && browser}
		<VoiceTimeline
			demoId={data.demo.id}
			manifest={data.manifest}
			filename={data.demo.originalFilename}
			recordedAtMs={instantToMs(data.demo.recordedAt)}
			speakerAvatars={data.speakerAvatars}
		/>
	{:else if data.demo.status !== 'processed'}
		<p class="text-sm text-muted-foreground">
			Process this demo from the Voice list before opening the timeline.
		</p>
	{/if}
</div>
