// Historical mgemod_duels/mgemod_stats rows were written through a client
// that decoded incoming UTF-8 name bytes as Windows-1252 / Latin-1 and
// re-encoded the result as UTF-8 before insert. That's a lossy round-trip
// for the 0x80-0x9F block (curly quotes, en/em dash, Œ, and the five
// Windows-1252 holes that survive as C1 controls), so multi-byte names
// (phonetic Latin, accents, CJK, ...) come back garbled. This reverses
// that round-trip: map each character back to its single byte, then
// decode the byte sequence as UTF-8.
const WINDOWS_1252_C1_BLOCK: Record<number, number> = {
	0x20ac: 0x80,
	0x201a: 0x82,
	0x0192: 0x83,
	0x201e: 0x84,
	0x2026: 0x85,
	0x2020: 0x86,
	0x2021: 0x87,
	0x02c6: 0x88,
	0x2030: 0x89,
	0x0160: 0x8a,
	0x2039: 0x8b,
	0x0152: 0x8c,
	0x017d: 0x8e,
	0x2018: 0x91,
	0x2019: 0x92,
	0x201c: 0x93,
	0x201d: 0x94,
	0x2022: 0x95,
	0x2013: 0x96,
	0x2014: 0x97,
	0x02dc: 0x98,
	0x2122: 0x99,
	0x0161: 0x9a,
	0x203a: 0x9b,
	0x0153: 0x9c,
	0x017e: 0x9e,
	0x0178: 0x9f
};

const REPLACEMENT_CHAR = '\uFFFD';
const MOJIBAKE_HINT_PATTERN =
	/[\u0080-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/;

function reverseWindows1252(value: string): Buffer | null {
	const bytes: number[] = [];
	for (const char of value) {
		const code = char.codePointAt(0)!;
		// Latin-1 / C1 controls (including the five Windows-1252 undefined
		// bytes that often survive as U+0081/8D/8F/90/9D) map 1:1 to bytes.
		if (code <= 0xff) {
			bytes.push(code);
			continue;
		}
		const mapped = WINDOWS_1252_C1_BLOCK[code];
		if (mapped === undefined) return null;
		bytes.push(mapped);
	}
	return Buffer.from(bytes);
}

export function maybeFixMojibake(value: string | null | undefined): string | null {
	if (!value) return value ?? null;
	if (!MOJIBAKE_HINT_PATTERN.test(value)) return value;

	const bytes = reverseWindows1252(value);
	if (!bytes) return value;

	const decoded = bytes.toString('utf8');
	return decoded.includes(REPLACEMENT_CHAR) ? value : decoded;
}
