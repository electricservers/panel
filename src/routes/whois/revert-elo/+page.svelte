<script lang="ts">
  import Title from '$lib/components/Title.svelte';

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
    } catch (e: any) {
      errorMsg = e?.message || 'Failed to apply';
    } finally {
      applying = false;
    }
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
          <div><span class="text-gray-500">Matches:</span> {preview.matchesConsidered}</div>
          <div><span class="text-gray-500">Current rating:</span> {preview.currentRating ?? 'n/a'}</div>
          <div><span class="text-gray-500">Final rating:</span> {preview.finalRating ?? 'n/a'}</div>
        </div>
        <div class="mt-3">
          <div class="mb-1 font-medium">Changes</div>
          <div class="max-h-64 overflow-auto rounded border border-gray-200 dark:border-gray-700">
            <table class="w-full text-left">
              <thead class="sticky top-0 bg-gray-50 text-xs dark:bg-gray-900">
                <tr>
                  <th class="px-2 py-1">Match ID</th>
                  <th class="px-2 py-1">Target</th>
                  <th class="px-2 py-1">From</th>
                  <th class="px-2 py-1">To</th>
                </tr>
              </thead>
              <tbody>
                {#each preview.changes as c}
                  <tr class="border-t border-gray-100 text-xs dark:border-gray-800">
                    <td class="px-2 py-1 font-mono">{c.id}</td>
                    <td class="px-2 py-1">{c.target}</td>
                    <td class="px-2 py-1">{c.from ?? 'n/a'}</td>
                    <td class="px-2 py-1">{c.to ?? 'n/a'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {/if}
  </div>
</div>


