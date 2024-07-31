<script lang="ts">
    import type { PageData } from './$types';
    import { steamStore } from '$lib/stores/steamStore';
    import Title from '$lib/components/Title.svelte';

    export let data: PageData;
</script>

<div class="h-[90vh]">
<Title>Hola!</Title>
</div>