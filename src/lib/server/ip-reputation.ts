import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { nativeFetch } from '$lib/server/native-fetch';

export type IpRangeLabel = 'vpn' | 'datacenter';

/** Inclusive `[start, end]` uint32 IPv4 range. */
type Range = [number, number];

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Downloaded list cache (gitignored volume). */
const CACHE_DIR = resolve('data/ip-ranges');
/**
 * Committed manual CIDR lists (one `.txt` file per source / find).
 * Drop new files here to extend classification without code changes.
 */
const MANUAL_DIR = resolve('ip-ranges');
const VPN_CACHE_PATH = join(CACHE_DIR, 'vpn-ipv4.txt');
const DATACENTER_CACHE_PATH = join(CACHE_DIR, 'datacenter-ipv4.txt');
const CLOUDFLARE_CACHE_PATH = join(CACHE_DIR, 'cloudflare-ipv4.txt');
const VPN_LIST_URL = 'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt';
const DATACENTER_LIST_URL =
	'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt';
const CLOUDFLARE_LIST_URL = 'https://www.cloudflare.com/ips-v4';

const CIDR_PATTERN = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

type State = { vpn: Range[]; datacenter: Range[]; loadedAt: number };

let state: State | null = null;
let refreshPromise: Promise<void> | null = null;

function ip4ToUint32(ip: string): number | null {
	const match = ip.trim().match(IPV4_PATTERN);
	if (!match) return null;
	const octets = match.slice(1, 5).map(Number);
	if (octets.some((octet) => octet > 255)) return null;
	return octets[0] * 2 ** 24 + octets[1] * 2 ** 16 + octets[2] * 2 ** 8 + octets[3];
}

function parseCidrLine(line: string): Range | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) return null;
	const match = trimmed.match(CIDR_PATTERN);
	if (!match) return null;
	const base = ip4ToUint32(match[1]);
	const prefixLength = Number(match[2]);
	if (base === null || prefixLength < 0 || prefixLength > 32) return null;
	const size = 2 ** (32 - prefixLength);
	const start = Math.floor(base / size) * size;
	return [start, start + size - 1];
}

function parseListText(text: string): Range[] {
	const ranges: Range[] = [];
	for (const line of text.split('\n')) {
		const range = parseCidrLine(line);
		if (range) ranges.push(range);
	}
	return ranges;
}

/** Sorts and coalesces overlapping/adjacent ranges so a single binary search is exact. */
function mergeRanges(ranges: Range[]): Range[] {
	if (ranges.length === 0) return [];
	const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
	const merged: Range[] = [[sorted[0][0], sorted[0][1]]];
	for (const [start, end] of sorted.slice(1)) {
		const last = merged[merged.length - 1];
		if (start <= last[1] + 1) {
			last[1] = Math.max(last[1], end);
		} else {
			merged.push([start, end]);
		}
	}
	return merged;
}

function containsIp(ranges: Range[], ip: number): boolean {
	let lo = 0;
	let hi = ranges.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const [start, end] = ranges[mid];
		if (ip < start) hi = mid - 1;
		else if (ip > end) lo = mid + 1;
		else return true;
	}
	return false;
}

async function readCache(path: string): Promise<string | null> {
	try {
		return await readFile(path, 'utf8');
	} catch {
		return null;
	}
}

async function writeCache(path: string, text: string): Promise<void> {
	try {
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, text, 'utf8');
	} catch {
		// Best-effort disk cache; classification still works from the in-memory text.
	}
}

/** Downloads `url`, falling back to the on-disk cache when the request fails. */
async function loadList(url: string, cachePath: string): Promise<string> {
	try {
		const response = await nativeFetch(url);
		if (response.ok) {
			const text = await response.text();
			await writeCache(cachePath, text);
			return text;
		}
	} catch {
		// Offline or GitHub unreachable: fall through to the disk cache.
	}
	return (await readCache(cachePath)) ?? '';
}

/** Loads every `*.txt` under `ip-ranges/` (committed manual finds). */
async function loadManualRanges(): Promise<Range[]> {
	try {
		const names = (await readdir(MANUAL_DIR)).filter((name) => name.endsWith('.txt')).sort();
		const texts = await Promise.all(
			names.map((name) => readFile(join(MANUAL_DIR, name), 'utf8').catch(() => ''))
		);
		return texts.flatMap(parseListText);
	} catch {
		return [];
	}
}

async function loadRanges(): Promise<void> {
	const [vpnText, datacenterText, cloudflareText, manualRanges] = await Promise.all([
		loadList(VPN_LIST_URL, VPN_CACHE_PATH),
		loadList(DATACENTER_LIST_URL, DATACENTER_CACHE_PATH),
		loadList(CLOUDFLARE_LIST_URL, CLOUDFLARE_CACHE_PATH),
		loadManualRanges()
	]);
	state = {
		vpn: mergeRanges(parseListText(vpnText)),
		datacenter: mergeRanges([
			...parseListText(datacenterText),
			...parseListText(cloudflareText),
			...manualRanges
		]),
		loadedAt: Date.now()
	};
}

/**
 * Blocks on the very first load (cold start); once ranges exist, a stale
 * cache (>24h old) triggers a background refresh without blocking callers.
 */
async function ensureLoaded(): Promise<void> {
	if (!state) {
		refreshPromise ??= loadRanges().finally(() => {
			refreshPromise = null;
		});
		await refreshPromise;
		return;
	}
	if (Date.now() - state.loadedAt >= REFRESH_INTERVAL_MS && !refreshPromise) {
		refreshPromise = loadRanges().finally(() => {
			refreshPromise = null;
		});
	}
}

/**
 * Classifies an IPv4 address against free VPN/datacenter CIDR lists
 * (X4BNet `lists_vpn`, Cloudflare ips-v4, plus every `*.txt` under
 * `ip-ranges/`). Returns `null` for anything unparseable, unclassified,
 * or if list data isn't available yet — never throws.
 */
export async function classifyIp(ip: string): Promise<IpRangeLabel | null> {
	await ensureLoaded();
	const ipInt = ip4ToUint32(ip);
	if (ipInt === null || !state) return null;
	if (containsIp(state.vpn, ipInt)) return 'vpn';
	if (containsIp(state.datacenter, ipInt)) return 'datacenter';
	return null;
}
