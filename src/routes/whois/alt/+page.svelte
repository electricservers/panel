<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  let { data } = $props<{ data: PageData }>();

  let profiles: Record<string, { avatar: string; avatarmedium: string; avatarfull: string; personaname?: string }> = $state({});
  let loadingProfiles = $state(false);
  let errorMsg: string | null = $state(null);

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

  $effect(() => {
    loadProfiles();
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
      <form method="POST" use:enhance class="flex gap-2">
        <input name="main" type="text" placeholder="SteamID64" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
        <button name="/add_main" formaction="?/add_main" class="rounded bg-blue-600 px-4 py-2 text-white">Add</button>
      </form>
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
              <a href={profileUrl(g.main)} target="_blank" rel="noreferrer" class="font-semibold text-blue-600 hover:underline dark:text-blue-400">{pf(g.main)?.personaname || g.main}</a>
              <div class="font-mono truncate text-xs text-gray-500">{g.main}</div>
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
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <form method="POST" use:enhance>
                      <input type="hidden" name="alt" value={alt} />
                      <input type="hidden" name="main" value={g.main} />
                      <button name="/delete_alt" formaction="?/delete_alt" class="rounded bg-red-600 px-3 py-1 text-xs text-white">Delete</button>
                    </form>
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


