import { getPanelEnv } from '$lib/server/env';
import {
	assertMysqlDsn,
	decryptDsn,
	deriveDsnKey,
	encryptDsn,
	parseMysqlDsn,
	redactDsn
} from './dsn-crypto';

function dsnKey(): Buffer {
	return deriveDsnKey(getPanelEnv().SESSION_SECRET);
}

export function encryptSourceDsn(plaintext: string, sourceId: string): string {
	assertMysqlDsn(plaintext);
	return encryptDsn(plaintext, sourceId, dsnKey());
}

export function decryptSourceDsn(ciphertext: string, sourceId: string): string {
	return decryptDsn(ciphertext, sourceId, dsnKey());
}

export { assertMysqlDsn, parseMysqlDsn, redactDsn };
