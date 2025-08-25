<script lang="ts">
  import type { MgeDuel } from '$lib/mge/mgeduel';

  export interface Props {
    a64: string;
    b64: string;
    a2: string;
    games?: MgeDuel[];
  }

  let { a64, b64, a2, games }: Props = $props();
  import { regionStore, type Region } from '$lib/stores/regionStore';
  let currentRegion: Region = $state('ar');
  let allGames = $state<MgeDuel[]>([]);

  type SteamProfile = { personaname?: string; avatarfull?: string; avatarmedium?: string; avatar?: string };
  let profileA: SteamProfile | null = $state(null);
  let profileB: SteamProfile | null = $state(null);

  function bestAvatar(p?: SteamProfile | null): string | null {
    if (!p) return null;
    return p.avatarfull || p.avatarmedium || p.avatar || null;
  }

  function formatRelative(unixEpoch: string | number | null | undefined): string {
    if (!unixEpoch) return '—';
    const ts = Number(unixEpoch) * 1000;
    if (!Number.isFinite(ts)) return '—';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    const y = Math.floor(mo / 12);
    return `${y}y ago`;
  }

  async function fetchProfiles() {
    try {
      const ids = [a64, b64].filter(Boolean).join(',');
      if (!ids) return;
      const res = await fetch(`/api/steam/profile?steamids=${encodeURIComponent(ids)}`);
      if (!res.ok) return;
      const data = await res.json();
      profileA = data?.[a64] ?? null;
      profileB = data?.[b64] ?? null;
    } catch {}
  }

  $effect(() => {
    a64; b64;
    fetchProfiles();
  });

  // no debug logging

  $effect(() => {
    const unreg = regionStore.subscribe((r) => { currentRegion = r; });
    return () => unreg();
  });

  async function fetchAllGames(db: Region) {
    try {
      const params = new URLSearchParams({ db: db as string, versus: '1', a: a64, b: b64, take: '100000' });
      const res = await fetch(`/api/mge/games?${params.toString()}`);
      if (!res.ok) { allGames = []; return; }
      const payload = await res.json();
      allGames = Array.isArray(payload) ? payload : (payload.items ?? []);
    } catch { allGames = []; }
  }

  $effect(() => {
    a64; b64; currentRegion; games;
    if (Array.isArray(games) && games.length > 0) {
      allGames = games;
    } else {
      fetchAllGames(currentRegion);
    }
  });

  const totalMatches = $derived(allGames?.length ?? 0);
  const aWins = $derived(allGames?.reduce((acc, g) => acc + (g.winner === a2 ? 1 : 0), 0) ?? 0);
  const bWins = $derived(totalMatches - aWins);
  const aWinPct = $derived(totalMatches ? (aWins / totalMatches) * 100 : 0);
  const bWinPct = $derived(100 - aWinPct);
  let lastPlayedNum = $state<number | null>(null);
  $effect(() => {
    const list = Array.isArray(allGames) ? allGames : [];
    let maxTs = 0;
    for (const g of list) {
      const n = Number((g as any)?.endtime);
      if (Number.isFinite(n) && n > maxTs) maxTs = n;
    }
    if (maxTs > 0) {
      lastPlayedNum = maxTs;
    } else {
      const first = Number((list[0] as any)?.endtime);
      lastPlayedNum = Number.isFinite(first) && first > 0 ? first : null;
    }
  });

  type ArenaAgg = { arena: string; aWins: number; bWins: number; total: number };
  let topArenas = $state<ArenaAgg[]>([]);
  $effect(() => {
    const map = new Map<string, { aWins: number; bWins: number; total: number }>();
    for (const g of allGames ?? []) {
      const key = (g.arenanameCanonical as string) || (g.arenaname as string) || 'Unknown';
      const entry = map.get(key) ?? { aWins: 0, bWins: 0, total: 0 };
      if (g.winner === a2) entry.aWins += 1; else entry.bWins += 1;
      entry.total += 1;
      map.set(key, entry);
    }
    const arr: ArenaAgg[] = Array.from(map.entries())
      .map(([arena, v]) => ({ arena, aWins: v.aWins, bWins: v.bWins, total: v.total }))
      .sort((x, y) => (y.total - x.total) || x.arena.localeCompare(y.arena));
    topArenas = arr;
  });
</script>

<div class="w-full">
  <div class="mb-4 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
    <div class="flex items-center gap-3 md:justify-end">
      {#if bestAvatar(profileA)}
        <img src={bestAvatar(profileA) ?? ''} alt="A" class="h-12 w-12 rounded-full ring-2 ring-emerald-500/60" />
      {:else}
        <div class="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      {/if}
      <div class="min-w-0 text-right">
        <div class="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">{profileA?.personaname ?? a64}</div>
      </div>
    </div>
    <div class="text-center">
      <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Head to head</div>
      <div class="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{aWins} : {bWins}</div>
      <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{totalMatches} matches • Last played {formatRelative(lastPlayedNum as unknown as number | null | undefined)}</div>
    </div>
    <div class="flex items-center gap-3">
      <div class="min-w-0">
        <div class="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">{profileB?.personaname ?? b64}</div>
      </div>
      {#if bestAvatar(profileB)}
        <img src={bestAvatar(profileB) ?? ''} alt="B" class="h-12 w-12 rounded-full ring-2 ring-rose-500/60" />
      {:else}
        <div class="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      {/if}
    </div>
  </div>

  <div class="mb-6">
    <div class="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
      <span>{profileA?.personaname ?? 'Player A'}</span>
      <span>{profileB?.personaname ?? 'Player B'}</span>
    </div>
    <div class="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
      <div class="absolute left-0 top-0 h-4 rounded-l-full bg-emerald-500 transition-[width] duration-500" style={`width:${aWinPct}%`}></div>
      <div class="absolute right-0 top-0 h-4 rounded-r-full bg-rose-500 transition-[width] duration-500" style={`width:${bWinPct}%`}></div>
    </div>
  </div>

  <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div class="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">All arenas results</div>
    {#if topArenas.length === 0}
      <div class="text-sm text-gray-500">No arenas.</div>
    {:else}
      <div class="space-y-2">
        {#each topArenas as a}
          <div>
            <div class="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="truncate">{a.arena}</span>
              <span>{a.total} games</span>
            </div>
            <div class="relative h-5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div class="absolute left-0 top-0 h-5 bg-emerald-500 transition-[width] duration-500" style={`width:${(a.aWins / a.total) * 100}%`}></div>
              <div class="absolute right-0 top-0 h-5 bg-rose-500 transition-[width] duration-500" style={`width:${(a.bWins / a.total) * 100}%`}></div>
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-gray-900 dark:text-gray-100">{a.aWins} : {a.bWins}</div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>


