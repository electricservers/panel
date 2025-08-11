<script lang="ts">
  import { goto } from '$app/navigation';
  const sections = [
    { href: '/admin/users', name: 'Manage users' }
  ];
  function open(href: string) { goto(href); }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  {#each sections as s}
    <button class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-700" onclick={() => open(s.href)}>
      <div class="font-medium">{s.name}</div>
      <div class="text-sm text-gray-500">{s.href}</div>
    </button>
  {/each}
  <div class="p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
    Site configuration (coming soon)
  </div>
  <div class="p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
    Modules toggle (MGE/Whois) (coming soon)
  </div>
</div>


