import { createHmac, timingSafeEqual } from 'node:crypto';
import { dev } from '$app/environment';
import { getPanelEnv } from '$lib/server/env';

export type PanelRole = 'user' | 'admin' | 'owner';

export type SessionUser = {
	steamId: string;
	role: PanelRole;
	name?: string;
	avatar?: string;
};

export const SESSION_COOKIE_NAME = 'panel_session';

export const SESSION_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 7
};

function sign(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Encodes a session as `base64url(payload).base64url(hmac-sha256)`. */
export function sealSession(user: SessionUser): string {
	const { SESSION_SECRET } = getPanelEnv();
	const payload = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
	return `${payload}.${sign(payload, SESSION_SECRET)}`;
}

/**
 * Verifies the signature before trusting any field, so a tampered cookie
 * can never be used to escalate role or impersonate a SteamID.
 */
export function unsealSession(value: string | undefined | null): SessionUser | null {
	if (!value) return null;

	const [payload, signature] = value.split('.');
	if (!payload || !signature) return null;

	const { SESSION_SECRET } = getPanelEnv();
	const expected = sign(payload, SESSION_SECRET);

	const actualBuf = Buffer.from(signature);
	const expectedBuf = Buffer.from(expected);
	if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
		return null;
	}

	try {
		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (typeof parsed?.steamId !== 'string' || typeof parsed?.role !== 'string') return null;
		return parsed as SessionUser;
	} catch {
		return null;
	}
}
