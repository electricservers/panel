import prismaArg from '$lib/prisma/prismaArg';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allIdVariantsForSteam64, normalizeSubject, toSteam64FromAny, getEloForSteamIds } from '$lib/whois/utils';
import { resolveVanityTo64 } from '$lib/steam/resolve';

export const GET: RequestHandler = async (event) => {
  const user = event.locals.user as { role?: string } | null;
  if (!user || user.role !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const query = event.url.searchParams;
  const inputRaw = (query.get('q') || query.get('steamid') || query.get('ip') || '').trim();
  let input = inputRaw;
  // Support https://steamcommunity.com/id/vanity and plain vanity
  if (/^https?:\/\/steamcommunity\.com\/id\//i.test(inputRaw) || /^[\w.-]{2,64}$/i.test(inputRaw)) {
    const resolved = await resolveVanityTo64(inputRaw, fetch);
    if (resolved) input = resolved;
  }
  const from = query.get('from');
  const to = query.get('to');
  const limit = Math.min(parseInt(query.get('limit') || '200', 10) || 200, 1000);

  if (!input) {
    return json({ error: 'Missing query' }, { status: 400 });
  }

  const normalized = normalizeSubject(input);
  if (!normalized) {
    return json({ error: 'Invalid query' }, { status: 400 });
  }

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  if (normalized.type === 'steam') {
    const variants = allIdVariantsForSteam64(normalized.value);
    // Fast path: check if there are any sessions first
    const totalSessions = await prismaArg.whois_logs.count({ where: { steam_id: { in: variants } } });
    if (totalSessions === 0) {
      // Still fetch ELO data even if no whois logs exist
      const eloData = await getEloForSteamIds([normalized.value]);
      return json(
        {
          type: 'steam',
          steamid: normalized.value,
          exists: false,
          elo: eloData[normalized.value] || { ar: null, br: null },
          summary: {
            firstSeen: null,
            lastSeen: null,
            totalSessions: 0,
            distinctIPs: [],
            distinctServers: []
          },
          names: { permanent: null, known: [] },
          logs: []
        },
        { headers: { 'cache-control': 'no-store' } }
      );
    }

    const logs = await prismaArg.whois_logs.findMany({
      where: {
        steam_id: { in: variants },
        ...(from || to ? { date: dateFilter } : {})
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take: limit
    });

    const distinctIps = await prismaArg.whois_logs.findMany({
      where: { steam_id: { in: variants } },
      distinct: ['ip'],
      select: { ip: true }
    });

    const distinctServers = await prismaArg.whois_logs.findMany({
      where: { steam_id: { in: variants } },
      distinct: ['server_ip'],
      select: { server_ip: true, server_name: true }
    });

    // Build known names sorted by most recently used
    const nameLogs = await prismaArg.whois_logs.findMany({
      where: { steam_id: { in: variants } },
      select: { name: true, date: true, time: true },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take: 5000
    });
    const seen = new Set<string>();
    const knownNames: string[] = [];
    for (const row of nameLogs) {
      const n = (row.name ?? '').trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      knownNames.push(n);
    }
    const permName = await prismaArg.whois_permname.findFirst({ where: { steam_id: { in: variants } } });

    const firstLast = await prismaArg.whois_logs.findMany({
      where: { steam_id: { in: variants } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 1
    });
    const lastSeen = logs[0];

    // Remove permaname from known list if present
    const permanentName = (permName?.name ?? '').trim();
    const knownFiltered = permanentName ? knownNames.filter((n) => (n ?? '').trim().toLowerCase() !== permanentName.toLowerCase()) : knownNames;

    // Fetch ELO data for the main steamid
    const eloData = await getEloForSteamIds([normalized.value]);

    return json(
      {
        type: 'steam',
        steamid: normalized.value,
        exists: true,
        elo: eloData[normalized.value] || { ar: null, br: null },
        summary: {
          firstSeen: firstLast[0] || null,
          lastSeen,
          totalSessions,
          distinctIPs: distinctIps.map((r) => r.ip).filter(Boolean),
          distinctServers: distinctServers.map((r) => ({ ip: r.server_ip, name: r.server_name }))
        },
        names: {
          permanent: permanentName || null,
          known: knownFiltered
        },
        logs
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  }

  // IP mode
  const logsByIp = await prismaArg.whois_logs.findMany({
    where: {
      ip: normalized.value,
      ...(from || to ? { date: dateFilter } : {})
    },
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
    take: limit
  });

  const distinctAccounts = await prismaArg.whois_logs.findMany({
    where: { ip: normalized.value },
    distinct: ['steam_id'],
    select: { steam_id: true }
  });

  // Aggregate account-level info for this IP
  const accounts = await Promise.all(
    distinctAccounts.map(async (row) => {
      const steam_id_raw = row.steam_id as string | null;
      if (!steam_id_raw) return null;
      const first = await prismaArg.whois_logs.findFirst({ where: { ip: normalized.value, steam_id: steam_id_raw }, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
      const last = await prismaArg.whois_logs.findFirst({ where: { ip: normalized.value, steam_id: steam_id_raw }, orderBy: [{ date: 'desc' }, { time: 'desc' }] });
      const sessionsOnIp = await prismaArg.whois_logs.count({ where: { ip: normalized.value, steam_id: steam_id_raw } });
      const steamid64 = toSteam64FromAny(steam_id_raw);
      return { steam_id_raw, steamid64, firstSeen: first || null, lastSeen: last || null, sessionsOnIp };
    })
  ).then((arr) => arr.filter(Boolean));

  // Fetch ELO data for all accounts on this IP
  const accountSteamIds = accounts.map(acc => acc?.steamid64).filter(Boolean) as string[];
  const accountEloData = await getEloForSteamIds(accountSteamIds);

  return json(
    {
      type: 'ip',
      ip: normalized.value,
      summary: {
        firstSeen: logsByIp[logsByIp.length - 1] || null,
        lastSeen: logsByIp[0] || null,
        totalSessions: await prismaArg.whois_logs.count({ where: { ip: normalized.value } }),
        distinctAccounts: distinctAccounts.map((r) => r.steam_id).filter(Boolean)
      },
      accounts: accounts.map(acc => ({
        ...acc,
        elo: acc?.steamid64 ? accountEloData[acc.steamid64] || { ar: null, br: null } : { ar: null, br: null }
      })),
      logs: logsByIp
    },
    { headers: { 'cache-control': 'no-store' } }
  );
};
