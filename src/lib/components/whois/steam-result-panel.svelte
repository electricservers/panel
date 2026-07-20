<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import SessionLogsTable from './session-logs-table.svelte';
	import AltNetworkTree from './alt-network-tree.svelte';
	import { formatDate } from '$lib/format-date';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import type { WhoisPlayerView } from '$lib/server/sources/whois/types';
	import type {
		AltInvestigationWithProfiles,
		SteamProfileInfo
	} from '$lib/server/whois-alt-avatars';
	import type { Source, Sourced } from '$lib/server/sources/types';

	let {
		player,
		investigation,
		subjectProfile,
		source
	}: {
		player: Sourced<WhoisPlayerView> | null;
		investigation?: AltInvestigationWithProfiles | null;
		subjectProfile?: SteamProfileInfo;
		source: Source;
	} = $props();

	const displayName = $derived(
		player?.permName ?? subjectProfile?.name ?? player?.steamid ?? 'Unknown'
	);
	const steamHref = $derived(player ? steamProfileUrl(player.steamid) : null);
</script>

<section class="flex flex-col gap-3 rounded-lg border border-border p-4">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-medium">{source.label}</h2>
		{#if player?.permName}
			<Badge>{player.permName}</Badge>
		{/if}
	</div>

	{#if !player}
		<p class="text-sm text-muted-foreground">No records for this SteamID on this source.</p>
	{:else}
		<div class="flex items-center gap-3">
			<PlayerAvatar
				name={displayName}
				avatarUrl={subjectProfile?.avatarUrl}
				steamid={player.steamid}
			/>
			<div class="flex min-w-0 flex-col leading-tight">
				{#if steamHref}
					<a
						href={steamHref}
						target="_blank"
						rel="noopener noreferrer"
						class="truncate text-sm font-medium hover:text-brand hover:underline"
					>
						{displayName}
					</a>
				{:else}
					<span class="truncate text-sm font-medium">{displayName}</span>
				{/if}
				<span class="truncate text-xs text-muted-foreground">{player.steamid}</span>
			</div>
		</div>

		<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
			<div>
				<dt class="text-xs text-muted-foreground">Sessions</dt>
				<dd>{player.sessionCount}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted-foreground">First seen</dt>
				<dd>{player.firstSeen ? formatDate(player.firstSeen) : '—'}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted-foreground">Last seen</dt>
				<dd>{player.lastSeen ? formatDate(player.lastSeen) : '—'}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted-foreground">Distinct IPs</dt>
				<dd>{player.distinctIps.length}</dd>
			</div>
		</dl>

		{#if player.knownNames.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each player.knownNames as name (name)}
					<Badge variant="outline">{name}</Badge>
				{/each}
			</div>
		{/if}

		{#if player.distinctIps.length > 0}
			<div class="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
				{#each player.distinctIps as ip (ip)}
					<a href="/whois?q={ip}" class="hover:text-brand hover:underline">{ip}</a>
				{/each}
			</div>
		{/if}

		{#if investigation}
			<AltNetworkTree
				subject={{
					steamid: player.steamid,
					permName: player.permName,
					name: subjectProfile?.name ?? player.steamid,
					avatarUrl: subjectProfile?.avatarUrl
				}}
				{investigation}
			/>
		{/if}

		<div class="overflow-hidden rounded-lg border border-border">
			<SessionLogsTable logs={player.logs} />
		</div>
	{/if}
</section>
