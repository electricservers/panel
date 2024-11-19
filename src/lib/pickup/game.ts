export interface Games {
  results: Result[];
  itemCount: number;
}

export interface Result {
  id: string;
  launchedAt: string;
  endedAt: string;
  number: number;
  slots: Slot[];
  map: string;
  state: string;
  connectInfoVersion: number;
  stvConnectString: string;
  logsUrl: string;
  demoUrl: string;
  gameServer: GameServer;
  score: Score;
}

export interface Slot {
  player: Player;
  team: string;
  gameClass: string;
  status: string;
  connectionStatus: string;
}

export interface Player {
  id: string;
  name: string;
  steamId: string;
  joinedAt: string;
  avatar: Avatar;
  roles: string[];
  gamesPlayed: number;
  _links: Link[];
  etf2lProfileId?: number;
}

export interface Avatar {
  small: string;
  medium: string;
  large: string;
}

export interface Link {
  href: string;
  title: string;
}

export interface GameServer {
  name: string;
}

export interface Score {
  blu: number;
  red: number;
}
