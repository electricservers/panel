<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { steamStore } from '$lib/stores/steamStore';
  import { goto } from '$app/navigation';
  let steamInput = '';

  // Parse Steam profile URLs or IDs and navigate to the MGE stats page
  function extractSteamId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // If it's a pure 17-digit ID
    const idMatch = trimmed.match(/\b(7656\d{13})\b/);
    if (idMatch) return idMatch[1];

    // Handle full profile URL patterns
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      // Supported: /profiles/7656... or /id/<custom> (custom requires resolver later)
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'profiles' && parts[1]) {
        const maybe = parts[1].match(/^7656\d{13}$/) ? parts[1] : null;
        if (maybe) return maybe;
      }
      // TODO: Support vanity URLs (/id/<name>) by resolving via Steam Web API
    } catch {
      // Not a URL; fall through
    }

    // Accept raw Steam2/Steam3 formats later via conversion (TODO)
    return null;
  }

  async function goToProfile() {
    const steamid = extractSteamId(steamInput);
    if (steamid) {
      await goto(`/mge/games/${steamid}`);
    } else {
      // TODO: show user feedback (toast) for invalid input
    }
  }
</script>

<section class="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white">
  <div class="relative z-10 max-w-3xl">
    <h1 class="text-3xl font-extrabold tracking-tight md:text-4xl">Your TF2 MGE stats, at a glance</h1>
    <p class="mt-2 text-slate-300">Browse your matches, arenas and rivals across regions. Placeholders shown until data is wired.</p>

    <div class="mt-6 flex flex-wrap gap-3">
      <a href="/api/auth/login">
        <Button color="blue">Sign in with Steam</Button>
      </a>
      {#if $steamStore}
        <a href={`/mge/games/${$steamStore.steamid}`}>
          <Button>View my profile</Button>
        </a>
      {/if}
    </div>

    <div class="mt-4 flex max-w-lg gap-2">
      <input class="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder-slate-500 focus:outline-none" placeholder="Paste Steam profile URL or 17-digit SteamID64" bind:value={steamInput} on:keydown={(e) => { if (e.key === 'Enter') goToProfile(); }} />
      <Button color="light" on:click={goToProfile}>Go</Button>
    </div>
  </div>
  <div class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"></div>
</section>


