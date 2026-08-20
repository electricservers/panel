const CLASS_LABELS: Record<string, string> = {
	scout: 'Scout',
	soldier: 'Soldier',
	pyro: 'Pyro',
	demoman: 'Demoman',
	heavy: 'Heavy',
	engineer: 'Engineer',
	medic: 'Medic',
	sniper: 'Sniper',
	spy: 'Spy'
};

/** Splits plugin class strings, including comma-separated class-change values. */
export function parsePlayedClasses(raw: string | null | undefined): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const part of raw.split(',')) {
		const classId = part.trim().toLowerCase();
		if (!classId || classId === 'unknown' || seen.has(classId)) continue;
		seen.add(classId);
		out.push(classId);
	}
	return out;
}

export function classDisplayName(classId: string): string {
	return CLASS_LABELS[classId] ?? classId.replace(/^\w/, (char) => char.toUpperCase());
}
