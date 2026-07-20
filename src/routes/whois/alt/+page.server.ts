import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role';
import { requireModule } from '$lib/server/require-module';
import { fanOut, listSources, sourceHas } from '$lib/server/sources/registry';
import { whoisFor } from '$lib/server/sources/whois';
import type { AltGroup } from '$lib/whois/alt-group';
import type { Source } from '$lib/server/sources/types';
import type { PageServerLoad } from './$types';

async function loadAltGroups(source: Source): Promise<AltGroup[]> {
	const adapter = whoisFor(source.id);
	const links = await adapter.listAltLinks();

	const byMain = new Map<string, AltGroup>();
	for (const link of links) {
		if (!link.mainSteamId) continue;
		const group = byMain.get(link.mainSteamId) ?? {
			sourceId: source.id,
			mainSteamId: link.mainSteamId,
			mainPermName: null,
			alts: []
		};
		group.alts.push({ steamid: link.steamid, linkedAt: link.linkedAt, linkedBy: link.linkedBy });
		byMain.set(link.mainSteamId, group);
	}

	const groups = Array.from(byMain.values());
	const permNames = await Promise.all(
		groups.map((group) => adapter.getPermName(group.mainSteamId))
	);
	groups.forEach((group, i) => {
		group.mainPermName = permNames[i];
	});

	return groups.sort((a, b) =>
		(a.mainPermName ?? a.mainSteamId).localeCompare(b.mainPermName ?? b.mainSteamId)
	);
}

function readAltMutationForm(form: FormData) {
	return {
		sourceId: String(form.get('sourceId') ?? ''),
		steamid: String(form.get('steamid') ?? '').trim(),
		mainSteamId: String(form.get('mainSteamId') ?? '').trim()
	};
}

async function upsertAlt(form: FormData, linkedBy: string) {
	const { sourceId, steamid, mainSteamId } = readAltMutationForm(form);
	if (!sourceId || !sourceHas(sourceId, 'whois')) {
		return fail(400, { message: 'Unknown whois source.' });
	}
	if (!steamid || !mainSteamId) {
		return fail(400, { message: 'Alt and main SteamIDs are required.' });
	}

	try {
		await whoisFor(sourceId).upsertAltLink({ steamid, mainSteamId, linkedBy });
	} catch (err) {
		return fail(400, { message: err instanceof Error ? err.message : 'Failed to link alt.' });
	}
	return { success: true };
}

export const load: PageServerLoad = ({ locals }) => {
	requireModule('whois');
	requireRole(locals, ['admin', 'owner']);

	const sources = listSources({ capability: 'whois', enabled: true });
	return {
		sources,
		altGroups: fanOut(sources, loadAltGroups)
	};
};

export const actions = {
	createPermname: async ({ request, locals }) => {
		requireModule('whois');
		requireRole(locals, ['admin', 'owner']);
		const form = await request.formData();
		const sourceId = String(form.get('sourceId') ?? '');
		const steamid = String(form.get('steamid') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();

		if (!sourceId || !sourceHas(sourceId, 'whois')) {
			return fail(400, { message: 'Unknown whois source.' });
		}
		if (!steamid || !name) {
			return fail(400, { message: 'SteamID and name are required.' });
		}

		try {
			await whoisFor(sourceId).setPermName(steamid, name);
		} catch (err) {
			return fail(400, { message: err instanceof Error ? err.message : 'Failed to set name.' });
		}
		return { success: true };
	},

	addAlt: async ({ request, locals }) => {
		requireModule('whois');
		const user = requireRole(locals, ['admin', 'owner']);
		return upsertAlt(await request.formData(), user.steamId);
	},

	editAlt: async ({ request, locals }) => {
		requireModule('whois');
		const user = requireRole(locals, ['admin', 'owner']);
		return upsertAlt(await request.formData(), user.steamId);
	},

	deleteAlt: async ({ request, locals }) => {
		requireModule('whois');
		requireRole(locals, ['admin', 'owner']);
		const form = await request.formData();
		const sourceId = String(form.get('sourceId') ?? '');
		const steamid = String(form.get('steamid') ?? '').trim();

		if (!sourceId || !sourceHas(sourceId, 'whois')) {
			return fail(400, { message: 'Unknown whois source.' });
		}
		if (!steamid) {
			return fail(400, { message: 'SteamID is required.' });
		}

		try {
			await whoisFor(sourceId).deleteAltLink(steamid);
		} catch (err) {
			return fail(400, {
				message: err instanceof Error ? err.message : 'Failed to delete alt link.'
			});
		}
		return { success: true };
	}
};
