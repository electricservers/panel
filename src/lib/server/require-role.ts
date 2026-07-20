import { error } from '@sveltejs/kit';
import type { PanelRole, SessionUser } from '$lib/server/session';

/**
 * Throws a SvelteKit 403 unless `locals.user` has one of `roles`. Use in
 * every staff `load`/`action` so server enforcement can never drift from
 * what the sidebar shows (see docs/modules/auth.md).
 */
export function requireRole(
	locals: { user: SessionUser | null },
	roles: readonly PanelRole[]
): SessionUser {
	const { user } = locals;
	if (!user || !roles.includes(user.role)) {
		error(403, 'Staff access required.');
	}
	return user;
}
