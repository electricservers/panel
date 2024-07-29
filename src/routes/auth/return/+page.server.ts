import { steam } from '$lib/steam/steam';
import type { PageServerLoadEvent } from './$types';
import { steamProfile } from "$lib/stores/steamStore";
import { json } from '@sveltejs/kit';


export const load = async ({ request, cookies }: PageServerLoadEvent) => {
    try {
        const user = await steam.authenticate(request);
        cookies.set('client', JSON.stringify(user._json), {path: '/'})
        return {user: user._json}; // +page.svelte acts as a redirect
    } catch (error) {
        console.error(error);
    }
}
