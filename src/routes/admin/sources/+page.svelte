<script lang="ts">
	import { enhance } from '$app/forms';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-6">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Sources</h1>

	{#if form?.message}
		<p class="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">
			{form.message}
		</p>
	{/if}

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="flex flex-col gap-2 rounded-lg border border-border p-4"
	>
		<h2 class="text-sm font-medium">New source</h2>
		<label for="new-id" class="text-xs text-muted-foreground">Id</label>
		<Input id="new-id" type="text" name="id" placeholder="electric-ar" required />
		<label for="new-label" class="text-xs text-muted-foreground">Label</label>
		<Input id="new-label" type="text" name="label" placeholder="Argentina" required />
		<label for="new-dsn-env" class="text-xs text-muted-foreground">DSN env var</label>
		<Input
			id="new-dsn-env"
			type="text"
			name="dsnEnv"
			placeholder="SOURCE_ELECTRIC_AR_URL"
			required
		/>
		<span class="text-xs text-muted-foreground">Capabilities</span>
		<div class="flex flex-wrap gap-3">
			{#each data.knownCapabilities as capability (capability)}
				<label class="flex items-center gap-1.5 text-sm">
					<input type="checkbox" name="capabilities" value={capability} />
					{capability}
				</label>
			{/each}
		</div>
		<label class="flex items-center gap-1.5 text-sm">
			<input type="checkbox" name="enabled" checked />
			Enabled
		</label>
		<Button type="submit" variant="outline" class="mt-2 self-start">Create source</Button>
	</form>

	<div class="flex flex-col gap-4">
		{#each data.sourceRows as row (row.id)}
			<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
				<div class="flex items-center justify-between">
					<h2 class="font-mono text-sm font-medium">{row.id}</h2>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={row.id} />
						<Button type="submit" variant="ghost" size="sm" class="text-danger">Delete</Button>
					</form>
				</div>
				<form method="POST" action="?/update" use:enhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={row.id} />
					<label for="label-{row.id}" class="text-xs text-muted-foreground">Label</label>
					<Input id="label-{row.id}" type="text" name="label" value={row.label} required />
					<label for="dsn-{row.id}" class="text-xs text-muted-foreground">DSN env var</label>
					<Input id="dsn-{row.id}" type="text" name="dsnEnv" value={row.dsnEnv} required />
					<span class="text-xs text-muted-foreground">Capabilities</span>
					<div class="flex flex-wrap gap-3">
						{#each data.knownCapabilities as capability (capability)}
							<label class="flex items-center gap-1.5 text-sm">
								<input
									type="checkbox"
									name="capabilities"
									value={capability}
									checked={row.capabilities.includes(capability)}
								/>
								{capability}
							</label>
						{/each}
					</div>
					<label class="flex items-center gap-1.5 text-sm">
						<input type="checkbox" name="enabled" checked={row.enabled} />
						Enabled
					</label>
					<Button type="submit" variant="outline" class="mt-2 self-start">Save</Button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No sources yet. Create one above.</p>
		{/each}
	</div>
</div>
