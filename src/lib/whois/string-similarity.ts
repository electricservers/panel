/**
 * Normalized Levenshtein ratio in `[0, 1]`, case-insensitive. `1` means
 * identical, `0` means completely different. Used to score name overlap
 * between a Whois subject and an alt candidate.
 */
export function stringSimilarity(a: string, b: string): number {
	if (!a || !b) return 0;
	const s1 = a.toLowerCase();
	const s2 = b.toLowerCase();
	if (s1 === s2) return 1;

	const dp: number[][] = Array.from({ length: s1.length + 1 }, () =>
		new Array(s2.length + 1).fill(0)
	);
	for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
	for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

	for (let i = 1; i <= s1.length; i++) {
		for (let j = 1; j <= s2.length; j++) {
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}

	const distance = dp[s1.length][s2.length];
	return 1 - distance / Math.max(s1.length, s2.length);
}
