<script lang="ts">
	import { enhance } from '$app/forms';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import AltLinkGroup from '$lib/components/whois/alt-link-group.svelte';
	import AltLinksSkeleton from '$lib/components/whois/alt-links-skeleton.svelte';
	import SourceError from '$lib/components/shell/source-error.svelte';

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-4">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Alt links</h1>

	{#if form?.message}
		<p class="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">
			{form.message}
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<form
			method="POST"
			action="?/createPermname"
			use:enhance
			class="flex flex-col gap-2 rounded-lg border border-border p-4"
		>
			<h2 class="text-sm font-medium">Set permanent name</h2>
			<label for="permname-source" class="text-xs text-muted-foreground">Source</label>
			<select
				id="permname-source"
				name="sourceId"
				class="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
			>
				{#each data.sources as source (source.id)}
					<option value={source.id}>{source.label}</option>
				{/each}
			</select>
			<label for="permname-steamid" class="text-xs text-muted-foreground">SteamID</label>
			<Input id="permname-steamid" type="text" name="steamid" placeholder="STEAM_0:1:2" />
			<label for="permname-name" class="text-xs text-muted-foreground">Name</label>
			<Input id="permname-name" type="text" name="name" placeholder="Main display name" />
			<Button type="submit" variant="outline" class="self-start">Save name</Button>
		</form>

		<form
			method="POST"
			action="?/addAlt"
			use:enhance
			class="flex flex-col gap-2 rounded-lg border border-border p-4"
		>
			<h2 class="text-sm font-medium">Link an alt</h2>
			<label for="alt-source" class="text-xs text-muted-foreground">Source</label>
			<select
				id="alt-source"
				name="sourceId"
				class="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
			>
				{#each data.sources as source (source.id)}
					<option value={source.id}>{source.label}</option>
				{/each}
			</select>
			<label for="alt-steamid" class="text-xs text-muted-foreground">Alt SteamID</label>
			<Input id="alt-steamid" type="text" name="steamid" placeholder="STEAM_0:1:2" />
			<label for="alt-main" class="text-xs text-muted-foreground">Main SteamID</label>
			<Input id="alt-main" type="text" name="mainSteamId" placeholder="STEAM_0:0:3" />
			<Button type="submit" variant="outline" class="self-start">Link alt</Button>
		</form>
	</div>

	{#each data.sources as source (source.id)}
		<h2 class="text-sm font-medium text-muted-foreground">{source.label}</h2>
		{#await data.altGroups}
			<AltLinksSkeleton />
		{:then results}
			{@const result = results.find((r) => r.sourceId === source.id)}
			{#if result?.ok}
				{#if result.data.length === 0}
					<p class="text-sm text-muted-foreground">No alt links on this source yet.</p>
				{:else}
					<div class="flex flex-col gap-4">
						{#each result.data as group (group.mainSteamId)}
							<AltLinkGroup {group} />
						{/each}
					</div>
				{/if}
			{:else if result}
				<SourceError sourceLabel={source.label} variant="inline" detail={result.error} />
			{/if}
		{/await}
	{/each}
</div>
