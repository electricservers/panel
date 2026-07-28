export type VoiceManifestSegment = {
	steam_id: string;
	file: string;
	start_tick: number;
	end_tick: number;
	start_seconds: number;
	end_seconds: number;
};

export type VoiceManifest = {
	map: string;
	server: string;
	duration_seconds: number;
	ticks: number;
	players: Record<string, string>;
	segments: VoiceManifestSegment[];
};

export type VoiceStatus = 'uploaded' | 'processing' | 'processed' | 'failed';
