export type EventType =
  | 'GOAL'
  | 'PENALTY_GOAL'
  | 'OWN_GOAL'
  | 'FREE_KICK_GOAL'
  | 'PENALTY_MISS'
  | 'YELLOW_CARD'
  | 'SECOND_YELLOW_RED'
  | 'RED_CARD';

export type TeamSide = 'home' | 'away';

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  country: string;
  accentColor: string;
  logoUrl?: string; // Cached data URL or remote URL
  isFavorite?: boolean;
  type?: 'league' | 'cup' | 'international';
}

export interface Team {
  id: string;
  name: string;
  shortCode: string; // e.g. INT, MIL, JUV
  cityOrCountry?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string; // Cached data URL or remote URL
  defaultCompetitionId?: string;
  isFavorite?: boolean;
  crestStyle?: 'stripes' | 'halves' | 'solid' | 'hoops' | 'diagonal';
}

export interface MatchEvent {
  id: string;
  side: TeamSide;
  type: EventType;
  playerName: string;
  minute: number;
  stoppageMinute?: number;
  assistPlayerName?: string;
  note?: string;
}

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm optional
  season: string; // e.g. "2026/27"
  competitionId: string;
  competitionName: string;
  stageOrMatchday: string; // e.g. "12ª Giornata", "Finale", "Ottavi"
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeHalfTimeScore?: number;
  awayHalfTimeScore?: number;
  events: MatchEvent[];
  stadium?: string;
  referee?: string;
  notes?: string;
  rating?: number; // 1-5 stars
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontScale: 'normal' | 'large';
  defaultSeason: string;
  defaultCompetitionId: string;
  autoSyncScoreFromGoals: boolean;
  autoFetchLogosOnline: boolean;
}

export interface DatabaseSchema {
  version: number;
  lastSavedAt: string;
  settings: AppSettings;
  competitions: Competition[];
  teams: Team[];
  matches: Match[];
}

export interface OnlineLogoSearchResult {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  dataUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  source: 'TheSportsDB' | 'Wikipedia' | 'Catalog';
}

export interface StorageInfo {
  dbPath: string;
  backupDirPath: string;
  documentsMirrorPath: string;
  lastSavedAt: string;
  totalMatches: number;
  totalTeams: number;
  totalCompetitions: number;
  backupCount: number;
}
