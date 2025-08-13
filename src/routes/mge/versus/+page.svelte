<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import { Button } from 'flowbite-svelte';
  import { goto } from '$app/navigation';

  let inputA = '';
  let inputB = '';

  function extractId64(value: string): string | null {
    const v = value.trim();
    if (!v) return null;
    const idMatch = v.match(/\b(7656\d{13})\b/);
    if (idMatch) return idMatch[1];
    try {
      const url = new URL(v.startsWith('http') ? v : `https://${v}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'profiles' && parts[1] && /^7656\d{13}$/.test(parts[1])) return parts[1];
    } catch {}
    return null;
  }

  function canonicalPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  async function go() {
    const a = extractId64(inputA);
    const b = extractId64(inputB);
    if (!a || !b) return;
    const [x, y] = canonicalPair(a, b);
    await goto(`/mge/players/${x}/versus/${y}`);
  }
</script>

<div class="p-4">
  <Title>Versus</Title>
  <div class="mt-4 max-w-2xl">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <input
          class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          placeholder="Player A: Steam profile URL or 17-digit SteamID64"
          bind:value={inputA}
          on:keydown={(e) => { if (e.key === 'Enter') go(); }} />
        <div class="hidden items-center justify-center text-sm text-gray-500 md:flex">vs</div>
        <input
          class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          placeholder="Player B: Steam profile URL or 17-digit SteamID64"
          bind:value={inputB}
          on:keydown={(e) => { if (e.key === 'Enter') go(); }} />
        <div class="md:col-span-3 flex justify-end">
          <Button color="light" on:click={go}>Compare</Button>
        </div>
      </div>
    </div>
  </div>
</div>


