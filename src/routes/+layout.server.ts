import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
    const userJson = cookies.get('client');
    return {
        user: userJson ? JSON.parse(userJson) : null
    };
};
