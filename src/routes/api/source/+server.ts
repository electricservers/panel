import { json, type RequestHandler } from '@sveltejs/kit';
import { listSources } from '$lib/server/sources/registry';
import { SOURCE_COOKIE, SOURCE_COOKIE_OPTIONS } from '$lib/server/sources/resolve-source';

/** Sets the global MGE source cookie. The switcher POSTs here, then invalidateAll. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const form = await request.formData();
	const id = String(form.get('source') ?? '').trim();
	const enabled = listSources({ capability: 'mgemod', enabled: true });
	if (!enabled.some((source) => source.id === id)) {
		return json({ message: 'Unknown source.' }, { status: 400 });
	}
	cookies.set(SOURCE_COOKIE, id, SOURCE_COOKIE_OPTIONS);
	return new Response(null, { status: 204 });
};
