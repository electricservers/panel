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
  // Resolve permanames for mains in a single query using all ID variants
  const mainToVariantsMap = new Map<string, string[]>();
  const allVariantIds = new Set<string>();
  for (const m of mains) {
    const variants = allIdVariantsForSteam64(m);
    mainToVariantsMap.set(m, variants);
    for (const v of variants) allVariantIds.add(v);
  }
  const permRows = await prismaArg.whois_permname.findMany({ where: { steam_id: { in: Array.from(allVariantIds) } } });
  const variantToPermName: Record<string, string> = {};
  for (const row of permRows) {
    const n = (row.name ?? '').trim();
    if (!n) continue;
    variantToPermName[row.steam_id] = n;
  }

  const groups = mains.map((main) => {
    const variants = mainToVariantsMap.get(main) || [];
    const permName = variants.map((v) => variantToPermName[v]).find((x) => !!x) || null;
    return {
      main,
      permName,
      alts: normalized.filter((r) => r.main_steam_id_64 === main).map((r) => r.steam_id_64)
    };
  });

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

    // Validate that this main has a permaname association; if missing, ask UI to prompt creation
    const variants = allIdVariantsForSteam64(main);
    const existingPerm = await prismaArg.whois_permname.findFirst({ where: { steam_id: { in: variants } } });
    if (!existingPerm) {
      return fail(404, { code: 'PERMNAME_NOT_FOUND', steamid: main, message: 'Permanent name not found for this Steam ID' });
    }

    // Ensure a placeholder row exists so the main appears as its own group when it has no alts
    await prismaArg.whois_alt_links.upsert({
      where: { steam_id: main },
      update: {},
      create: { steam_id: main, main_steam_id: null, linked_by: user.steamid }
    });

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

    // Prevent linking an account as alt if it is already a main for other alts
    const altVariants = allIdVariantsForSteam64(alt);
    const existingAsMain = await prismaArg.whois_alt_links.findFirst({ where: { main_steam_id: { in: altVariants } } });
    if (existingAsMain) {
      return fail(400, { code: 'ALT_IS_MAIN', message: 'This account is already marked as a main in the link system' });
    }

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

  create_permname: async ({ request, locals }) => {
    const user = locals.user as { steamid: string; role?: string } | null;
    if (!user || user.role !== 'owner') return fail(403, { message: 'Forbidden' });
    const form = await request.formData();
    const steamIn = String(form.get('steamid') || '').trim();
    const nameIn = String(form.get('name') || '').trim();
    const steam64 = toSteam64FromAny(steamIn);
    if (!steam64) return fail(400, { message: 'Invalid Steam ID' });

    await prismaArg.whois_permname.upsert({
      where: { steam_id: steam64 },
      update: { name: nameIn || null },
      create: { steam_id: steam64, name: nameIn || null }
    });

    // Also ensure the main appears as a group immediately
    await prismaArg.whois_alt_links.upsert({
      where: { steam_id: steam64 },
      update: {},
      create: { steam_id: steam64, main_steam_id: null, linked_by: user.steamid }
    });

    return { ok: true, steamid: steam64 };
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


