<script lang="ts">
	import { enhance } from '$app/forms';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-6">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Settings</h1>

	{#if form?.message}
		<p class="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">
			{form.message}
		</p>
	{/if}

	<form
		method="POST"
		action="?/updateBranding"
		use:enhance
		class="flex flex-col gap-2 rounded-lg border border-border p-4"
	>
		<h2 class="text-sm font-medium">Branding</h2>
		<label for="site-name" class="text-xs text-muted-foreground">Site name</label>
		<Input id="site-name" type="text" name="siteName" value={data.siteName} required />
		<label for="site-description" class="text-xs text-muted-foreground">Site description</label>
		<Input
			id="site-description"
			type="text"
			name="siteDescription"
			value={data.siteDescription ?? ''}
		/>
		<Button type="submit" variant="outline" class="mt-2 self-start">Save branding</Button>
	</form>

	<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
		<h2 class="text-sm font-medium">Favicon</h2>
		<p class="text-sm text-muted-foreground">
			{data.hasFavicon ? 'A custom favicon is set.' : 'Using the default favicon.'}
		</p>
		<form
			method="POST"
			action="?/uploadFavicon"
			enctype="multipart/form-data"
			use:enhance
			class="flex items-center gap-2"
		>
			<input
				type="file"
				name="favicon"
				accept="image/x-icon,image/png,image/svg+xml"
				class="text-sm"
			/>
			<Button type="submit" variant="outline" size="sm">Upload</Button>
		</form>
		{#if data.hasFavicon}
			<form method="POST" action="?/removeFavicon" use:enhance>
				<Button type="submit" variant="ghost" size="sm" class="text-danger">Remove favicon</Button>
			</form>
		{/if}
	</div>

	<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
		<h2 class="text-sm font-medium">Modules</h2>
		{#each data.moduleToggles as toggle (toggle.capability)}
			<form method="POST" action="?/updateModuleToggle" use:enhance class="flex items-center gap-2">
				<input type="hidden" name="capability" value={toggle.capability} />
				<input type="hidden" name="enabled" value="off" />
				<label class="flex items-center gap-1.5 text-sm">
					<input
						type="checkbox"
						name="enabled"
						value="on"
						checked={toggle.enabled}
						onchange={(event) => event.currentTarget.form?.requestSubmit()}
					/>
					{toggle.capability}
				</label>
			</form>
		{/each}
	</div>
</div>
