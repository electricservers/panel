<script lang="ts">
  import { goto } from '$app/navigation';
  const sections = [{ href: '/admin/users', name: 'Manage users' }];
  function open(href: string) {
    goto(href);
  }
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  {#each sections as s}
    <button class="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700" onclick={() => open(s.href)}>
      <div class="font-medium">{s.name}</div>
      <div class="text-sm text-gray-500">{s.href}</div>
    </button>
  {/each}
  <div class="rounded-lg border border-dashed border-gray-200 p-4 text-gray-400 dark:border-gray-700">Site configuration (coming soon)</div>
  <div class="rounded-lg border border-dashed border-gray-200 p-4 text-gray-400 dark:border-gray-700">Modules toggle (MGE/Whois) (coming soon)</div>
</div>
