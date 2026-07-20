import { requireRole } from '$lib/server/require-role';
import type { LayoutServerLoad } from './$types';

/** Owner-only, per docs/modules/auth.md's permission table — admin does not get this UI. */
export const load: LayoutServerLoad = ({ locals }) => {
	requireRole(locals, ['owner']);
	return {};
};
