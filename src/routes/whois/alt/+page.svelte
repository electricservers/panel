<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

  let { data } = $props<{ data: PageData }>();

  let profiles: Record<string, { avatar: string; avatarmedium: string; avatarfull: string; personaname?: string }> = $state({});
  let loadingProfiles = $state(false);
  let errorMsg: string | null = $state(null);
  let eloData: Record<string, { ar: number | null; br: number | null }> = $state({});
  let loadingElo = $state(false);
  let createPermPrompt: { steamid: string; profile?: { avatar: string; avatarmedium: string; avatarfull: string; personaname?: string } | null } | null = $state(null);

  const enhanceAddMain: SubmitFunction = ({ cancel }) => {
    return async ({ result, update }) => {
      if (result?.type === 'failure' && (result as any)?.data?.code === 'PERMNAME_NOT_FOUND') {
        cancel();
        const data: any = (result as any).data || {};
        errorMsg = data?.message || 'Permanent name not found for this Steam ID';
        // Try to fetch Steam profile to show avatar/persona in prompt
        try {
          const resp = await fetch(`/api/steam/profile?steamid=${encodeURIComponent(String(data?.steamid || ''))}`);
          if (resp.ok) {
            const profile = await resp.json();
            createPermPrompt = { steamid: data?.steamid, profile };
          } else {
            createPermPrompt = { steamid: data?.steamid };
          }
        } catch {
          createPermPrompt = { steamid: data?.steamid };
        }
        return;
      }
      await update();
    };
  };

  async function loadProfiles() {
    try {
      errorMsg = null;
      const ids = new Set<string>();
      for (const g of data.groups || []) {
        ids.add(g.main);
        for (const a of g.alts) ids.add(a);
      }
      if (ids.size === 0) {
        profiles = {};
        return;
      }
      loadingProfiles = true;
      const resp = await fetch(`/api/steam/profile?steamids=${encodeURIComponent(Array.from(ids).join(','))}`);
      if (!resp.ok) {
        loadingProfiles = false;
        return;
      }
      profiles = await resp.json();
      loadingProfiles = false;
    } catch (e: any) {
      loadingProfiles = false;
      errorMsg = e?.message || 'Failed to load Steam profiles';
    }
  }

  function pf(id: string) {
    return profiles[id];
  }

  function profileUrl(id: string) {
    return `https://steamcommunity.com/profiles/${id}`;
  }

  function formatElo(elo: { ar: number | null; br: number | null }): string {
    const parts = [];
    if (elo.ar !== null) parts.push(`AR: ${elo.ar}`);
    if (elo.br !== null) parts.push(`BR: ${elo.br}`);
    if (parts.length === 0) return 'No ELO';
    return parts.join(' | ');
  }

  async function loadEloData() {
    try {
      loadingElo = true;
      const ids = new Set<string>();
      for (const g of data.groups || []) {
        ids.add(g.main);
        for (const a of g.alts) ids.add(a);
      }
      if (ids.size === 0) {
        eloData = {};
        return;
      }
      
      // Call our utility function via a custom API endpoint
      const steamIds = Array.from(ids);
      const promises = steamIds.map(async (steamid) => {
        try {
          // Use q= so the API converts 64-bit to steam2 internally. Request take=1 for efficiency
          const resp = await fetch(`/api/mge/rank?q=${encodeURIComponent(steamid)}&db=ar&take=1`);
          const arRaw = resp.ok ? await resp.json() : null;
          const resp2 = await fetch(`/api/mge/rank?q=${encodeURIComponent(steamid)}&db=br&take=1`);
          const brRaw = resp2.ok ? await resp2.json() : null;

          const arFirst = Array.isArray(arRaw) ? arRaw[0] : arRaw?.items?.[0];
          const brFirst = Array.isArray(brRaw) ? brRaw[0] : brRaw?.items?.[0];

          return {
            steamid,
            ar: arFirst?.rating ?? null,
            br: brFirst?.rating ?? null
          };
        } catch {
          return { steamid, ar: null, br: null };
        }
      });
      
      const results = await Promise.all(promises);
      const newEloData: Record<string, { ar: number | null; br: number | null }> = {};
      for (const result of results) {
        newEloData[result.steamid] = { ar: result.ar, br: result.br };
      }
      eloData = newEloData;
    } catch (e: any) {
      console.error('Failed to load ELO data:', e);
    } finally {
      loadingElo = false;
    }
  }

  $effect(() => {
    loadProfiles();
    loadEloData();
  });
</script>

<div class="p-4">
  <div class="flex items-end justify-between gap-2 mb-4">
    <div>
      <Title>Alt Link</Title>
    </div>
  </div>
  <div class="container mx-auto max-w-6xl space-y-6 px-3">
    <section class="rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-lg font-semibold mb-3">Add Main</h2>
      <form method="POST" use:enhance={enhanceAddMain} class="flex gap-2">
        <input name="main" type="text" placeholder="SteamID64" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
        <button name="/add_main" formaction="?/add_main" class="rounded bg-blue-600 px-4 py-2 text-white">Add</button>
      </form>

      {#if createPermPrompt}
        <div class="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <div class="mb-2 font-medium">No permanent name found for this main. Create one:</div>
          <div class="mb-2 flex items-center gap-3">
            {#if createPermPrompt.profile?.avatarfull}
              <img src={createPermPrompt.profile.avatarfull} alt="avatar" class="h-10 w-10 rounded" />
            {:else}
              <div class="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700"></div>
            {/if}
            <div class="min-w-0">
              <div class="font-medium">{createPermPrompt.profile?.personaname || createPermPrompt.steamid}</div>
              <div class="font-mono text-xs text-gray-600 dark:text-gray-400">{createPermPrompt.steamid}</div>
            </div>
          </div>
          <form method="POST" use:enhance class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input name="steamid" type="text" readonly value={createPermPrompt.steamid} class="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200" />
            <input name="name" type="text" placeholder="Permanent display name (optional)" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
            <button name="/create_permname" formaction="?/create_permname" class="rounded bg-amber-600 px-4 py-2 text-white">Create Permaname</button>
          </form>
        </div>
      {/if}
    </section>

    {#if errorMsg}
      <div class="text-red-600 dark:text-red-400">{errorMsg}</div>
    {/if}

    <section class="space-y-4">
      {#each data.groups as g}
        <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div class="mb-3 flex items-center gap-3">
            {#if loadingProfiles}
              <div class="h-10 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            {:else if pf(g.main)?.avatarfull}
              <img class="h-10 w-10 rounded" src={pf(g.main).avatarfull} alt="avatar" />
            {:else}
              <div class="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700"></div>
            {/if}
            <div class="min-w-0">
              <a href={profileUrl(g.main)} target="_blank" rel="noreferrer" class="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                {pf(g.main)?.personaname || g.main}
                {#if g.permName}
                  <span class="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({g.permName})</span>
                {/if}
              </a>
              <div class="font-mono truncate text-xs text-gray-500">{g.main}</div>
              {#if eloData[g.main]}
                <div class="text-sm text-blue-600 dark:text-blue-400 font-medium">{formatElo(eloData[g.main])}</div>
              {:else if loadingElo}
                <div class="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              {/if}
            </div>
          </div>

          <div class="space-y-2">
            {#if (g.alts || []).length === 0}
              <div class="text-sm text-gray-500">No alts linked.</div>
            {:else}
              {#each g.alts as alt}
                <div class="flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                  <div class="flex items-center gap-3">
                    {#if loadingProfiles}
                      <div class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    {:else if pf(alt)?.avatarfull}
                      <img class="h-8 w-8 rounded" src={pf(alt).avatarfull} alt="avatar" />
                    {:else}
                      <div class="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700"></div>
                    {/if}
                    <div class="min-w-0">
                      <a href={profileUrl(alt)} target="_blank" rel="noreferrer" class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{pf(alt)?.personaname || alt}</a>
                      <div class="font-mono truncate text-xs text-gray-500">{alt}</div>
                      {#if eloData[alt]}
                        <div class="text-xs text-blue-600 dark:text-blue-400 font-medium">{formatElo(eloData[alt])}</div>
                      {:else if loadingElo}
                        <div class="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <form method="POST" use:enhance>
                      <input type="hidden" name="alt" value={alt} />
                      <input type="hidden" name="main" value={g.main} />
                      <button name="/delete_alt" formaction="?/delete_alt" class="rounded bg-red-600 px-3 py-1 text-xs text-white">Delete</button>
                    </form>
                    <a
                      class="rounded bg-emerald-600 px-3 py-1 text-xs text-white"
                      href={`/whois/revert-elo?steamid=${encodeURIComponent(alt)}&region=${encodeURIComponent('ar')}&auto=1`}
                      title="Analyze ELO reversion (AR)"
                      >Revert (AR)</a>
                    <a
                      class="rounded bg-indigo-600 px-3 py-1 text-xs text-white"
                      href={`/whois/revert-elo?steamid=${encodeURIComponent(alt)}&region=${encodeURIComponent('br')}&auto=1`}
                      title="Analyze ELO reversion (BR)"
                      >Revert (BR)</a>
                  </div>
                </div>
              {/each}
            {/if}
          </div>

          <div class="mt-3">
            <form method="POST" use:enhance class="flex gap-2">
              <input type="hidden" name="main" value={g.main} />
              <input name="alt" type="text" placeholder="Alt SteamID64" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
              <button name="/add_alt" formaction="?/add_alt" class="rounded bg-emerald-600 px-4 py-2 text-white">Add Alt</button>
            </form>
          </div>
        </div>
      {/each}
    </section>
  </div>
</div>


