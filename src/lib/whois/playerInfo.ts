export interface PlayerInfo {
  steamid: string;
  steamid64: string;
  names: string[];
  alias?: string;
  alts?: {
    [ip: string]: AltEntry[];
  };
}

export interface AltEntry {
  names: string[];
  steamid: string;
  steamid64: string;
}
