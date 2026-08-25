import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGORITHM = 'aes-256-gcm';
const HKDF_SALT = 'electric-panel';
const HKDF_INFO = 'source-dsn-aes-256-gcm-v1';

export type MysqlDsnParts = {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
};

export function deriveDsnKey(masterSecret: string): Buffer {
	if (masterSecret.length < 16) {
		throw new Error('SESSION_SECRET is too short to derive the DSN encryption key.');
	}
	return Buffer.from(hkdfSync('sha256', masterSecret, HKDF_SALT, HKDF_INFO, KEY_LENGTH));
}

export function encryptDsn(plaintext: string, sourceId: string, key: Buffer): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	cipher.setAAD(Buffer.from(sourceId, 'utf8'));
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([Buffer.from([VERSION]), iv, tag, ciphertext]).toString('base64');
}

export function decryptDsn(packedB64: string, sourceId: string, key: Buffer): string {
	const packed = Buffer.from(packedB64, 'base64');
	const minLength = 1 + IV_LENGTH + TAG_LENGTH + 1;
	if (packed.length < minLength) {
		throw new Error('Stored connection string is corrupt.');
	}
	const version = packed[0];
	if (version !== VERSION) {
		throw new Error(`Unsupported connection-string encryption version ${version}.`);
	}
	const iv = packed.subarray(1, 1 + IV_LENGTH);
	const tag = packed.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
	const ciphertext = packed.subarray(1 + IV_LENGTH + TAG_LENGTH);
	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAAD(Buffer.from(sourceId, 'utf8'));
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function parseMysqlDsn(dsn: string): MysqlDsnParts {
	let url: URL;
	try {
		url = new URL(dsn);
	} catch {
		throw new Error('Connection string must be a valid mysql:// URL.');
	}
	if (url.protocol !== 'mysql:' && url.protocol !== 'mysql2:') {
		throw new Error('Connection string must use the mysql:// scheme.');
	}
	if (!url.hostname) {
		throw new Error('Connection string must include a hostname.');
	}
	const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
	if (!database) {
		throw new Error('Connection string must include a database name.');
	}
	return {
		host: url.hostname,
		port: url.port ? Number(url.port) : 3306,
		user: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
		database
	};
}

export function assertMysqlDsn(dsn: string): void {
	parseMysqlDsn(dsn);
}

export function redactDsn(dsn: string): string {
	try {
		const parts = parseMysqlDsn(dsn);
		return `mysql://***@${parts.host}:${parts.port}/${parts.database}`;
	} catch {
		return 'mysql://***';
	}
}
