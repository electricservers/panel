import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role';
import { getSiteSettings, updateSiteSettings } from '$lib/server/db/settings';
import { listModuleToggles, setModuleEnabled } from '$lib/server/db/module-toggles';
import { KNOWN_CAPABILITIES, type Capability } from '$lib/server/sources/types';
import type { PageServerLoad } from './$types';

const MAX_FAVICON_BYTES = 256 * 1024;
const ALLOWED_FAVICON_MIME_TYPES = [
	'image/x-icon',
	'image/png',
	'image/svg+xml',
	'image/vnd.microsoft.icon'
];

export const load: PageServerLoad = () => {
	const settings = getSiteSettings();
	return {
		siteName: settings.siteName,
		siteDescription: settings.siteDescription,
		hasFavicon: settings.faviconData !== null,
		moduleToggles: listModuleToggles()
	};
};

export const actions = {
	updateBranding: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const siteName = String(form.get('siteName') ?? '').trim();
		const siteDescription = String(form.get('siteDescription') ?? '').trim();

		if (!siteName) {
			return fail(400, { message: 'Site name is required.' });
		}

		updateSiteSettings({ siteName, siteDescription: siteDescription || null });
		return { success: true };
	},

	uploadFavicon: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const file = form.get('favicon');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choose a favicon file.' });
		}
		if (file.size > MAX_FAVICON_BYTES) {
			return fail(400, { message: 'Favicon must be under 256KB.' });
		}
		if (!ALLOWED_FAVICON_MIME_TYPES.includes(file.type)) {
			return fail(400, { message: 'Favicon must be .ico, .png, or .svg.' });
		}

		const faviconData = Buffer.from(await file.arrayBuffer());
		updateSiteSettings({ faviconData, faviconMimeType: file.type });
		return { success: true };
	},

	removeFavicon: async ({ locals }) => {
		requireRole(locals, ['owner']);
		updateSiteSettings({ faviconData: null, faviconMimeType: null });
		return { success: true };
	},

	updateModuleToggle: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const capability = String(form.get('capability') ?? '') as Capability;
		const enabled = form.getAll('enabled').includes('on');

		if (!KNOWN_CAPABILITIES.includes(capability)) {
			return fail(400, { message: 'Unknown module.' });
		}

		setModuleEnabled(capability, enabled);
		return { success: true };
	}
};
