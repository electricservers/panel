/**
 * One-time repair: reverse Windows-1252 mojibake in MGEMod MySQL rows using the
 * same heuristic as `src/lib/mge/mojibake.ts`. Dry-run by default; pass `--apply`
 * to write updates.
 *
 * Discovers targets from the panel SQLite `sources` table (enabled + `mgemod`
 * capability) and decrypts each stored DSN. Override with `--dsn mysql://...`
 * (repeatable) to skip the panel DB.
 *
 * Usage:
 *   bun run scripts/fix-mgemod-mojibake.ts
 *   bun run scripts/fix-mgemod-mojibake.ts --apply
 *   bun run scripts/fix-mgemod-mojibake.ts --dsn mysql://user:pass@host:3306/db --apply
 */
import { Database } from 'bun:sqlite';
import mysql from 'mysql2/promise';
import { maybeFixMojibake } from '../src/lib/mge/mojibake.ts';
import {
	decryptDsn,
	deriveDsnKey,
	parseMysqlDsn,
	redactDsn
} from '../src/lib/server/secrets/dsn-crypto.ts';

type Target = {
	label: string;
	preview: string;
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
	const dsns: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--dsn') {
			const value = argv[i + 1];
			if (!value || value.startsWith('--')) {
				throw new Error('--dsn requires a mysql:// URL.');
			}
			dsns.push(value);
			i++;
		}
	}
	return { apply, dsns };
}

function loadTargetsFromPanelDb(): Target[] {
	const panelDbUrl = process.env.PANEL_DB_URL;
	const sessionSecret = process.env.SESSION_SECRET;
	if (!panelDbUrl) {
		throw new Error(
			'PANEL_DB_URL is not set. Set it, or pass one or more --dsn mysql://... flags.'
		);
	}
	if (!sessionSecret) {
		throw new Error('SESSION_SECRET is not set. Needed to decrypt stored connection strings.');
	}

	const db = new Database(resolveDbFile(panelDbUrl), { readonly: true });
	const columns = new Set(
		(db.query(`PRAGMA table_info(sources)`).all() as Array<{ name: string }>).map((col) => col.name)
	);
	if (!columns.has('dsn_ciphertext')) {
		throw new Error(
			'sources.dsn_ciphertext is missing. Start the panel once so it can migrate stored DSNs, then retry.'
		);
	}

	const key = deriveDsnKey(sessionSecret);
	const rows = db
		.query(
			`SELECT id, label, dsn_ciphertext AS dsnCiphertext, capabilities, enabled
			 FROM sources
			 ORDER BY id`
		)
		.all() as Array<{
		id: string;
		label: string;
		dsnCiphertext: string;
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

		if (!row.dsnCiphertext) {
			console.warn(`Skipping source "${row.id}": no connection string stored.`);
			continue;
		}
		try {
			const dsn = decryptDsn(row.dsnCiphertext, row.id, key);
			targets.push({
				label: `${row.id} (${row.label})`,
				preview: redactDsn(dsn),
				dsn
			});
		} catch {
			console.warn(
				`Skipping source "${row.id}": stored connection string could not be decrypted with SESSION_SECRET.`
			);
		}
	}
	return targets;
}

function loadTargetsFromDsns(dsns: string[]): Target[] {
	return dsns.map((dsn, index) => {
		parseMysqlDsn(dsn);
		return { label: `cli-${index + 1}`, preview: redactDsn(dsn), dsn };
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
		console.log(
			`  [name] ${row.steamid}: ${JSON.stringify(row.name)} -> ${JSON.stringify(repaired)}`
		);
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
	console.log(`\n=== ${target.label} [${target.preview}] ===`);
	const parts = parseMysqlDsn(target.dsn);
	const connection = await mysql.createConnection({
		host: parts.host,
		port: parts.port,
		user: parts.user,
		password: parts.password,
		database: parts.database,
		charset: 'utf8mb4'
	});

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
	const { apply, dsns } = parseArgs(process.argv.slice(2));
	const targets = dsns.length > 0 ? loadTargetsFromDsns(dsns) : loadTargetsFromPanelDb();

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
