<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import Card from '../../../routes/utils/widgets/Card.svelte';
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
      await goto(`/mge/players/${steamid}`);
    } else {
      // TODO: show user feedback (toast) for invalid input
    }
  }
</script>

<Card title="Find a profile" class="w-full !max-w-none">
  <div>
    <div class="mt-3 flex max-w-lg gap-2">
      <input
        class="w-full rounded-md border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Paste Steam profile URL or 17-digit SteamID64"
        bind:value={steamInput}
        on:keydown={(e) => {
          if (e.key === 'Enter') goToProfile();
        }} />
      <Button color="light" size="sm" on:click={goToProfile}>Go</Button>
    </div>
  </div>
</Card>
