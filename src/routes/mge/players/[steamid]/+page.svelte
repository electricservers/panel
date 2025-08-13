<script lang="ts">
  import type { PageData } from './$types';
  import { steamStore } from '$lib/stores/steamStore';
  import { Avatar } from 'flowbite-svelte';
  import MostPlayedArenas from '$lib/components/mge/MostPlayedArenas.svelte';
  import ActivityCard from '$lib/components/mge/ActivityCard.svelte';
  import TopFoesPlaceholder from '$lib/components/mge/TopFoesPlaceholder.svelte';

  import { ID } from '@node-steam/id';
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { get } from 'svelte/store';
  import MatchList from '$lib/components/mge/MatchList.svelte';
  import { goto } from '$app/navigation';

  interface Props {
    data: PageData;
  }

  import { regionStore, type Region } from '$lib/stores/regionStore';
  let currentRegion: Region = $state('ar');
  let { data }: Props = $props();
  let games = $state<MgeDuel[]>([]);
  let id = $state('');

  let existsInAr = $state(Boolean(data.existsInAr));
  let existsInBr = $state(Boolean(data.existsInBr));
  const existsInAny = $derived(existsInAr || existsInBr);
  const existsInCurrent = $derived(currentRegion === 'ar' ? existsInAr : existsInBr);
  const otherRegion = $derived<Region>(currentRegion === 'ar' ? 'br' : 'ar');
  const existsInOther = $derived(otherRegion === 'ar' ? existsInAr : existsInBr);

  let pageSize = $state(5);
  let currentPage = $state(1);
  let totalItems = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

  let outcome = $state<'all' | 'win' | 'loss'>('all');

  let playerName = $state('');
  let wins = $state(0);
  let losses = $state(0);
  const totalMatches = $derived(wins + losses);
  const winrateNum = $derived(totalMatches ? (wins / totalMatches) * 100 : 0);
  const winrate = $derived(winrateNum.toFixed(1));
  let avatarUrl = $state<string | undefined>(undefined);
  let rating = $state<number | null>(null);
  let rankPosition = $state<number | null>(null);
  let activityLoading = $state(false);
  let activityTimes = $state<string[]>([]);
  let activityDays = $state(30);
  const lastSeenGlobal = $derived(Number(data.lastSeen ?? 0) || null);
  function formatLastSeen(ts: number | null): string {
    if (!ts) return '—';
    const diffMs = Date.now() - ts * 1000;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  }

  const fetchPlayerSummary = async (db: Region) => {
    avatarUrl = undefined;
    const params = new URLSearchParams({ db, steamid: id, take: '1', withRankPosition: '1' });
    const resp = await fetch(`/api/mge/rank?${params.toString()}`);
    const arr = await resp.json();
    const payload = Array.isArray(arr) ? { items: arr, position: null } : arr;
    const player = Array.isArray(payload.items) && payload.items.length > 0 ? payload.items[0] : null;
    if (player) {
      playerName = player.name ?? '';
      wins = player.wins ?? 0;
      losses = player.losses ?? 0;
      rating = player.rating ?? null;
      rankPosition = (payload.position as number | null) ?? null;
    } else {
      playerName = '';
      wins = 0;
      losses = 0;
      rating = null;
      rankPosition = null;
    }

    const u = get(steamStore);
    if (u && u.steamid === String(data.id)) {
      avatarUrl = u.avatarfull || u.avatarmedium || u.avatar;
    }
    if (!avatarUrl) {
      try {
        const resp2 = await fetch(`/api/steam/profile?steamid=${encodeURIComponent(String(data.id))}`);
        if (resp2.ok) {
          const profile = await resp2.json();
          avatarUrl = profile?.avatarfull || profile?.avatarmedium || profile?.avatar || undefined;
          if (!playerName && profile?.personaname) {
            playerName = profile.personaname;
          }
        }
      } catch {}
    }
  };

  const fetchGames = async (db: Region, page = 1, withTotal = false) => {
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({ db, steamid: id, skip: String(skip), take: String(pageSize) });
    if (outcome !== 'all') params.set('outcome', outcome);
    if (withTotal) params.set('withTotal', '1');
    const result = await fetch(`/api/mge/games?${params.toString()}`);
    const payload = await result.json();
    const items: MgeDuel[] = Array.isArray(payload) ? payload : payload.items;
    totalItems = Array.isArray(payload) ? totalItems : (payload.total ?? totalItems);
    games = items;
  };

  const fetchData = async (db: Region) => {
    id = new ID(data.id).getSteamID2();
    currentPage = 1;
    await Promise.all([fetchPlayerSummary(db), fetchGames(db, 1, true), fetchActivity(db)]);
  };

  const fetchActivity = async (db: Region) => {
    activityLoading = true;
    try {
      const params = new URLSearchParams({ db, steamid: id, take: '2000', days: String(activityDays) });
      const resp = await fetch(`/api/mge/activity?${params.toString()}`);
      if (resp.ok) {
        const payload = await resp.json();
        activityTimes = Array.isArray(payload?.gametimes) ? payload.gametimes : [];
      } else {
        activityTimes = [];
      }
    } catch {
      activityTimes = [];
    } finally {
      activityLoading = false;
    }
  };

  $effect(() => {
    const unsubscribe = steamStore.subscribe(() => {});
    const unreg = regionStore.subscribe((r) => {
      currentRegion = r;
      fetchData(r);
    });
    fetchData(currentRegion);
    return () => {
      unsubscribe();
      unreg();
    };
  });

  $effect(() => {
    outcome;
    currentPage = 1;
    fetchGames(currentRegion, 1, true);
  });

  $effect(() => {
    pageSize;
    currentPage = 1;
    fetchGames(currentRegion, 1, true);
  });

  $effect(() => {
    data.id;
    avatarUrl = undefined;
    fetchData(currentRegion);
  });
</script>

<div class="p-4">
  <div class="flex items-center gap-4">
    {#key data.id}
      <Avatar size="lg" src={avatarUrl} />
    {/key}
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{playerName || 'Player'}</h1>
      <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        {#if rating !== null}
          <span class="font-semibold text-gray-900 dark:text-gray-100">{rating}</span>
        {/if}
        {#if rankPosition !== null}
          <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <span class="fi fi-{currentRegion}"></span>
            <span>#{rankPosition}</span>
          </span>
        {/if}
        {#if lastSeenGlobal}
          <span class="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <span>Last seen</span>
            <span class="font-semibold">{formatLastSeen(lastSeenGlobal)}</span>
          </span>
        {/if}
      </div>
      <div class="mt-1 flex items-center gap-2">
        <a target="_blank" class="text-sm text-blue-600 hover:underline" href={`https://steamcommunity.com/profiles/${data.id}`}>View Steam profile</a>
        {#if $steamStore?.steamid && String($steamStore.steamid) !== String(data.id)}
          <button
            class="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            onclick={() => goto(`/mge/versus?a=${encodeURIComponent(String($steamStore.steamid))}&b=${encodeURIComponent(String(data.id))}`)}>
            See my stats vs this player
          </button>
        {/if}
      </div>
    </div>
  </div>
  <div class="mt-3 flex flex-col gap-3">
    {#if !existsInAny}
      <div class="rounded-md border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950 dark:text-rose-100">Player does not exist in any region.</div>
    {:else if !existsInCurrent && existsInOther}
      <div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-100">
        No stats in {currentRegion === 'ar' ? 'Argentina' : 'Brasil'}.
        <button class="ml-1 underline" onclick={() => regionStore.set(otherRegion)}>
          View in {otherRegion === 'ar' ? 'Argentina' : 'Brasil'}
        </button>
      </div>
    {/if}
    {#if existsInCurrent}
      <div class="flex flex-wrap items-end justify-start gap-x-8 gap-y-2">
        <div>
          <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Matches</div>
          <div class="text-2xl font-semibold">{totalMatches.toLocaleString()}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Wins</div>
          <div class="text-2xl font-semibold text-emerald-500">{wins.toLocaleString()}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Losses</div>
          <div class="text-2xl font-semibold text-rose-400">{losses.toLocaleString()}</div>
        </div>
        <div class="min-w-[200px] flex-1 md:max-w-[420px]">
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Winrate</span>
            <span>{winrate}%</span>
          </div>
          <div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div class="h-2 rounded-full bg-emerald-500" style={`width: ${winrateNum}%`}></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
<div class="h-[90vh] p-4">
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div class="lg:col-span-8">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <div class="text-xs text-gray-500 dark:text-gray-400">Outcome:</div>
        <button
          class={`rounded-md px-2 py-1 text-sm ${outcome === 'all' ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          onclick={() => {
            outcome = 'all';
          }}>
          All
        </button>
        <button
          class={`rounded-md px-2 py-1 text-sm ${outcome === 'win' ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          onclick={() => {
            outcome = 'win';
          }}>
          Wins
        </button>
        <button
          class={`rounded-md px-2 py-1 text-sm ${outcome === 'loss' ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          onclick={() => {
            outcome = 'loss';
          }}>
          Losses
        </button>

        <div class="ml-auto flex items-center gap-2">
          <div class="text-xs text-gray-500 dark:text-gray-400">Per page:</div>
          <select
            class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            value={String(pageSize)}
            onchange={(e) => {
              const v = Number((e.target as HTMLSelectElement).value);
              pageSize = v;
            }}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="25">25</option>
          </select>
        </div>
      </div>

      {#if existsInCurrent}
        <MatchList
          items={games}
          subjectId2={id}
          {currentPage}
          {totalPages}
          onPageChange={async (p: number) => {
            currentPage = p;
            await fetchGames(currentRegion, currentPage, false);
          }}
          emptyText="No matches in this region." />
      {:else}
        <div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-100">No matches in this region.</div>
      {/if}
    </div>
    <div class="flex flex-col gap-4 lg:col-span-4">
      <MostPlayedArenas steamid={id} />
      <ActivityCard
        gametimes={activityTimes}
        loading={activityLoading}
        days={activityDays}
        onDaysChange={async (d: number) => {
          activityDays = d;
          await fetchActivity(currentRegion);
        }} />
      <TopFoesPlaceholder />
    </div>
  </div>
</div>


