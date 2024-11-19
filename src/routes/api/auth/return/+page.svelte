<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { steamStore } from '$lib/stores/steamStore';
  import type { SteamProfile } from '$lib/steam/config';

  interface Props {
    data: { user?: string; error?: string };
  }

  let { data }: Props = $props();

  onMount(() => {
    if (data.user) {
      try {
        const profile: SteamProfile & { role: string } = JSON.parse(data.user);
        steamStore.set(profile);
        goto('/');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else if (data.error) {
      console.error('Authentication error:', data.error);
    }
  });
</script>

{#if data.user}
  Login successful. Redirecting...
{:else}
  Processing login...
{/if}
