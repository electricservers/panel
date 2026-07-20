/**
 * One-time repair: reverse Windows-1252 mojibake in MGEMod MySQL rows using the
 * same heuristic as `src/lib/mge/mojibake.ts`. Dry-run by default; pass `--apply`
 * to write updates.
 *
 * Discovers targets from the panel SQLite `sources` table (enabled + `mgemod`
 * capability) and resolves each row's `dsn_env` against the process environment.
 * Override with `--dsn-env NAME` (repeatable) to skip the panel DB.
 *
 * Usage:
 *   bun run scripts/fix-mgemod-mojibake.ts
 *   bun run scripts/fix-mgemod-mojibake.ts --apply
 *   bun run scripts/fix-mgemod-mojibake.ts --dsn-env SOURCE_ELECTRIC_AR_URL --apply
 */
import { Database } from 'bun:sqlite';
import mysql from 'mysql2/promise';
import { maybeFixMojibake } from '../src/lib/mge/mojibake.ts';

type Target = {
	label: string;
	dsnEnv: string;
	dsn: string;
};

type StatsRow = {
	steamid: string;
	name: string | null;
};

type TextColumnRow = {
	id: number;
	value: string | null;
};

function resolveDbFile(panelDbUrl: string): string {
	return panelDbUrl.startsWith('file:') ? panelDbUrl.slice('file:'.length) : panelDbUrl;
}

function parseArgs(argv: string[]) {
	const apply = argv.includes('--apply');
	const dsnEnvs: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--dsn-env') {
			const name = argv[i + 1];
			if (!name || name.startsWith('--')) {
				throw new Error('--dsn-env requires an environment variable name.');
			}
			dsnEnvs.push(name);
			i++;
		}
	}
	return { apply, dsnEnvs };
}

function loadTargetsFromPanelDb(): Target[] {
	const panelDbUrl = process.env.PANEL_DB_URL;
	if (!panelDbUrl) {
		throw new Error(
			'PANEL_DB_URL is not set. Set it, or pass one or more --dsn-env SOURCE_*_URL flags.'
		);
	}

	const db = new Database(resolveDbFile(panelDbUrl), { readonly: true });
	const rows = db
		.query(
			`SELECT id, label, dsn_env AS dsnEnv, capabilities, enabled
			 FROM sources
			 ORDER BY id`
		)
		.all() as Array<{
		id: string;
		label: string;
		dsnEnv: string;
		capabilities: string;
		enabled: number;
	}>;

	const targets: Target[] = [];
	for (const row of rows) {
		if (!row.enabled) continue;
		let capabilities: string[] = [];
		try {
			capabilities = JSON.parse(row.capabilities) as string[];
		} catch {
			console.warn(`Skipping source "${row.id}": capabilities JSON is invalid.`);
			continue;
		}
		if (!capabilities.includes('mgemod')) continue;

		const dsn = process.env[row.dsnEnv];
		if (!dsn) {
			console.warn(
				`Skipping source "${row.id}": env var "${row.dsnEnv}" is not set in this process.`
			);
			continue;
		}
		targets.push({ label: `${row.id} (${row.label})`, dsnEnv: row.dsnEnv, dsn });
	}
	return targets;
}

function loadTargetsFromDsnEnvs(dsnEnvs: string[]): Target[] {
	return dsnEnvs.map((dsnEnv) => {
		const dsn = process.env[dsnEnv];
		if (!dsn) {
			throw new Error(`Environment variable "${dsnEnv}" is not set.`);
		}
		return { label: dsnEnv, dsnEnv, dsn };
	});
}

async function repairStatsNames(
	connection: mysql.Connection,
	apply: boolean
): Promise<{ scanned: number; wouldFix: number; fixed: number }> {
	const [rows] = await connection.query<mysql.RowDataPacket[]>(
		'SELECT steamid, name FROM mgemod_stats'
	);
	const stats = rows as StatsRow[];

	let wouldFix = 0;
	let fixed = 0;
	for (const row of stats) {
		const repaired = maybeFixMojibake(row.name);
		if (!repaired || repaired === row.name) continue;
		wouldFix++;
		console.log(`  [name] ${row.steamid}: ${JSON.stringify(row.name)} -> ${JSON.stringify(repaired)}`);
		if (apply) {
			await connection.execute('UPDATE mgemod_stats SET name = ? WHERE steamid = ?', [
				repaired,
				row.steamid
			]);
			fixed++;
		}
	}
	return { scanned: stats.length, wouldFix, fixed };
}

async function repairTextColumn(
	connection: mysql.Connection,
	table: string,
	column: string,
	apply: boolean
): Promise<{ scanned: number; wouldFix: number; fixed: number }> {
	const [rows] = await connection.query<mysql.RowDataPacket[]>(
		`SELECT id, \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` != ''`
	);
	const items = rows as TextColumnRow[];

	let wouldFix = 0;
	let fixed = 0;
	for (const row of items) {
		const repaired = maybeFixMojibake(row.value);
		if (!repaired || repaired === row.value) continue;
		wouldFix++;
		console.log(
			`  [${table}.${column}#${row.id}] ${JSON.stringify(row.value)} -> ${JSON.stringify(repaired)}`
		);
		if (apply) {
			await connection.execute(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`, [
				repaired,
				row.id
			]);
			fixed++;
		}
	}
	return { scanned: items.length, wouldFix, fixed };
}

async function tableExists(connection: mysql.Connection, table: string): Promise<boolean> {
	const [rows] = await connection.query<mysql.RowDataPacket[]>(
		`SELECT 1 AS ok FROM information_schema.tables
		 WHERE table_schema = DATABASE() AND table_name = ?
		 LIMIT 1`,
		[table]
	);
	return rows.length > 0;
}

async function repairTarget(target: Target, apply: boolean) {
	console.log(`\n=== ${target.label} [${target.dsnEnv}] ===`);
	const connection = await mysql.createConnection({ uri: target.dsn, charset: 'utf8mb4' });

	try {
		const names = await repairStatsNames(connection, apply);
		console.log(
			`  mgemod_stats.name: scanned ${names.scanned}, ` +
				(apply ? `fixed ${names.fixed}` : `would fix ${names.wouldFix}`)
		);

		for (const table of ['mgemod_duels', 'mgemod_duels_2v2']) {
			if (!(await tableExists(connection, table))) {
				console.log(`  ${table}: table missing, skipped`);
				continue;
			}
			for (const column of ['mapname', 'arenaname']) {
				const result = await repairTextColumn(connection, table, column, apply);
				console.log(
					`  ${table}.${column}: scanned ${result.scanned}, ` +
						(apply ? `fixed ${result.fixed}` : `would fix ${result.wouldFix}`)
				);
			}
		}
	} finally {
		await connection.end();
	}
}

async function main() {
	const { apply, dsnEnvs } = parseArgs(process.argv.slice(2));
	const targets =
		dsnEnvs.length > 0 ? loadTargetsFromDsnEnvs(dsnEnvs) : loadTargetsFromPanelDb();

	if (targets.length === 0) {
		console.log('No mgemod sources with resolvable DSNs found. Nothing to do.');
		return;
	}

	console.log(
		apply
			? `Applying mojibake repairs on ${targets.length} source(s).`
			: `Dry-run on ${targets.length} source(s). Pass --apply to write changes.`
	);

	for (const target of targets) {
		await repairTarget(target, apply);
	}

	console.log(apply ? '\nDone. Repairs written.' : '\nDone. Dry-run only; no rows updated.');
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
