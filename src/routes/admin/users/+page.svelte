<script lang="ts">
  import type { PageData } from './$types';
  import Title from '$lib/components/Title.svelte';
  let { data } = $props<{ data: PageData }>();

  let users = $state(data.users || [] as { steamId: string; role: string }[]);
  let steamIdInput = $state('');
  let roleInput = $state<'owner' | 'admin' | 'user'>('user');
  let busy = $state(false);
  let errorMsg: string | null = $state(null);

  async function refresh() {
    const r = await fetch('/api/admin/users');
    const j = await r.json();
    if (r.ok) users = j.users;
  }

  async function upsert() {
    errorMsg = null;
    busy = true;
    try {
      const r = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ steamId: steamIdInput.trim(), role: roleInput }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Request failed');
      steamIdInput = '';
      await refresh();
    } catch (e: any) {
      errorMsg = e?.message || 'Failed';
    } finally {
      busy = false;
    }
  }

  async function remove(steamId: string) {
    if (!confirm(`Remove explicit role for ${steamId}?`)) return;
    busy = true;
    try {
      const r = await fetch(`/api/admin/users?steamId=${encodeURIComponent(steamId)}`, { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Request failed');
      await refresh();
    } catch (e) {
      // ignore
    } finally {
      busy = false;
    }
  }
</script>

<Title>Manage users</Title>

<div class="mt-4 grid gap-4">
  <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div class="md:col-span-3">
        <label class="block text-sm font-medium mb-1" for="steamid">SteamID64</label>
        <input id="steamid" class="w-full rounded border-gray-300 dark:bg-gray-800 dark:border-gray-700" bind:value={steamIdInput} placeholder="7656119xxxxxxxxxx" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="role">Role</label>
        <select id="role" class="w-full rounded border-gray-300 dark:bg-gray-800 dark:border-gray-700" bind:value={roleInput}>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
      </div>
      <div>
        <button class="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-50" disabled={busy} onclick={upsert}>Save</button>
      </div>
    </div>
    {#if errorMsg}
      <div class="text-sm text-red-600 mt-2">{errorMsg}</div>
    {/if}
  </div>

  <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <div class="text-sm font-medium mb-2">Explicit role assignments</div>
    {#if users?.length}
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-gray-500">
            <tr>
              <th class="py-2 pr-4">SteamID64</th>
              <th class="py-2 pr-4">Role</th>
              <th class="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each users as u}
              <tr class="border-t border-gray-200 dark:border-gray-700">
                <td class="py-2 pr-4 font-mono">{u.steamId}</td>
                <td class="py-2 pr-4">{u.role}</td>
                <td class="py-2 pr-4">
                  <button class="px-2 py-1 rounded bg-red-600 text-white" disabled={busy} onclick={() => remove(u.steamId)}>Remove</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="text-gray-500">No assignments yet</div>
    {/if}
  </div>
</div>


