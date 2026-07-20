<script lang="ts">
	import SessionLogsTable from './session-logs-table.svelte';
	import { formatDate } from '$lib/format-date';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import type { WhoisIpView } from '$lib/server/sources/whois/types';
	import type { Source, Sourced } from '$lib/server/sources/types';

	let {
		view,
		source
	}: {
		view: Sourced<WhoisIpView>;
		source: Source;
	} = $props();
</script>

<section class="flex flex-col gap-3 rounded-lg border border-border p-4">
	<h2 class="text-sm font-medium">{source.label}</h2>

	{#if view.accounts.length === 0}
		<p class="text-sm text-muted-foreground">No accounts seen on this IP on this source.</p>
	{:else}
		<ul class="flex flex-col gap-1 text-sm">
			{#each view.accounts as account (account.steamid)}
				{@const steam = steamProfileUrl(account.steamid)}
				<li class="flex items-center justify-between gap-2">
					<div class="flex min-w-0 flex-col">
						{#if steam}
							<a
								href={steam}
								target="_blank"
								rel="noopener noreferrer"
								class="truncate font-medium text-foreground hover:text-brand hover:underline"
							>
								{account.name ?? account.steamid}
							</a>
						{:else}
							<span class="truncate font-medium">{account.name ?? account.steamid}</span>
						{/if}
						<a
							href="/whois?q={account.steamid}"
							class="truncate text-xs text-muted-foreground hover:text-brand hover:underline"
						>
							{account.steamid}
						</a>
					</div>
					<span class="shrink-0 text-xs text-muted-foreground">
						{account.sessionCount} session{account.sessionCount === 1 ? '' : 's'} · last {account.lastSeen
							? formatDate(account.lastSeen)
							: '—'}
					</span>
				</li>
			{/each}
		</ul>

		<div class="overflow-hidden rounded-lg border border-border">
			<SessionLogsTable logs={view.logs} showAccount />
		</div>
	{/if}
</section>
