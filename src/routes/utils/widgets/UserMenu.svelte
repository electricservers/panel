<script lang="ts">
    import { imagesPath } from '../../utils/variables';
    import {
        Avatar,
        Dropdown,
        DropdownHeader,
        DropdownItem
    } from 'flowbite-svelte';

    export let name: string = ''; // "Neil Sims",
    export let avatar: string = ''; // "neil-sims.png",
</script>

<button class="ms-3 rounded-full ring-gray-400 focus:ring-4 dark:ring-gray-600">
    <Avatar size="sm" src={imagesPath(avatar, 'users')} tabindex="0" />
</button>
<Dropdown placement="bottom-end">
    <DropdownHeader>
        <span class="block text-sm">{name}</span>
    </DropdownHeader>
    <DropdownItem>Sign out</DropdownItem>
</Dropdown>
