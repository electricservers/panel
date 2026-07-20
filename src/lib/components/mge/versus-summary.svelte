<script lang="ts">
	import PlayerAvatar from '$lib/components/mge/player-avatar.svelte';
	import { toSteamId64 } from '$lib/mge/steam-id';
	import type { VersusSide, VersusSummary } from '$lib/server/versus-summary';

	let { a, b, summary }: { a: VersusSide; b: VersusSide; summary: VersusSummary } = $props();

	function profileHref(steam2: string): string {
		try {
			return `/mge/players/${toSteamId64(steam2)}`;
		} catch {
			return '#';
		}
	}

	function formatRelative(date: Date | null): string {
		if (!date) return '—';
		const diffMs = Date.now() - date.getTime();
		const minutes = Math.floor(diffMs / 60_000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `${days}d ago`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo ago`;
		return `${Math.floor(months / 12)}y ago`;
	}

	const aWinPct = $derived(summary.matches > 0 ? (summary.aWins / summary.matches) * 100 : 0);
	const bWinPct = $derived(100 - aWinPct);
</script>

<div class="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
	<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
		<a href={profileHref(a.steam2)} class="flex items-center gap-3 md:justify-end md:text-right">
			<div class="min-w-0 md:order-1">
				<p class="truncate font-medium text-foreground hover:text-brand hover:underline">
					{a.name}
				</p>
			</div>
			<PlayerAvatar
				name={a.name}
				avatarUrl={a.avatarUrl}
				size="lg"
				class="ring-2 ring-success/60"
			/>
		</a>

		<div class="text-center">
			<p class="text-xs tracking-wide text-muted-foreground uppercase">Head to head</p>
			<p class="font-heading text-3xl font-extrabold tracking-tight">
				{summary.aWins} : {summary.bWins}
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				{summary.matches} match{summary.matches === 1 ? '' : 'es'} · Last played {formatRelative(
					summary.lastPlayed
				)}
			</p>
		</div>

		<a href={profileHref(b.steam2)} class="flex items-center gap-3">
			<PlayerAvatar name={b.name} avatarUrl={b.avatarUrl} size="lg" class="ring-2 ring-danger/60" />
			<div class="min-w-0">
				<p class="truncate font-medium text-foreground hover:text-brand hover:underline">
					{b.name}
				</p>
			</div>
		</a>
	</div>

	<div>
		<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground">
			<span class="truncate">{a.name}</span>
			<span class="truncate">{b.name}</span>
		</div>
		<div class="relative h-4 w-full overflow-hidden rounded-full bg-muted">
			<div class="absolute inset-y-0 left-0 bg-success" style="width: {aWinPct}%"></div>
			<div class="absolute inset-y-0 right-0 bg-danger" style="width: {bWinPct}%"></div>
		</div>
	</div>

	<div>
		<p class="mb-2 text-sm font-medium">All arenas results</p>
		{#if summary.arenas.length === 0}
			<p class="text-sm text-muted-foreground">No arenas.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each summary.arenas as arena (arena.arena)}
					<div>
						<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground">
							<span class="truncate">{arena.arena}</span>
							<span>{arena.matches} game{arena.matches === 1 ? '' : 's'}</span>
						</div>
						<div class="relative h-5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="absolute inset-y-0 left-0 bg-success"
								style="width: {(arena.aWins / arena.matches) * 100}%"
							></div>
							<div
								class="absolute inset-y-0 right-0 bg-danger"
								style="width: {(arena.bWins / arena.matches) * 100}%"
							></div>
							<div
								class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground"
							>
								{arena.aWins} : {arena.bWins}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
