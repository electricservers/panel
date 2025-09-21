import prismaArg from '$lib/prisma/prismaArg';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allIdVariantsForSteam64, extractSteamId64, stringSimilarity, toSteam64FromAny, getEloForSteamIds } from '$lib/whois/utils';
import { resolveVanityTo64 } from '$lib/steam/resolve';

export const GET: RequestHandler = async (event) => {
  const user = event.locals.user as { role?: string } | null;
  if (!user || user.role !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const steamidInput = event.url.searchParams.get('steamid') || '';
  let steamid = extractSteamId64(steamidInput);
  if (!steamid && (/^https?:\/\/steamcommunity\.com\/id\//i.test(steamidInput) || /^[\w.-]{2,64}$/i.test(steamidInput))) {
    steamid = await resolveVanityTo64(steamidInput, fetch);
  }
  const days = Math.max(0, Math.min(parseInt(event.url.searchParams.get('days') || '365', 10) || 365, 3650));
  if (!steamid) return json({ error: 'Invalid steamid' }, { status: 400 });

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // IPs used by subject
  const subjectVariants = new Set(allIdVariantsForSteam64(steamid));
  subjectVariants.add(steamid);

  const subjectIpRows = await prismaArg.whois_logs.findMany({
    where: { steam_id: { in: allIdVariantsForSteam64(steamid) }, date: { gte: since } },
    distinct: ['ip'],
    select: { ip: true }
  });
  const subjectIps = subjectIpRows.map((r) => r.ip).filter(Boolean) as string[];
  if (subjectIps.length === 0) return json({ steamid, candidates: [] });

  // All accounts seen on those IPs
  const otherRows = await prismaArg.whois_logs.findMany({
    where: { ip: { in: subjectIps }, date: { gte: since } },
    select: { steam_id: true, ip: true, name: true, date: true }
  });

  // Aggregate evidence by candidate steam_id
  const candidatesMap: Record<string, { steamid: string; sharedIps: Set<string>; examples: any[]; names: Set<string> }> = {};
  for (const r of otherRows) {
    const sid = (r.steam_id as string | null)?.trim() || null;
    if (!sid) continue;
    if (subjectVariants.has(sid)) continue;
    const sid64 = toSteam64FromAny(sid);
    if (sid64 && subjectVariants.has(sid64)) continue;
    if (!candidatesMap[sid]) candidatesMap[sid] = { steamid: sid, sharedIps: new Set<string>(), examples: [], names: new Set<string>() };
    candidatesMap[sid].sharedIps.add(r.ip as string);
    candidatesMap[sid].examples.push(r);
    if (r.name) candidatesMap[sid].names.add(r.name);
  }

  // Get subject names
  const subjectNamesRows = await prismaArg.whois_logs.findMany({ where: { steam_id: steamid, date: { gte: since } }, distinct: ['name'], select: { name: true } });
  const subjectNames = subjectNamesRows.map((r) => r.name).filter(Boolean) as string[];

  // Estimate IP churn: how many distinct accounts per IP
  const churnRows = await prismaArg.whois_logs.findMany({ where: { ip: { in: subjectIps }, date: { gte: since } }, distinct: ['ip', 'steam_id'], select: { ip: true, steam_id: true } });
  const ipToAccounts = new Map<string, Set<string>>();
  for (const r of churnRows) {
    const ip = r.ip as string;
    const sid = r.steam_id as string;
    if (!ipToAccounts.has(ip)) ipToAccounts.set(ip, new Set());
    ipToAccounts.get(ip)!.add(sid);
  }

  const candidates = Object.values(candidatesMap)
    .map((c) => {
      const sharedIps = [...c.sharedIps];
      // Weight IPs: rare IPs weigh more
      let ipScore = 0;
      for (const ip of sharedIps) {
        const accCount = ipToAccounts.get(ip)?.size || 1;
        const rarity = 1 / Math.min(accCount, 10); // 1.0 for 1, 0.5 for 2, ... floor at 0.1
        ipScore += rarity;
      }
      // Normalize roughly to 0..1
      const ipOverlapScore = Math.min(1, ipScore / 3);

      // Name similarity (best match across names)
      let nameSim = 0;
      for (const n1 of subjectNames) for (const n2 of c.names) nameSim = Math.max(nameSim, stringSimilarity(n1!, n2!));
      const nameSimilarityScore = nameSim * 0.6; // cap influence

      // Simple aggregate
      const score = Math.max(0, Math.min(1, 0.75 * ipOverlapScore + 0.25 * nameSimilarityScore));

      let label: 'Likely' | 'Possible' | 'Unlikely' = 'Unlikely';
      if (score >= 0.7) label = 'Likely';
      else if (score >= 0.4) label = 'Possible';

      const cand64 = toSteam64FromAny(c.steamid) || null;
      if (cand64 && subjectVariants.has(cand64)) {
        return null;
      }
      return {
        steamidRaw: c.steamid,
        steamid64: cand64,
        score,
        label,
        sharedIps: sharedIps,
        evidence: {
          ipOverlapScore,
          nameSimilarityScore
        }
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score);

  // Fetch ELO data for all candidates
  const candidateSteamIds = candidates.map((c: any) => c.steamid64).filter(Boolean);
  const candidateEloData = await getEloForSteamIds(candidateSteamIds);

  // Add ELO data to candidates
  const candidatesWithElo = candidates.map((c: any) => ({
    ...c,
    elo: c.steamid64 ? candidateEloData[c.steamid64] || { ar: null, br: null } : { ar: null, br: null }
  }));

  return json({ steamid, candidates: candidatesWithElo }, { headers: { 'cache-control': 'no-store' } });
};
