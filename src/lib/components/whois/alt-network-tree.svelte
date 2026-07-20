<script lang="ts">
	import Badge, { type BadgeVariant } from '$lib/components/ui/badge/badge.svelte';
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { formatDate } from '$lib/format-date';
	import { steamProfileUrl } from '$lib/mge/steam-id';
	import type { AltCandidate } from '$lib/server/sources/whois/types';
	import type {
		AltCandidateWithProfile,
		AltInvestigationLinkWithProfile,
		AltInvestigationWithProfiles
	} from '$lib/server/whois-alt-avatars';

	let {
		subject,
		investigation
	}: {
		subject: { steamid: string; permName: string | null; name: string; avatarUrl?: string };
		investigation: AltInvestigationWithProfiles;
	} = $props();

	type ConfirmedNode = AltInvestigationLinkWithProfile & { role: 'Main' | 'Alt' };

	function labelVariant(label: AltCandidate['label']): BadgeVariant {
		if (label === 'Likely') return 'destructive';
		if (label === 'Possible') return 'default';
		return 'outline';
	}

	function lastSeenLabel(lastSeen: Date | null): string {
		return lastSeen ? `Last seen ${formatDate(lastSeen)}` : 'No recent activity';
	}

	function accountSteamId(node: ConfirmedNode): string {
		return node.role === 'Main' ? (node.mainSteamId ?? node.steamid) : node.steamid;
	}

	const confirmedNodes = $derived.by((): ConfirmedNode[] => {
		const nodes: ConfirmedNode[] = [];
		if (investigation.linkedMain) {
			nodes.push({ ...investigation.linkedMain, role: 'Main' });
		}
		for (const alt of investigation.linkedAlts) {
			nodes.push({ ...alt, role: 'Alt' });
		}
		return nodes;
	});

	const candidateBranches = $derived.by(() => {
		const labels = ['Likely', 'Possible', 'Unlikely'] as const;
		return labels
			.map((label) => ({
				label,
				candidates: investigation.candidates.filter((candidate) => candidate.label === label)
			}))
			.filter((branch) => branch.candidates.length > 0);
	});

	const hasContent = $derived(confirmedNodes.length > 0 || candidateBranches.length > 0);
	const subjectSteam = $derived(steamProfileUrl(subject.steamid));
</script>

{#snippet candidateList(candidates: AltCandidateWithProfile[])}
	<ul class="mt-1 flex flex-col gap-2 border-l border-border pl-4">
		{#each candidates as candidate (candidate.steamid)}
			{@const steam = steamProfileUrl(candidate.steamid)}
			<li class="relative py-0.5">
				<span class="absolute top-4 -left-4 h-px w-4 bg-border"></span>
				<div class="flex flex-wrap items-center gap-2">
					<PlayerAvatar
						name={candidate.name}
						avatarUrl={candidate.avatarUrl}
						steamid={candidate.steamid}
						size="sm"
					/>
					<div class="flex flex-col leading-tight">
						{#if steam}
							<a
								href={steam}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm font-medium hover:text-brand hover:underline">{candidate.name}</a
							>
						{:else}
							<span class="text-sm font-medium">{candidate.name}</span>
						{/if}
						<a
							href="/whois?q={candidate.steamid}"
							class="text-xs text-muted-foreground hover:text-brand hover:underline"
							>{candidate.steamid}</a
						>
					</div>
					<Badge variant={labelVariant(candidate.label)}
						>{candidate.label} · {Math.round(candidate.score * 100)}%</Badge
					>
					<span class="text-xs text-muted-foreground">{lastSeenLabel(candidate.lastSeen)}</span>
					<a href="/whois/alt" class="ml-auto text-xs text-brand hover:underline">Link</a>
				</div>
				{#if candidate.sharedIps.length > 0 || candidate.knownNames.length > 0}
					<ul
						class="mt-1 flex flex-col gap-1 border-l border-border/60 pl-4 text-xs text-muted-foreground"
					>
						{#if candidate.sharedIps.length > 0}
							<li class="relative py-0.5">
								<span class="absolute top-1/2 -left-4 h-px w-4 bg-border/60"></span>
								Shared IP{candidate.sharedIps.length === 1 ? '' : 's'}: {candidate.sharedIps.join(
									', '
								)}
							</li>
						{/if}
						{#if candidate.knownNames.length > 0}
							<li class="relative py-0.5">
								<span class="absolute top-1/2 -left-4 h-px w-4 bg-border/60"></span>
								Known names: {candidate.knownNames.join(', ')}
							</li>
						{/if}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#if hasContent}
	<div class="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
		<div class="flex items-center gap-2">
			<PlayerAvatar name={subject.name} avatarUrl={subject.avatarUrl} steamid={subject.steamid} />
			<div class="flex flex-col leading-tight">
				{#if subjectSteam}
					<a
						href={subjectSteam}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm font-medium hover:text-brand hover:underline"
					>
						{subject.permName ?? subject.name}
					</a>
				{:else}
					<span class="text-sm font-medium">{subject.permName ?? subject.name}</span>
				{/if}
				<span class="text-xs text-muted-foreground">{subject.steamid}</span>
			</div>
			<Badge variant="outline" class="ml-auto">Alt network</Badge>
		</div>

		<ul class="ml-4 flex flex-col gap-2 border-l border-border pl-4">
			{#if confirmedNodes.length > 0}
				<li class="relative">
					<span class="absolute top-3 -left-4 h-px w-4 bg-border"></span>
					<p class="text-xs font-medium text-muted-foreground">
						Confirmed ({confirmedNodes.length})
					</p>
					<ul class="mt-1 flex flex-col gap-2 border-l border-border pl-4">
						{#each confirmedNodes as node (node.role + node.steamid)}
							{@const accountId = accountSteamId(node)}
							{@const steam = steamProfileUrl(accountId)}
							<li class="relative py-0.5">
								<span class="absolute top-4 -left-4 h-px w-4 bg-border"></span>
								<div class="flex flex-wrap items-center gap-2">
									<PlayerAvatar
										name={node.name}
										avatarUrl={node.avatarUrl}
										steamid={accountId}
										size="sm"
									/>
									<div class="flex flex-col leading-tight">
										{#if steam}
											<a
												href={steam}
												target="_blank"
												rel="noopener noreferrer"
												class="text-sm font-medium hover:text-brand hover:underline">{node.name}</a
											>
										{:else}
											<span class="text-sm font-medium">{node.name}</span>
										{/if}
										<a
											href="/whois?q={accountId}"
											class="text-xs text-muted-foreground hover:text-brand hover:underline"
											>{accountId}</a
										>
									</div>
									<Badge variant="secondary">{node.role}</Badge>
									<span class="text-xs text-muted-foreground">{lastSeenLabel(node.lastSeen)}</span>
									{#if node.linkedBy}
										<span class="text-xs text-muted-foreground">linked by {node.linkedBy}</span>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</li>
			{/if}

			{#each candidateBranches as branch (branch.label)}
				<li class="relative">
					<span class="absolute top-3 -left-4 h-px w-4 bg-border"></span>
					{#if branch.label === 'Unlikely'}
						<details class="group/branch">
							<summary class="cursor-pointer text-xs font-medium text-muted-foreground select-none">
								{branch.label} ({branch.candidates.length})
								<span class="text-muted-foreground/70 group-open/branch:hidden">— show</span>
								<span class="hidden text-muted-foreground/70 group-open/branch:inline">— hide</span>
							</summary>
							{@render candidateList(branch.candidates)}
						</details>
					{:else}
						<p class="text-xs font-medium text-muted-foreground">
							{branch.label} ({branch.candidates.length})
						</p>
						{@render candidateList(branch.candidates)}
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
