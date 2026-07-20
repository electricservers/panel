import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/require-role';
import { listUsers, setUserRole } from '$lib/server/db/users';
import type { PanelRole } from '$lib/server/session';
import type { PageServerLoad } from './$types';

const ROLES: PanelRole[] = ['user', 'admin', 'owner'];

export const load: PageServerLoad = () => {
	return { users: listUsers() };
};

export const actions = {
	updateRole: async ({ request, locals }) => {
		requireRole(locals, ['owner']);
		const form = await request.formData();
		const steamId = String(form.get('steamId') ?? '').trim();
		const role = String(form.get('role') ?? '') as PanelRole;

		if (!steamId || !ROLES.includes(role)) {
			return fail(400, { message: 'Invalid role change.' });
		}

		const users = listUsers();
		const target = users.find((user) => user.steamId === steamId);
		if (!target) {
			return fail(400, { message: 'Unknown user.' });
		}

		if (target.role === 'owner' && role !== 'owner') {
			const remainingOwners = users.filter(
				(user) => user.role === 'owner' && user.steamId !== steamId
			);
			if (remainingOwners.length === 0) {
				return fail(400, { message: 'Cannot demote the last remaining owner.' });
			}
		}

		setUserRole(steamId, role);
		return { success: true };
	}
};
