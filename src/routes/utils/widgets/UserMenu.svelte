<script lang="ts">
  import { Avatar, Dropdown, DropdownHeader, DropdownItem } from 'flowbite-svelte';
  import { steamStore } from '$lib/stores/steamStore';
  import { goto } from '$app/navigation';
</script>

<button class="ms-3 rounded-full ring-gray-400 focus:ring-4 dark:ring-gray-600">
  <Avatar size="sm" src={$steamStore?.avatar} tabindex={0} />
</button>
<Dropdown placement="bottom-end">
  <DropdownItem on:click={() => goto('/api/auth/logout')}>Logout</DropdownItem>
</Dropdown>
