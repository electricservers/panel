import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { User } from '$lib/models/user';

// GET /api/admin/users -> list users with explicit roles
export const GET: RequestHandler = async (event) => {
  const user = event.locals.user as { role?: string } | null;
  if (!user || user.role !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await User.find({ role: { $exists: true } }).lean();
  return json({ users: users.map(({ steamId, role }) => ({ steamId, role })) });
};

// POST /api/admin/users -> upsert a role assignment
// Body: { steamId: string, role: 'owner' | 'admin' | 'user' }
export const POST: RequestHandler = async (event) => {
  const actingUser = event.locals.user as { role?: string } | null;
  if (!actingUser || actingUser.role !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await event.request.json().catch(() => null)) as { steamId?: string; role?: string } | null;
  const steamId = (body?.steamId || '').trim();
  const role = (body?.role || '').trim();

  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return json({ error: 'Invalid steamId' }, { status: 400 });
  }
  if (!role || !['owner', 'admin', 'user'].includes(role)) {
    return json({ error: 'Invalid role' }, { status: 400 });
  }

  await User.findOneAndUpdate({ steamId }, { $set: { steamId, role } }, { upsert: true, new: true });

  return json({ ok: true });
};

// DELETE /api/admin/users?steamId=...
// Removes explicit role record (falls back to default 'user' on login)
export const DELETE: RequestHandler = async (event) => {
  const actingUser = event.locals.user as { role?: string } | null;
  if (!actingUser || actingUser.role !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const steamId = (event.url.searchParams.get('steamId') || '').trim();
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return json({ error: 'Invalid steamId' }, { status: 400 });
  }

  await User.deleteOne({ steamId });
  return json({ ok: true });
};
