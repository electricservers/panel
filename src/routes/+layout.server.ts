import type { LayoutServerLoad } from './$types';
import { listSources } from '$lib/server/sources/registry';
import { getSiteSettings } from '$lib/server/db/settings';
import { listModuleToggles } from '$lib/server/db/module-toggles';

export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = getSiteSettings();
	return {
		user: locals.user,
		sources: listSources({ enabled: true }),
		moduleToggles: listModuleToggles(),
		settings: {
			siteName: settings.siteName,
			siteDescription: settings.siteDescription,
			hasFavicon: settings.faviconData !== null,
			faviconUpdatedAt: settings.updatedAt.getTime()
		}
	};
};
