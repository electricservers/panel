import type { Actions, PageServerLoad } from './$types';
import { redirect, error, fail } from '@sveltejs/kit';
import prismaArg from '$lib/prisma/prismaArg';
import { toSteam64FromAny, allIdVariantsForSteam64 } from '$lib/whois/utils';

type AltLink = {
  steam_id: string;
  main_steam_id: string | null;
  linked_at: Date;
  linked_by: string | null;
};

function isValidSteam64(id: string | null | undefined): id is string {
  return !!id && /^\d{17}$/.test(id);
}

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user as { steamid: string; role?: string } | null;

  if (!user) throw redirect(302, '/');
  if (user.role !== 'owner') throw error(403, 'Forbidden');

  // Fetch all rows and normalize to 64-bit IDs for grouping/display
  const rows = (await prismaArg.whois_alt_links.findMany()) as unknown as AltLink[];

  const normalized = rows
    .map((r) => {
      const main64 = r.main_steam_id ? toSteam64FromAny(r.main_steam_id) : null;
      const alt64 = toSteam64FromAny(r.steam_id);
      return {
        steam_id_64: alt64,
        main_steam_id_64: main64,
        linked_at: r.linked_at,
        linked_by: r.linked_by || null
      };
    })
    .filter((r) => !!r.steam_id_64) as Array<{
      steam_id_64: string;
      main_steam_id_64: string | null;
      linked_at: Date;
      linked_by: string | null;
    }>;

  const mainsSet = new Set<string>();
  for (const r of normalized) {
    if (r.main_steam_id_64 && isValidSteam64(r.main_steam_id_64)) mainsSet.add(r.main_steam_id_64);
  }
  const altIds = new Set(normalized.filter((r) => r.main_steam_id_64).map((r) => r.steam_id_64));
  for (const r of normalized) {
    if (!altIds.has(r.steam_id_64) && isValidSteam64(r.steam_id_64)) mainsSet.add(r.steam_id_64);
  }

  const mains = Array.from(mainsSet);
  const groups = mains.map((main) => ({
    main,
    alts: normalized.filter((r) => r.main_steam_id_64 === main).map((r) => r.steam_id_64)
  }));

  // also return ungrouped: mains with no explicit alts
  return { user, groups };
};

export const actions: Actions = {
  add_main: async ({ request, locals }) => {
    const user = locals.user as { steamid: string; role?: string } | null;
    if (!user || user.role !== 'owner') return fail(403, { message: 'Forbidden' });
    const form = await request.formData();
    const mainIn = String(form.get('main') || '').trim();
    const main = toSteam64FromAny(mainIn);
    if (!main) return fail(400, { message: 'Invalid Steam ID' });

    // Ensure a row exists for the main itself (self-main is represented by absence in table; no-op)
    // We do nothing here except ensure the main is present as a standalone group when loading.
    return { ok: true };
  },

  add_alt: async ({ request, locals }) => {
    const user = locals.user as { steamid: string; role?: string } | null;
    if (!user || user.role !== 'owner') return fail(403, { message: 'Forbidden' });
    const form = await request.formData();
    const mainIn = String(form.get('main') || '').trim();
    const altIn = String(form.get('alt') || '').trim();
    const main = toSteam64FromAny(mainIn);
    const alt = toSteam64FromAny(altIn);
    if (!main || !alt) return fail(400, { message: 'Invalid Steam ID' });
    if (main === alt) return fail(400, { message: 'Alt cannot equal main' });

    await prismaArg.whois_alt_links.upsert({
      where: { steam_id: alt },
      update: { main_steam_id: main, linked_by: user.steamid },
      create: { steam_id: alt, main_steam_id: main, linked_by: user.steamid }
    });
    return { ok: true };
  },

  edit_alt: async ({ request, locals }) => {
    const user = locals.user as { steamid: string; role?: string } | null;
    if (!user || user.role !== 'owner') return fail(403, { message: 'Forbidden' });
    const form = await request.formData();
    const altIn = String(form.get('alt') || '').trim();
    const mainIn = String(form.get('main') || '').trim();
    const alt = toSteam64FromAny(altIn);
    const main = toSteam64FromAny(mainIn);
    if (!alt || !main) return fail(400, { message: 'Invalid Steam ID' });
    await prismaArg.whois_alt_links.update({
      where: { steam_id: alt },
      data: { main_steam_id: main, linked_by: user.steamid }
    });
    return { ok: true };
  },

  delete_alt: async ({ request, locals }) => {
    const user = locals.user as { steamid: string; role?: string } | null;
    if (!user || user.role !== 'owner') return fail(403, { message: 'Forbidden' });
    const form = await request.formData();
    const altIn = String(form.get('alt') || '').trim();
    const alt64 = toSteam64FromAny(altIn);
    if (!alt64) return fail(400, { message: 'Invalid Steam ID' });
    const variants = allIdVariantsForSteam64(alt64);
    await prismaArg.whois_alt_links.deleteMany({ where: { steam_id: { in: variants } } });
    return { ok: true };
  }
};


