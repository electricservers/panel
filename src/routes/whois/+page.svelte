<script lang="ts">
  import Title from '$lib/components/Title.svelte';

  // PageData currently unused in this view; removing unused interface

  let query = $state('');
  let loading = $state(false);
  let errorMsg: string | null = $state(null);
  let result: any = $state(null);
  let alts: any[] = $state([]);
  let profiles: Record<string, { avatar: string; avatarmedium: string; avatarfull: string; personaname?: string }> = $state({});
  // track if a search has been attempted; currently not used in UI
  // let hasSearched = $state(false);
  let showAllNames = $state(false);
  let showAllIPs = $state(false);
  let showAllLogs = $state(false);
  let loadingWhois = $state(false);
  let loadingAlts = $state(false);
  let loadingProfiles = $state(false);
  const namesLimit = 20;
  const ipsLimit = 30;
  const logsLimit = 100;

  async function runSearch() {
    errorMsg = null;
    result = null;
    const q = query.trim();
    if (!q) return;
    // hasSearched = true;
    loading = true;
    loadingWhois = true;
    loadingAlts = false;
    loadingProfiles = false;
    try {
      const resp = await fetch(`/api/whois?q=${encodeURIComponent(q)}`, { method: 'GET' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      result = json;
      loadingWhois = false;
      // fetch alts if steam and has records
      if (result?.type === 'steam' && result?.exists !== false) {
        loadingAlts = true;
        const ar = await fetch(`/api/whois/alts?steamid=${encodeURIComponent(result.steamid)}`);
        const aj = await ar.json();
        if (ar.ok) alts = aj.candidates || [];
        loadingAlts = false;
      } else {
        alts = [];
      }

      // fetch steam profiles for subject, alts, and ip accounts
      const ids = new Set<string>();
      if (result?.type === 'steam' && result?.steamid) ids.add(result.steamid);
      for (const a of alts || []) if (a.steamid64) ids.add(a.steamid64);
      for (const acc of result?.accounts || []) if (acc?.steamid64) ids.add(acc.steamid64);
      if (ids.size > 0) {
        loadingProfiles = true;
        const pr = await fetch(`/api/steam/profile?steamids=${encodeURIComponent(Array.from(ids).join(','))}`);
        const pj = await pr.json();
        if (pr.ok) profiles = pj || {};
        loadingProfiles = false;
      } else {
        profiles = {};
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Unexpected error';
    } finally {
      loading = false;
    }
  }

  function formatDate(d?: string) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  }

  function profileFor(steamid64?: string) {
    if (!steamid64) return null;
    return profiles[steamid64] || null;
  }

  function steamProfileUrl(steamid64?: string) {
    return steamid64 ? `https://steamcommunity.com/profiles/${steamid64}` : '#';
  }

  function shown<T = any>(list: T[] | undefined | null, showAll: boolean, limit: number): T[] {
    if (!list) return [];
    return showAll ? list : list.slice(0, limit);
  }

  function toDate(val: any): Date | null {
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  function combineRowDateTime(row: any): Date | null {
    if (!row) return null;
    if (row.timestamp && typeof row.timestamp === 'number') {
      const d = new Date(row.timestamp * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = toDate(row.date);
    const t = toDate(row.time);
    if (!d && !t) return null;
    if (d && !t) return d;
    if (!d && t) return t;
    // Merge clock from t into d (local time)
    const merged = new Date(d!);
    merged.setHours(t!.getHours(), t!.getMinutes(), t!.getSeconds(), t!.getMilliseconds());
    return merged;
  }

  function formatDateTimeStamp(tsSeconds: any, rowFallback?: any): string {
    let d: Date | null = null;
    const n = Number(tsSeconds);
    if (!isNaN(n) && n > 0) {
      d = new Date(n * 1000);
    } else if (rowFallback) {
      d = combineRowDateTime(rowFallback);
    }
    if (!d) return '';
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mm = months[d.getMonth()];
      const dd = d.getDate();
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${mm} ${dd}, ${yyyy} ${hh}:${mi}:${ss}`;
    } catch {
      return d.toString();
    }
  }

  function formatElo(elo: { ar: number | null; br: number | null }): string {
    const parts = [];
    if (elo.ar !== null) parts.push(`AR: ${elo.ar}`);
    if (elo.br !== null) parts.push(`BR: ${elo.br}`);
    if (parts.length === 0) return 'No ELO';
    return parts.join(' | ');
  }
</script>

<div class="p-4">
  <div class="flex items-end justify-between gap-2 mb-4">
    <div>
      <Title>Whois</Title>
    </div>
  </div>
  <div class="container mx-auto max-w-6xl space-y-6 px-3">
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={query}
        placeholder="SteamID64 / STEAM_1:X:Y / [U:1:Z] / profile URL / IPv4"
        class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        onkeydown={(e) => {
          if (e.key === 'Enter') runSearch();
        }} />
      <button onclick={runSearch} class="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={loading}>
        {loading ? 'Searching…' : 'Search'}
      </button>
    </div>

    {#if errorMsg}
      <div class="text-red-600 dark:text-red-400">{errorMsg}</div>
    {/if}

    <!-- Section-specific skeletons are rendered inline below -->

    {#if result}
      {#if result.type === 'steam'}
        <section class="space-y-3">
          <div class="flex items-center gap-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            {#if loadingProfiles}
              <div class="h-16 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            {:else if profileFor(result.steamid)?.avatarfull}
              <img class="h-16 w-16 rounded" src={profileFor(result.steamid)?.avatarfull} alt="avatar" />
            {:else}
              <div class="h-16 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
            {/if}
            <div class="min-w-0">
              {#if loadingProfiles}
                <div class="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              {:else}
                <a class="text-lg font-semibold text-blue-600 hover:underline dark:text-blue-400" href={steamProfileUrl(result.steamid)} target="_blank" rel="noreferrer">
                  {profileFor(result.steamid)?.personaname || 'Steam profile'}
                </a>
              {/if}
              {#if result.names?.permanent}
                <span class="ml-2 rounded-full border border-emerald-200/50 bg-emerald-100 px-2 py-0.5 align-middle text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                  >{result.names.permanent}</span>
              {/if}
              <div class="font-mono truncate text-sm text-gray-500">{result.steamid}</div>
              {#if result.elo}
                <div class="text-sm text-blue-600 dark:text-blue-400 font-medium">{formatElo(result.elo)}</div>
              {/if}
            </div>
          </div>

          {#if result.exists === false}
            <div class="rounded border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              No records found for this player in WHOIS logs.
            </div>
          {/if}

          {#if result.exists !== false}
            <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div class="mb-2 text-sm text-gray-500">Known names (latest first)</div>
              {#if loadingWhois}
                <div class="flex flex-wrap gap-2">
                  {#each Array(6) as _}
                    <span class="animate-pulse rounded bg-gray-200 px-8 py-3 dark:bg-gray-700"></span>
                  {/each}
                </div>
              {:else}
                <div class="flex flex-wrap gap-2">
                  {#each shown(result.names?.known, showAllNames, namesLimit) as n}
                    <span class="rounded bg-gray-100 px-2 py-1 text-gray-800 dark:bg-gray-700 dark:text-gray-100">{n}</span>
                  {/each}
                </div>
                {#if (result.names?.known?.length || 0) > namesLimit}
                  <div class="mt-2">
                    <button onclick={() => (showAllNames = !showAllNames)} class="text-xs text-blue-600 hover:underline dark:text-blue-400">
                      {showAllNames ? 'Show less' : 'Show all'} ({result.names?.known?.length})
                    </button>
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        </section>

        {#if result.exists !== false}
          <section class="space-y-3">
            <h2 class="text-xl font-semibold">IPs</h2>
            {#if loadingWhois}
              <div class="flex flex-wrap gap-2">
                {#each Array(10) as _}
                  <span class="animate-pulse rounded bg-gray-200 px-10 py-3 dark:bg-gray-700"></span>
                {/each}
              </div>
            {:else}
              <div class="flex flex-wrap gap-2">
                {#each shown(result.summary?.distinctIPs, showAllIPs, ipsLimit) as ip}
                  <span class="rounded bg-gray-100 px-2 py-1 text-gray-800 dark:bg-gray-700 dark:text-gray-100">{ip}</span>
                {/each}
              </div>
              {#if (result.summary?.distinctIPs?.length || 0) > ipsLimit}
                <button onclick={() => (showAllIPs = !showAllIPs)} class="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  {showAllIPs ? 'Show less' : 'Show all'} ({result.summary?.distinctIPs?.length})
                </button>
              {/if}
            {/if}
          </section>
        {/if}

        {#if result.exists !== false}
          <section class="space-y-3">
            <h2 class="text-xl font-semibold">Alt candidates</h2>
            {#if loadingAlts}
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {#each Array(4) as _}
                  <div class="h-20 animate-pulse rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"></div>
                {/each}
              </div>
            {:else if alts.length === 0}
              <div class="text-sm text-gray-500">No alts found for this user.</div>
            {:else}
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {#each alts as a}
                  <div class="flex items-center gap-3 rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                    {#if loadingProfiles}
                      <div class="h-12 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    {:else if profileFor(a.steamid64)?.avatarfull}
                      <img class="h-12 w-12 rounded" src={profileFor(a.steamid64)?.avatarfull} alt="avatar" />
                    {:else}
                      <div class="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700"></div>
                    {/if}
                    <div class="min-w-0 flex-1">
                      {#if loadingProfiles}
                        <div class="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      {:else}
                        <a class="font-medium text-blue-600 hover:underline dark:text-blue-400" href={steamProfileUrl(a.steamid64)} target="_blank" rel="noreferrer"
                          >{profileFor(a.steamid64)?.personaname || a.steamid64 || a.steamidRaw}</a>
                      {/if}
                      <div class="font-mono truncate text-xs text-gray-500">{a.steamid64 || a.steamidRaw}</div>
                      <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">Score {(a.score * 100).toFixed(0)}% · {a.label}</div>
                      {#if a.elo}
                        <div class="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">{formatElo(a.elo)}</div>
                      {/if}
                      <div class="mt-1 flex flex-wrap gap-1">
                        {#each a.sharedIps || [] as ip}
                          <span class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">{ip}</span>
                        {/each}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        {#if result.exists !== false}
          <section class="space-y-3">
            <h2 class="text-xl font-semibold">Recent logs</h2>
            {#if loadingWhois}
              <div class="space-y-2">
                {#each Array(6) as _}
                  <div class="h-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                {/each}
              </div>
            {:else}
              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 text-left dark:border-gray-700">
                      <th class="py-2 pr-3">Datetime</th>
                      <th class="py-2 pr-3">Name</th>
                      <th class="py-2 pr-3">IP</th>
                      <th class="py-2 pr-3">Server</th>
                      <th class="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each shown(result.logs, showAllLogs, logsLimit) as row}
                      <tr class="border-b border-gray-100 dark:border-gray-800">
                        <td class="py-2 pr-3">{formatDateTimeStamp(row.timestamp, row)}</td>
                        <td class="py-2 pr-3">{row.name}</td>
                        <td class="py-2 pr-3">{row.ip}</td>
                        <td class="py-2 pr-3">{row.server_name}</td>
                        <td class="py-2 pr-3">{row.action}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              {#if (result.logs?.length || 0) > logsLimit}
                <button onclick={() => (showAllLogs = !showAllLogs)} class="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  {showAllLogs ? 'Show less' : 'Show all'} ({result.logs?.length})
                </button>
              {/if}
            {/if}
          </section>
        {/if}
      {:else if result.type === 'ip'}
        <section class="space-y-3">
          <h2 class="text-xl font-semibold">IP overview</h2>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
              <div class="text-sm text-gray-500">IP</div>
              <div class="font-mono">{result.ip}</div>
            </div>
            <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
              <div class="text-sm text-gray-500">First seen</div>
              <div>{formatDate(result.summary?.firstSeen?.date)}</div>
            </div>
            <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
              <div class="text-sm text-gray-500">Last seen</div>
              <div>{formatDate(result.summary?.lastSeen?.date)}</div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-semibold">Accounts on this IP</h2>
          {#if loadingWhois}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {#each Array(6) as _}
                <div class="h-20 animate-pulse rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"></div>
              {/each}
            </div>
          {:else if (result.accounts || []).length === 0}
            <div class="text-sm text-gray-500">No accounts found for this IP.</div>
          {:else}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {#each result.accounts as acc}
                <div class="flex items-center gap-3 rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  {#if loadingProfiles}
                    <div class="h-12 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                  {:else if profileFor(acc.steamid64)?.avatarfull}
                    <img class="h-12 w-12 rounded" src={profileFor(acc.steamid64)?.avatarfull} alt="avatar" />
                  {:else}
                    <div class="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700"></div>
                  {/if}
                  <div class="min-w-0 flex-1">
                    {#if loadingProfiles}
                      <div class="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    {:else}
                      <a class="font-medium text-blue-600 hover:underline dark:text-blue-400" href={steamProfileUrl(acc.steamid64)} target="_blank" rel="noreferrer"
                        >{profileFor(acc.steamid64)?.personaname || acc.steamid64 || acc.steam_id_raw}</a>
                    {/if}
                    <div class="font-mono truncate text-xs text-gray-500">{acc.steamid64 || acc.steam_id_raw}</div>
                    {#if acc.elo}
                      <div class="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">{formatElo(acc.elo)}</div>
                    {/if}
                    <div class="mt-1 grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300">
                      <div>
                        <div class="text-[11px] text-gray-500">First seen here</div>
                        <div>{formatDate(acc.firstSeen?.date)}</div>
                      </div>
                      <div>
                        <div class="text-[11px] text-gray-500">Last seen here</div>
                        <div>{formatDate(acc.lastSeen?.date)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {/if}
  </div>
</div>
