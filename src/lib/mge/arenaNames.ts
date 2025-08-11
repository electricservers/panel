// Utilities to canonicalize MGE arena names. Many arenas are duplicated as
// numbered variants (e.g., "Badlands Middle 2 [1v1 MGE]"). We normalize these
// variants to a canonical "Map Part" form (e.g., "Badlands Middle").

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

const TOKEN_STRIP = ['1v1', '2v2', 'mge', 'tf2', 'arena'];

const PART_SYNONYMS: Record<string, string> = {
  mid: 'middle'
};

export function canonicalizeArenaName(original: string | null | undefined): string {
  if (!original) return '';
  let s = String(original);
  // remove bracketed tags, e.g., [1v1 MGE]
  s = s.replace(/\[[^\]]*\]/g, ' ');
  // remove parentheses content
  s = s.replace(/\([^)]*\)/g, ' ');
  s = normalizeWhitespace(s);
  // strip tokens
  const words = s.split(' ').filter(Boolean);
  const kept: string[] = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (TOKEN_STRIP.includes(lw)) continue;
    if (/^\d+$/.test(lw)) continue; // pure numbers (e.g., variant indexes)
    // map synonyms
    const mapped = PART_SYNONYMS[lw] ?? lw;
    kept.push(mapped);
  }
  s = kept.join(' ');
  // collapse repeated spaces and trim
  s = normalizeWhitespace(s);
  // optional: split into map + part heuristics, but for now just TitleCase whole
  s = toTitleCase(s);
  // final pass: remove trailing numbers/roman numerals (defensive)
  s = s.replace(/\s+(?:[ivx]+|\d+)$/i, '');
  return s;
}
