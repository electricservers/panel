<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Table from '$lib/components/ui/table/index.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { VoiceStatus } from '$lib/voice/types';

	let { data, form } = $props();

	let uploading = $state(false);
	let processingId = $state<string | null>(null);

	function statusVariant(status: VoiceStatus) {
		switch (status) {
			case 'processed':
				return 'default' as const;
			case 'failed':
				return 'destructive' as const;
			case 'processing':
				return 'secondary' as const;
			default:
				return 'outline' as const;
		}
	}

	function formatWhen(value: Date | string | number | null | undefined) {
		if (!value) return '—';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleString();
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Voice</h1>
	<p class="text-sm text-muted-foreground">
		Upload a TF2 SourceTV demo, process voice into per-speaker clips, then open the timeline
		reconstruction.
	</p>

	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		class="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end"
		use:enhance={() => {
			uploading = true;
			return async ({ update }) => {
				await update();
				uploading = false;
			};
		}}
	>
		<label class="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
			<span class="font-medium">Demo file</span>
			<input
				type="file"
				name="demo"
				accept=".dem,application/octet-stream"
				required
				class="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
			/>
		</label>
		<Button type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button>
	</form>

	{#if form?.message}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>File</Table.Head>
					<Table.Head>Map</Table.Head>
					<Table.Head>Duration</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Uploaded</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.demos as demo (demo.id)}
					<Table.Row>
						<Table.Cell class="max-w-[14rem] truncate font-medium"
							>{demo.originalFilename}</Table.Cell
						>
						<Table.Cell class="text-muted-foreground">{demo.map ?? '—'}</Table.Cell>
						<Table.Cell class="text-muted-foreground tabular-nums">
							{demo.durationSeconds != null ? `${demo.durationSeconds}s` : '—'}
						</Table.Cell>
						<Table.Cell>
							<Badge variant={statusVariant(demo.status)}>{demo.status}</Badge>
							{#if demo.status === 'failed' && demo.errorMessage}
								<p
									class="mt-1 max-w-xs truncate text-xs text-destructive"
									title={demo.errorMessage}
								>
									{demo.errorMessage}
								</p>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">{formatWhen(demo.uploadedAt)}</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								{#if demo.status !== 'processed'}
									<form
										method="POST"
										action="?/process"
										use:enhance={() => {
											processingId = demo.id;
											return async ({ update }) => {
												await update();
												processingId = null;
											};
										}}
									>
										<input type="hidden" name="id" value={demo.id} />
										<Button
											type="submit"
											size="sm"
											variant="secondary"
											disabled={processingId === demo.id || demo.status === 'processing'}
										>
											{processingId === demo.id || demo.status === 'processing'
												? 'Processing…'
												: 'Process'}
										</Button>
									</form>
								{/if}
								{#if demo.status === 'processed'}
									<Button href="/voice/{demo.id}" size="sm">View</Button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="text-center text-muted-foreground">
							No demos uploaded yet.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
