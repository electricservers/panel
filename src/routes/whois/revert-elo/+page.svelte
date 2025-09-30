<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import { ID } from '@node-steam/id';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let steamid = '';
  let region: 'ar' | 'br' = 'ar';
  let from: string = '';
  let to: string = '';
  let versus: string = '';
  let scope: 'all' | 'wins' | 'losses' = 'all';
  let matchIdsRaw = '';

  let preview: any = null;
  let applying = false;
  let loading = false;
  let errorMsg: string | null = null;
  let initializedFromQuery = false;
  let history: any[] = [];
  let loadingHistory = false;
  let selectedHistory: any | null = null;

  type SteamProfile = { avatar?: string; avatarmedium?: string; avatarfull?: string; personaname?: string };
  let opponentProfiles: Record<string, SteamProfile> = {};

  function bestAvatar(p?: SteamProfile | null): string | null {
    if (!p) return null;
    return p.avatarfull || p.avatarmedium || p.avatar || null;
  }

  // Derived helpers for rendering empty states calmly
  let filteredChanges: any[] = [];
  $: filteredChanges = Array.isArray(preview?.changes) ? preview.changes.filter((c: any) => c.from != null || c.to != null) : [];
  $: matchesFound = typeof preview?.matchesConsidered === 'number' ? preview.matchesConsidered > 0 : false;
  $: hasOpponentAdjustments = Array.isArray(preview?.opponents) ? preview.opponents.length > 0 : false;

  // Initialize from URL query params and optionally auto-preview
  onMount(() => {
    if (initializedFromQuery) return;
    const params = $page.url.searchParams;
    const sid = params.get('steamid');
    const reg = params.get('region');
    const auto = params.get('auto');
    const sc = params.get('scope');
    const fromQ = params.get('from');
    const toQ = params.get('to');
    const vs = params.get('versus');
    const mids = params.get('matchIds');
    if (sid) steamid = sid;
    if (reg === 'ar' || reg === 'br') region = reg as 'ar' | 'br';
    if (sc === 'wins' || sc === 'losses' || sc === 'all') scope = sc as any;
    if (fromQ) from = fromQ;
    if (toQ) to = toQ;
    if (vs) versus = vs;
    if (mids) matchIdsRaw = mids;
    initializedFromQuery = true;
    if (sid && auto) {
      doPreview();
    }
  });

  function parseMatchIds(): number[] | undefined {
    const ids = matchIdsRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    return ids.length > 0 ? ids : undefined;
  }

  async function doPreview() {
    errorMsg = null;
    preview = null;
    loading = true;
    try {
      const body: any = {
        region,
        steamid,
        scope
      };
      const ids = parseMatchIds();
      if (ids) body.matchIds = ids;
      const f: any = {};
      if (from) f.from = Number(from);
      if (to) f.to = Number(to);
      if (versus) f.versusSteamId = versus;
      if (Object.keys(f).length > 0) body.filters = f;
      const resp = await fetch('/api/whois/revert-elo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed');
      preview = data;
      await loadOpponentProfiles();
      await loadHistory();
    } catch (e: any) {
      errorMsg = e?.message || 'Failed to preview';
    } finally {
      loading = false;
    }
  }

  async function doApply() {
    if (!preview) return;
    applying = true;
    errorMsg = null;
    try {
      const body: any = {
        region,
        steamid,
        scope,
        apply: true
      };
      const ids = parseMatchIds();
      if (ids) body.matchIds = ids;
      const f: any = {};
      if (from) f.from = Number(from);
      if (to) f.to = Number(to);
      if (versus) f.versusSteamId = versus;
      if (Object.keys(f).length > 0) body.filters = f;
      const resp = await fetch('/api/whois/revert-elo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed');
      preview = data;
      await loadOpponentProfiles();
      await loadHistory();
    } catch (e: any) {
      errorMsg = e?.message || 'Failed to apply';
    } finally {
      applying = false;
    }
  }

  async function loadOpponentProfiles() {
    try {
      opponentProfiles = {};
      const ops: any[] = Array.isArray(preview?.opponents) ? preview.opponents : [];
      const chs: any[] = Array.isArray(preview?.changes) ? preview.changes : [];
      const uniqueSteam2 = new Set<string>();
      for (const o of ops) if (o?.steamid2) uniqueSteam2.add(o.steamid2);
      for (const c of chs) if (c?.opponent) uniqueSteam2.add(c.opponent);
      if (uniqueSteam2.size === 0) return;
      const ids64: string[] = [];
      const map2to64: Record<string, string> = {};
      for (const sid2 of uniqueSteam2) {
        try {
          const id64 = new ID(sid2).get64();
          ids64.push(id64);
          map2to64[sid2] = id64;
        } catch {}
      }
      if (ids64.length === 0) return;
      const url = `/api/steam/profile?steamids=${encodeURIComponent(ids64.join(','))}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();
      const next: Record<string, SteamProfile> = {};
      for (const [sid2, sid64] of Object.entries(map2to64)) {
        const profile = data?.[sid64 as string];
        if (profile) next[sid2] = profile as SteamProfile;
      }
      opponentProfiles = next;
    } catch {}
  }

  async function loadHistory() {
    try {
      loadingHistory = true;
      history = [];
      if (!preview?.steamid2) return;
      const params = new URLSearchParams({ region, steamid2: preview.steamid2, take: String(50) });
      const resp = await fetch(`/api/whois/revert-elo/history?${params.toString()}`);
      const data = await resp.json();
      if (resp.ok && Array.isArray(data?.items)) history = data.items;
    } catch {}
    finally {
      loadingHistory = false;
    }
  }

  function openHistory(h: any) {
    selectedHistory = h;
    const dlg = document.getElementById('detailsDialog') as HTMLDialogElement | null;
    dlg?.showModal();
  }
  function closeDetails() {
    const dlg = document.getElementById('detailsDialog') as HTMLDialogElement | null;
    dlg?.close();
    selectedHistory = null;
  }
</script>

<div class="p-4">
  <div class="flex items-end justify-between gap-2 mb-4">
    <div>
      <Title>Revert ELO</Title>
      <div class="text-sm text-gray-600 dark:text-gray-300">Preview and revert ELO changes for an account.</div>
    </div>
  </div>

  <div class="container mx-auto max-w-3xl space-y-4 px-3">
    {#if errorMsg}
      <div class="rounded border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">{errorMsg}</div>
    {/if}

    <section class="rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="sid" class="mb-1 block text-sm font-medium">SteamID (64 or 2)</label>
          <input id="sid" bind:value={steamid} class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" placeholder="7656... or STEAM_..." />
        </div>
        <div>
          <label for="region" class="mb-1 block text-sm font-medium">Region</label>
          <select id="region" bind:value={region} class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="ar">AR</option>
            <option value="br">BR</option>
          </select>
        </div>
        <div>
          <label for="from" class="mb-1 block text-sm font-medium">From (unix seconds)</label>
          <input id="from" bind:value={from} type="number" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
        </div>
        <div>
          <label for="to" class="mb-1 block text-sm font-medium">To (unix seconds)</label>
          <input id="to" bind:value={to} type="number" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
        </div>
        <div>
          <label for="versus" class="mb-1 block text-sm font-medium">Versus (SteamID64 or 2)</label>
          <input id="versus" bind:value={versus} class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
        </div>
        <div>
          <label for="scope" class="mb-1 block text-sm font-medium">Scope</label>
          <select id="scope" bind:value={scope} class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All</option>
            <option value="wins">Wins only</option>
            <option value="losses">Losses only</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label for="mids" class="mb-1 block text-sm font-medium">Match IDs (optional, comma or space separated)</label>
          <input id="mids" bind:value={matchIdsRaw} class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button on:click|preventDefault={doPreview} class="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={loading || !steamid}>Preview</button>
        <button on:click|preventDefault={doApply} class="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50" disabled={!preview || applying}>Apply</button>
      </div>
    </section>

    {#if preview}
      <section class="rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-2 font-semibold">Preview</div>
        <div class="grid grid-cols-2 gap-2">
          <div><span class="text-gray-500">Region:</span> {preview.region}</div>
          <div><span class="text-gray-500">SteamID2:</span> {preview.steamid2}</div>
          {#if typeof preview.priorReversions === 'number' && preview.priorReversions > 0}
            <div class="col-span-2 mt-1 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
              Warning: This player has {preview.priorReversions} prior ELO reversion{preview.priorReversions === 1 ? '' : 's'} in this region.
            </div>
          {/if}
          <div><span class="text-gray-500">Matches:</span> {preview.matchesConsidered}</div>
          <div><span class="text-gray-500">Current rating:</span> {preview.currentRating ?? 'n/a'}</div>
          <div><span class="text-gray-500">Final rating:</span> {preview.finalRating ?? 'n/a'}</div>
          <div><span class="text-gray-500">Opponents:</span> {preview.opponentsCount ?? 0}</div>
          <div><span class="text-gray-500">Opponents total delta:</span> {preview.opponentsTotalDelta ?? 0}</div>
        </div>

        {#if !matchesFound}
          <div class="mt-3 rounded border border-blue-300 bg-blue-50 p-2 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
            No matches found for this player with the current filters. Nothing to revert.
          </div>
        {:else if filteredChanges.length === 0}
          <div class="mt-3 rounded border border-blue-300 bg-blue-50 p-2 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
            Matches found, but no recorded ELO history in this region/scope. The player's rating will be reset to 1600; opponents remain unchanged.
          </div>
        {/if}
        <div class="mt-3">
          <div class="mb-1 font-medium">Changes</div>
          <div class="max-h-64 overflow-auto rounded border border-gray-200 dark:border-gray-700">
            <table class="w-full text-left">
              <thead class="sticky top-0 bg-gray-50 text-xs dark:bg-gray-900">
                <tr>
                  <th class="px-2 py-1">Match ID</th>
                  <th class="px-2 py-1">Target</th>
                  <th class="px-2 py-1">Opponent</th>
                  <th class="px-2 py-1">Outcome</th>
                  <th class="px-2 py-1">From</th>
                  <th class="px-2 py-1">To</th>
                  <th class="px-2 py-1">Δ</th>
                </tr>
              </thead>
              <tbody>
                {#if filteredChanges.length === 0}
                  <tr class="border-t border-gray-100 text-xs dark:border-gray-800">
                    <td class="px-2 py-2 text-gray-500 dark:text-gray-400" colspan="7">No per-match ELO history to display.</td>
                  </tr>
                {:else}
                  {#each filteredChanges as c}
                  <tr class="border-t border-gray-100 text-xs dark:border-gray-800">
                    <td class="px-2 py-1 font-mono">{c.id}</td>
                    <td class="px-2 py-1">{c.target}</td>
                    <td class="px-2 py-1">
                      <div class="flex items-center gap-2">
                        {#if bestAvatar(opponentProfiles[c.opponent])}
                          <img class="h-5 w-5 rounded" src={bestAvatar(opponentProfiles[c.opponent]) ?? ''} alt="avatar" />
                        {/if}
                        <span class="font-medium">{opponentProfiles[c.opponent]?.personaname || c.opponent}</span>
                        <span class="font-mono text-[11px] text-gray-500">{c.opponent}</span>
                      </div>
                    </td>
                    <td class="px-2 py-1">{c.outcome}</td>
                    <td class="px-2 py-1">{c.from ?? 'n/a'}</td>
                    <td class="px-2 py-1">{c.to ?? 'n/a'}</td>
                    <td class="px-2 py-1">{c.delta ?? 'n/a'}</td>
                  </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        {#if hasOpponentAdjustments}
          <div class="mt-4">
            <div class="mb-1 font-medium">Opponents adjustments</div>
            <div class="max-h-64 overflow-auto rounded border border-gray-200 dark:border-gray-700">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-gray-50 text-xs dark:bg-gray-900">
                  <tr>
                    <th class="px-2 py-1">Opponent</th>
                    <th class="px-2 py-1">Current</th>
                    <th class="px-2 py-1">Delta</th>
                    <th class="px-2 py-1">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {#each preview.opponents as o}
                    <tr class="border-t border-gray-100 text-xs dark:border-gray-800">
                      <td class="px-2 py-1">
                        <div class="flex items-center gap-2">
                          {#if bestAvatar(opponentProfiles[o.steamid2])}
                            <img class="h-6 w-6 rounded" src={bestAvatar(opponentProfiles[o.steamid2]) ?? ''} alt="avatar" />
                          {/if}
                          <div class="flex flex-col">
                            <span class="font-medium">{opponentProfiles[o.steamid2]?.personaname || o.steamid2}</span>
                            <span class="font-mono text-[11px] text-gray-500">{o.steamid2}</span>
                          </div>
                        </div>
                      </td>
                      <td class="px-2 py-1">{o.currentRating ?? 'n/a'}</td>
                      <td class="px-2 py-1">{o.delta}</td>
                      <td class="px-2 py-1">{o.finalRating ?? 'n/a'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {:else}
          <div class="mt-4 rounded border border-blue-300 bg-blue-50 p-2 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
            No opponent ELO adjustments are required for this selection.
          </div>
        {/if}
      </section>
      <section class="mt-4 rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-2 font-semibold">Reversions history</div>
        {#if loadingHistory}
          <div class="text-gray-500">Loading history…</div>
        {:else if history.length === 0}
          <div class="text-gray-500">No past reversions for this player in this region.</div>
        {:else}
          <div class="max-h-64 overflow-auto rounded border border-gray-200 dark:border-gray-700">
            <table class="w-full text-left">
              <thead class="sticky top-0 bg-gray-50 text-xs dark:bg-gray-900">
                <tr>
                  <th class="px-2 py-1">When</th>
                  <th class="px-2 py-1">Actor</th>
                  <th class="px-2 py-1">Matches</th>
                  <th class="px-2 py-1">Opponents</th>
                  <th class="px-2 py-1">Δ total</th>
                  <th class="px-2 py-1">Final rating</th>
                </tr>
              </thead>
              <tbody>
                {#each history as h}
                  <tr class="cursor-pointer border-t border-gray-100 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900" on:click={() => openHistory(h)}>
                    <td class="px-2 py-1">{new Date(h.createdAt).toLocaleString()}</td>
                    <td class="px-2 py-1">{h.actorName || h.actorSteam64 || 'Unknown'}</td>
                    <td class="px-2 py-1">{h.summary?.matchesConsidered ?? 'n/a'}</td>
                    <td class="px-2 py-1">{h.summary?.opponentsCount ?? 0}</td>
                    <td class="px-2 py-1">{h.summary?.opponentsTotalDelta ?? 0}</td>
                    <td class="px-2 py-1">{h.summary?.finalRatingApplied ?? 'n/a'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/if}
  </div>
</div>

<dialog id="detailsDialog" class="modal">
  {#if selectedHistory}
    <div class="modal-box max-w-4xl bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">
      <div class="mb-2 text-lg font-semibold">Reversion details</div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-gray-500">When:</span> {new Date(selectedHistory.createdAt).toLocaleString()}</div>
        <div><span class="text-gray-500">Actor:</span> {selectedHistory.actorName || selectedHistory.actorSteam64 || 'Unknown'}</div>
        <div><span class="text-gray-500">Region:</span> {selectedHistory.region}</div>
        <div><span class="text-gray-500">Target:</span> {selectedHistory.targetSteam2}</div>
      </div>
      <div class="mt-3 max-h-64 overflow-auto rounded border border-gray-200 dark:border-gray-700">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-gray-50 text-xs dark:bg-gray-900">
            <tr>
              <th class="px-2 py-1">Opponent</th>
              <th class="px-2 py-1">Δ</th>
              <th class="px-2 py-1">Final</th>
            </tr>
          </thead>
          <tbody>
            {#each selectedHistory.opponents || [] as o}
              <tr class="border-t border-gray-100 text-xs dark:border-gray-800">
                <td class="px-2 py-1">{o.steamid2}</td>
                <td class="px-2 py-1">{o.delta}</td>
                <td class="px-2 py-1">{o.finalRating ?? 'n/a'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-3 text-right">
        <button class="rounded bg-gray-700 px-3 py-1 text-white" on:click={closeDetails}>Close</button>
      </div>
    </div>
  {/if}
</dialog>



