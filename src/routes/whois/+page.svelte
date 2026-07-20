<script lang="ts">
	import SearchForm from '$lib/components/whois/search-form.svelte';
	import SteamResultPanel from '$lib/components/whois/steam-result-panel.svelte';
	import SteamResultPanelSkeleton from '$lib/components/whois/steam-result-panel-skeleton.svelte';
	import IpResultPanel from '$lib/components/whois/ip-result-panel.svelte';
	import IpResultPanelSkeleton from '$lib/components/whois/ip-result-panel-skeleton.svelte';
	import SourceError from '$lib/components/shell/source-error.svelte';

	let { data } = $props();

	function sourceFor(sourceId: string) {
		return (
			data.sources.find((source) => source.id === sourceId) ?? {
				id: sourceId,
				label: sourceId,
				enabled: true,
				capabilities: ['whois'] as const
			}
		);
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Whois</h1>

	<SearchForm q={data.q} />

	{#if !data.results}
		<p class="text-sm text-muted-foreground">
			Search by SteamID, IP address, or Steam vanity URL to investigate a player across every
			whois-capable source.
		</p>
	{:else}
		{#key data.q}
			{#await data.results}
				<div class="grid gap-4 md:grid-cols-2">
					{#each data.sources as source (source.id)}
						<SteamResultPanelSkeleton label={source.label} />
					{/each}
				</div>
			{:then results}
				{#if results.kind === 'invalid'}
					<p class="text-sm text-muted-foreground">
						"{data.q}" doesn't look like a SteamID, IP address, or vanity URL.
					</p>
				{:else if results.kind === 'vanity-not-found'}
					<p class="text-sm text-muted-foreground">
						Could not resolve vanity URL "{results.value}" to a SteamID.
					</p>
				{:else if results.kind === 'steam'}
					<div class="grid gap-4 md:grid-cols-2">
						{#each results.panels as panel (panel.sourceId)}
							{#if panel.ok}
								{@const investigation = results.investigations.find(
									(inv) => inv.sourceId === panel.sourceId
								)}
								<SteamResultPanel
									player={panel.data}
									investigation={investigation?.ok ? investigation.data : null}
									subjectProfile={results.subjectProfile}
									source={sourceFor(panel.sourceId)}
								/>
							{:else}
								<SourceError
									sourceLabel={sourceFor(panel.sourceId).label}
									variant="panel"
									detail={panel.error}
								/>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="grid gap-4 md:grid-cols-2">
						{#each results.panels as panel (panel.sourceId)}
							{#if panel.ok}
								<IpResultPanel view={panel.data} source={sourceFor(panel.sourceId)} />
							{:else}
								<SourceError
									sourceLabel={sourceFor(panel.sourceId).label}
									variant="panel"
									detail={panel.error}
								/>
							{/if}
						{/each}
					</div>
				{/if}
			{/await}
		{/key}
	{/if}
</div>
