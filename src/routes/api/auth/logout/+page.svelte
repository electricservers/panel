<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { steamStore } from '$lib/stores/steamStore';

    export let data;

    onMount(() => {
        if (data.loggedOut) {
            steamStore.set(null);
        }
        goto('/');
    });
</script>

You will be redirected...