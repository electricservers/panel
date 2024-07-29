<script lang="ts" >
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
    import type { PageData } from "./$types";
    import { steamProfile } from "$lib/stores/steamStore";
	export let data: PageData;
    
    onMount(() => {
		if (data) {
			const profile = JSON.stringify(data.user);
			steamProfile.set(JSON.parse(profile));
            console.log('AAAAAAAAAAAAA')
            console.log($steamProfile)
		}
        goto("/");
    })
</script>