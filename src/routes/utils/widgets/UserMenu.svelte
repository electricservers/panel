<script lang="ts">
    import { imagesPath } from '../../utils/variables';
    import {
        Avatar,
        Dropdown,
        DropdownHeader,
        DropdownItem
    } from 'flowbite-svelte';
    import { steamProfile } from "$lib/stores/steamStore";
</script>

<button class="ms-3 rounded-full ring-gray-400 focus:ring-4 dark:ring-gray-600">
    <Avatar size="sm" src={$steamProfile.avatar} tabindex="0" />
</button>
<Dropdown placement="bottom-end">
    <DropdownHeader>
        <span class="block text-sm">{$steamProfile.personaname}</span>
    </DropdownHeader>
    <DropdownItem>Sign out</DropdownItem>
</Dropdown>
