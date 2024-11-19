<script>
  import Title from '$lib/components/Title.svelte';
  import { steamStore } from '$lib/stores/steamStore';
</script>

<div class="p-4">
  <Title>Welcome{$steamStore ? ` ${$steamStore.personaname}!` : `! You're not logged in.`}</Title>
</div>
