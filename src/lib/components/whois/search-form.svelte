<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { q }: { q: string } = $props();
</script>

<form method="GET" class="flex flex-wrap items-end gap-2">
	<div class="flex flex-col gap-1">
		<label for="q" class="text-xs text-muted-foreground">SteamID, IP, or vanity URL</label>
		<Input id="q" type="search" name="q" placeholder="STEAM_0:1:2 / 1.2.3.4 / gaben" value={q} />
	</div>
	<Button type="submit" variant="outline">Search</Button>
</form>
