export function isValidIPv4(input: string): boolean {
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return ipv4Regex.test(input.trim());
}

export function extractSteamId64(input: string): string | null {
  const trimmed = input.trim();

  // If already a 64-bit SteamID
  if (/^\d{17}$/.test(trimmed)) return trimmed;

  // From profile URL
  const urlMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (urlMatch) return urlMatch[1];

  // SteamID3: [U:1:Z]
  const sid3 = trimmed.match(/^\[?U:1:(\d+)\]?$/i);
  if (sid3) {
    const accountId = BigInt(sid3[1]);
    return (accountId + BigInt('76561197960265728')).toString();
  }

  // SteamID2: STEAM_X:Y:Z (assume universe 1)
  const sid2 = trimmed.match(/^STEAM_\d:(\d):(\d+)$/i);
  if (sid2) {
    const y = BigInt(sid2[1]);
    const z = BigInt(sid2[2]);
    const accountId = z * BigInt(2) + y;
    return (accountId + BigInt('76561197960265728')).toString();
  }

  return null;
}

export function toSteam64FromAny(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{17}$/.test(trimmed)) return trimmed;
  const urlMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (urlMatch) return urlMatch[1];
  const sid3 = trimmed.match(/^\[?U:1:(\d+)\]?$/i);
  if (sid3) {
    const accountId = BigInt(sid3[1]);
    return (accountId + BigInt('76561197960265728')).toString();
  }
  const sid2 = trimmed.match(/^STEAM_\d:(\d):(\d+)$/i);
  if (sid2) {
    const y = BigInt(sid2[1]);
    const z = BigInt(sid2[2]);
    const accountId = z * BigInt(2) + y;
    return (accountId + BigInt('76561197960265728')).toString();
  }
  // Raw accountId
  if (/^\d{1,10}$/.test(trimmed)) {
    const accountId = BigInt(trimmed);
    return (accountId + BigInt('76561197960265728')).toString();
  }
  return null;
}

export function steam64ToAccountId(steam64: string): string | null {
  if (!/^\d{17}$/.test(steam64)) return null;
  const base = BigInt('76561197960265728');
  const id = BigInt(steam64) - base;
  if (id < 0) return null;
  return id.toString();
}

export function steam64ToSteam2(steam64: string): { u0: string; u1: string } | null {
  const accountIdStr = steam64ToAccountId(steam64);
  if (!accountIdStr) return null;
  const accountId = BigInt(accountIdStr);
  const y = accountId % BigInt(2);
  const z = (accountId - y) / BigInt(2);
  const Y = y.toString();
  const Z = z.toString();
  return { u0: `STEAM_0:${Y}:${Z}`, u1: `STEAM_1:${Y}:${Z}` };
}

export function steam64ToSteam3(steam64: string): string | null {
  const accountIdStr = steam64ToAccountId(steam64);
  if (!accountIdStr) return null;
  return `[U:1:${accountIdStr}]`;
}

export function allIdVariantsForSteam64(steam64: string): string[] {
  const variants = new Set<string>();
  if (!steam64) return [];
  variants.add(steam64);
  const acc = steam64ToAccountId(steam64);
  if (acc) variants.add(acc);
  const s2 = steam64ToSteam2(steam64);
  if (s2) {
    variants.add(s2.u0);
    variants.add(s2.u1);
  }
  const s3 = steam64ToSteam3(steam64);
  if (s3) {
    variants.add(s3);
    variants.add(s3.replace(/\[|\]/g, ''));
  }
  return Array.from(variants);
}

export function normalizeSubject(input: string): { type: 'ip' | 'steam'; value: string } | null {
  if (isValidIPv4(input)) return { type: 'ip', value: input.trim() };
  const steam64 = extractSteamId64(input);
  if (steam64) return { type: 'steam', value: steam64 };
  return null;
}

export function jaccardSimilarity<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function stringSimilarity(a: string, b: string): number {
  // Simple normalized Levenshtein ratio for short names (fast approximation)
  if (!a || !b) return 0;
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1;
  const dp: number[][] = Array.from({ length: s1.length + 1 }, () => Array(s2.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const lev = dp[s1.length][s2.length];
  return 1 - lev / Math.max(s1.length, s2.length);
}
