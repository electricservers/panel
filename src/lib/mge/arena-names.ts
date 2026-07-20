// Canonicalizes MGE arena names so numbered clone variants (e.g. "Badlands
// Middle 2 [1v1 MGE]") group under one display name ("Badlands Middle").

function toTitleCase(input: string): string {
	return input
		.toLowerCase()
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
	s = s.replace(/\[[^\]]*\]/g, ' ');
	s = s.replace(/\([^)]*\)/g, ' ');
	s = normalizeWhitespace(s);

	const kept: string[] = [];
	for (const word of s.split(' ').filter(Boolean)) {
		const lower = word.toLowerCase();
		if (TOKEN_STRIP.includes(lower)) continue;
		if (/^\d+$/.test(lower)) continue;
		kept.push(PART_SYNONYMS[lower] ?? lower);
	}
	s = normalizeWhitespace(kept.join(' '));
	s = toTitleCase(s);
	s = s.replace(/\s+(?:[ivx]+|\d+)$/i, '');
	return s;
}
