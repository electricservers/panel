<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatDate } from '$lib/format-date';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import type { AltGroup } from '$lib/whois/alt-group';

	let { group }: { group: AltGroup } = $props();

	const mainSteam = $derived(steamProfileUrl(group.mainSteamId));
</script>

<section class="flex flex-col gap-3 rounded-lg border border-border p-4">
	<div class="flex items-center gap-2">
		{#if mainSteam}
			<a
				href={mainSteam}
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-foreground hover:text-brand hover:underline"
			>
				{group.mainPermName ?? group.mainSteamId}
			</a>
		{:else}
			<span class="font-medium">{group.mainPermName ?? group.mainSteamId}</span>
		{/if}
		<a
			href="/whois?q={group.mainSteamId}"
			class="text-xs text-muted-foreground hover:text-brand hover:underline"
		>
			{group.mainSteamId}
		</a>
	</div>

	{#if group.alts.length === 0}
		<p class="text-sm text-muted-foreground">No alts linked yet.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each group.alts as alt (alt.steamid)}
				{@const altSteam = steamProfileUrl(alt.steamid)}
				<li class="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2">
					{#if altSteam}
						<a
							href={altSteam}
							target="_blank"
							rel="noopener noreferrer"
							class="text-sm text-foreground hover:text-brand hover:underline">{alt.steamid}</a
						>
					{:else}
						<a
							href="/whois?q={alt.steamid}"
							class="text-sm text-foreground hover:text-brand hover:underline">{alt.steamid}</a
						>
					{/if}
					<Badge variant="outline" class="text-xs">linked {formatDate(alt.linkedAt)}</Badge>

					<form method="POST" action="?/editAlt" class="flex items-center gap-1">
						<input type="hidden" name="sourceId" value={group.sourceId} />
						<input type="hidden" name="steamid" value={alt.steamid} />
						<Input
							type="text"
							name="mainSteamId"
							value={group.mainSteamId}
							class="h-7 w-40 text-xs"
							aria-label="Reassign main SteamID"
						/>
						<Button type="submit" variant="outline" size="sm" class="h-7 px-2 text-xs"
							>Reassign</Button
						>
					</form>

					<form method="POST" action="?/deleteAlt">
						<input type="hidden" name="sourceId" value={group.sourceId} />
						<input type="hidden" name="steamid" value={alt.steamid} />
						<Button type="submit" variant="ghost" size="sm" class="h-7 px-2 text-xs text-danger"
							>Unlink</Button
						>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
