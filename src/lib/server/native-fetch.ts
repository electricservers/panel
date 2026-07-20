import { fetch as undiciFetch } from 'undici';

/**
 * Outbound HTTP via undici, not `globalThis.fetch`.
 *
 * Streamed `load` promises (e.g. avatar enrichment) can resolve during
 * SvelteKit's SSR render pass, where Kit temporarily wraps `globalThis.fetch`
 * and warns on eager calls. Steam API requests should bypass that wrapper;
 * they are not relative app fetches and do not need hydration capture.
 */
export function nativeFetch(input: string | URL, init?: RequestInit): Promise<Response> {
	return undiciFetch(
		input,
		init as Parameters<typeof undiciFetch>[1]
	) as unknown as Promise<Response>;
}
