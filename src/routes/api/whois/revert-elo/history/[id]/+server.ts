import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { EloReversion } from '$lib/models/eloReversion';
import mongoose from 'mongoose';

// GET /api/whois/revert-elo/history/:id
export const GET: RequestHandler = async ({ params, locals }) => {
  const user = locals.user as { role?: string } | null;
  if (!user || user.role !== 'owner') return json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;
  if (!id || !mongoose.isValidObjectId(id)) return json({ error: 'Invalid id' }, { status: 400 });

  const doc = await EloReversion.findById(id).lean();
  if (!doc) return json({ error: 'Not found' }, { status: 404 });
  return json(doc);
};



