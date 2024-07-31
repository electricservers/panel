<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { steamStore } from '$lib/stores/steamStore';
    import type { SteamProfile } from '$lib/steam/config';

    export let data: { user?: string };

    onMount(() => {
        if (data.user) {
            try {
                const profile: SteamProfile = JSON.parse(data.user);
                steamStore.set(profile);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
        goto('/');
    });
</script>

{#if data.user}
    Login successful. Redirecting...
{:else}
    Processing login...
{/if}
