import type { PageServerLoad } from './$types';

export const load = (async ({cookies}) => {
    cookies.delete('client', {path: '/'});
    return { loggedOut: true };
}) satisfies PageServerLoad;