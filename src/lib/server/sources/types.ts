export type SourceId = string;

export type Capability = 'mgemod' | 'whois';

export const KNOWN_CAPABILITIES: readonly Capability[] = ['mgemod', 'whois'];

export type Source = {
	id: SourceId;
	label: string;
	enabled: boolean;
	capabilities: readonly Capability[];
};

export type FanOutResult<T> =
	{ sourceId: SourceId; ok: true; data: T } | { sourceId: SourceId; ok: false; error: string };

/** Any game-originated DTO carries the source it came from ([docs/ARCHITECTURE.md](../../../../docs/ARCHITECTURE.md)). */
export type Sourced<T> = T & { sourceId: SourceId };
