<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  let { data, children } = $props<{ data: { user: { steamid: string } }; children?: import('svelte').Snippet }>();
</script>

<div class="mx-auto max-w-4xl p-4 sm:p-6">
  <Title>Admin</Title>
  {@render children?.()}
  <div class="mt-10 text-sm text-gray-500">Signed in as {data.user.steamid}</div>
  <div class="h-8"></div>
</div>
