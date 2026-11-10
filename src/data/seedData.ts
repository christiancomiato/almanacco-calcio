import { Competition, DatabaseSchema, Match, Team } from '../types';

export const SERIE_A_TEAM_IDS = [
  'team-atalanta',
  'team-bologna',
  'team-cagliari',
  'team-como',
  'team-empoli',
  'team-fiorentina',
  'team-genoa',
  'team-verona',
  'team-inter',
  'team-juventus',
  'team-lazio',
  'team-lecce',
  'team-milan',
  'team-monza',
  'team-napoli',
  'team-parma',
  'team-roma',
  'team-torino',
  'team-udinese',
  'team-venezia',
];

export const INITIAL_COMPETITIONS: Competition[] = [
  {
    id: 'comp-serie-a',
    name: 'Serie A',
    shortName: 'SA',
    country: 'Italia',
    accentColor: '#0284c7',
    isFavorite: true,
    type: 'league',
    teamCount: 20,
    hasReturnLeg: true,
    season: '2026/27',
    teamIds: SERIE_A_TEAM_IDS,
  },
  {
    id: 'comp-ucl',
    name: 'UEFA Champions League',
    shortName: 'UCL',
    country: 'Europa',
    accentColor: '#1d4ed8',
    isFavorite: true,
    type: 'cup',
    teamCount: 10,
    hasReturnLeg: false,
    season: '2026/27',
    teamIds: [
      'team-inter',
      'team-milan',
      'team-juventus',
      'team-atalanta',
      'team-bologna',
      'team-realmadrid',
      'team-barcelona',
      'team-mancity',
      'team-liverpool',
      'team-bayern',
    ],
  },
  {
    id: 'comp-coppa-italia',
    name: 'Coppa Italia',
    shortName: 'CI',
    country: 'Italia',
    accentColor: '#16a34a',
    isFavorite: true,
    type: 'cup',
    teamCount: 20,
    hasReturnLeg: false,
    season: '2026/27',
    teamIds: SERIE_A_TEAM_IDS,
  },
];

export const INITIAL_TEAMS: Team[] = [
  // 20 Squadre Serie A
  {
    id: 'team-atalanta',
    name: 'Atalanta',
    shortCode: 'ATA',
    cityOrCountry: 'Bergamo',
    primaryColor: '#1E5AA8',
    secondaryColor: '#0A0A0A',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'stripes',
  },
  {
    id: 'team-bologna',
    name: 'Bologna',
    shortCode: 'BOL',
    cityOrCountry: 'Bologna',
    primaryColor: '#A21C26',
    secondaryColor: '#1A2E5A',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'stripes',
  },
  {
    id: 'team-cagliari',
    name: 'Cagliari',
    shortCode: 'CAG',
    cityOrCountry: 'Cagliari',
    primaryColor: '#A5192A',
    secondaryColor: '#0F2547',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'halves',
  },
  {
    id: 'team-como',
    name: 'Como',
    shortCode: 'COM',
    cityOrCountry: 'Como',
    primaryColor: '#005CAB',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-empoli',
    name: 'Empoli',
    shortCode: 'EMP',
    cityOrCountry: 'Empoli',
    primaryColor: '#0057B8',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-fiorentina',
    name: 'Fiorentina',
    shortCode: 'FIO',
    cityOrCountry: 'Firenze',
    primaryColor: '#5B2C83',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'solid',
  },
  {
    id: 'team-genoa',
    name: 'Genoa',
    shortCode: 'GEN',
    cityOrCountry: 'Genova',
    primaryColor: '#AD1927',
    secondaryColor: '#13294B',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'halves',
  },
  {
    id: 'team-verona',
    name: 'Hellas Verona',
    shortCode: 'VER',
    cityOrCountry: 'Verona',
    primaryColor: '#1E3A8A',
    secondaryColor: '#FACC15',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-inter',
    name: 'Inter',
    shortCode: 'INT',
    cityOrCountry: 'Milano',
    primaryColor: '#00529F',
    secondaryColor: '#0A0A0A',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'stripes',
  },
  {
    id: 'team-juventus',
    name: 'Juventus',
    shortCode: 'JUV',
    cityOrCountry: 'Torino',
    primaryColor: '#111827',
    secondaryColor: '#F8FAFC',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'stripes',
  },
  {
    id: 'team-lazio',
    name: 'Lazio',
    shortCode: 'LAZ',
    cityOrCountry: 'Roma',
    primaryColor: '#75BEE9',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'solid',
  },
  {
    id: 'team-lecce',
    name: 'Lecce',
    shortCode: 'LEC',
    cityOrCountry: 'Lecce',
    primaryColor: '#EAB308',
    secondaryColor: '#DC2626',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'stripes',
  },
  {
    id: 'team-milan',
    name: 'Milan',
    shortCode: 'MIL',
    cityOrCountry: 'Milano',
    primaryColor: '#DC052D',
    secondaryColor: '#111111',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'stripes',
  },
  {
    id: 'team-monza',
    name: 'Monza',
    shortCode: 'MON',
    cityOrCountry: 'Monza',
    primaryColor: '#E11D48',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-napoli',
    name: 'Napoli',
    shortCode: 'NAP',
    cityOrCountry: 'Napoli',
    primaryColor: '#0087D1',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'solid',
  },
  {
    id: 'team-parma',
    name: 'Parma',
    shortCode: 'PAR',
    cityOrCountry: 'Parma',
    primaryColor: '#FACC15',
    secondaryColor: '#1D4ED8',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'hoops',
  },
  {
    id: 'team-roma',
    name: 'Roma',
    shortCode: 'ROM',
    cityOrCountry: 'Roma',
    primaryColor: '#8E1F2F',
    secondaryColor: '#F0BC42',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: true,
    crestStyle: 'halves',
  },
  {
    id: 'team-torino',
    name: 'Torino',
    shortCode: 'TOR',
    cityOrCountry: 'Torino',
    primaryColor: '#8A1E24',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-udinese',
    name: 'Udinese',
    shortCode: 'UDI',
    cityOrCountry: 'Udine',
    primaryColor: '#1F2937',
    secondaryColor: '#F9FAFB',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'stripes',
  },
  {
    id: 'team-venezia',
    name: 'Venezia',
    shortCode: 'VEN',
    cityOrCountry: 'Venezia',
    primaryColor: '#EA580C',
    secondaryColor: '#15803D',
    defaultCompetitionId: 'comp-serie-a',
    isFavorite: false,
    crestStyle: 'stripes',
  },
  // Top European Clubs
  {
    id: 'team-realmadrid',
    name: 'Real Madrid',
    shortCode: 'RMA',
    cityOrCountry: 'Spagna',
    primaryColor: '#FFFFFF',
    secondaryColor: '#1D4ED8',
    defaultCompetitionId: 'comp-ucl',
    isFavorite: true,
    crestStyle: 'solid',
  },
  {
    id: 'team-barcelona',
    name: 'Barcellona',
    shortCode: 'BAR',
    cityOrCountry: 'Spagna',
    primaryColor: '#A50044',
    secondaryColor: '#004D98',
    defaultCompetitionId: 'comp-ucl',
    isFavorite: true,
    crestStyle: 'stripes',
  },
  {
    id: 'team-mancity',
    name: 'Manchester City',
    shortCode: 'MCI',
    cityOrCountry: 'Inghilterra',
    primaryColor: '#6CABDD',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-ucl',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-liverpool',
    name: 'Liverpool',
    shortCode: 'LIV',
    cityOrCountry: 'Inghilterra',
    primaryColor: '#C8102E',
    secondaryColor: '#F6EB61',
    defaultCompetitionId: 'comp-ucl',
    isFavorite: false,
    crestStyle: 'solid',
  },
  {
    id: 'team-bayern',
    name: 'Bayern Monaco',
    shortCode: 'BAY',
    cityOrCountry: 'Germania',
    primaryColor: '#DC052D',
    secondaryColor: '#FFFFFF',
    defaultCompetitionId: 'comp-ucl',
    isFavorite: false,
    crestStyle: 'solid',
  },
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'match-demo-1',
    date: '2026-11-08',
    time: '20:45',
    season: '2026/27',
    competitionId: 'comp-serie-a',
    competitionName: 'Serie A',
    stageOrMatchday: '1ª Giornata',
    matchdayNumber: 1,
    slotIndex: 0,
    status: 'PLAYED',
    homeTeamId: 'team-inter',
    homeTeamName: 'Inter',
    awayTeamId: 'team-napoli',
    awayTeamName: 'Napoli',
    homeScore: 2,
    awayScore: 1,
    homeHalfTimeScore: 1,
    awayHalfTimeScore: 1,
    stadium: 'San Siro, Milano',
    referee: 'Mariani',
    notes: 'Grande sfida scudetto a San Siro, ritmi altissimi fino al 90°.',
    rating: 5,
    createdAt: '2026-11-08T22:45:00.000Z',
    updatedAt: '2026-11-08T22:45:00.000Z',
    events: [
      {
        id: 'ev-1',
        side: 'away',
        type: 'GOAL',
        playerName: 'McTominay',
        minute: 23,
        assistPlayerName: 'Rrahmani',
        note: 'Deviazione sottomisura su calcio d’angolo',
      },
      {
        id: 'ev-2',
        side: 'home',
        type: 'GOAL',
        playerName: 'Calhanoglu',
        minute: 43,
        note: 'Gran tiro da fuori area sotto la traversa',
      },
      {
        id: 'ev-3',
        side: 'home',
        type: 'YELLOW_CARD',
        playerName: 'Dumfries',
        minute: 58,
        note: 'Trattenuta tattica',
      },
      {
        id: 'ev-4',
        side: 'home',
        type: 'PENALTY_GOAL',
        playerName: 'Lautaro Martinez',
        minute: 78,
        note: 'Rigore angolatissimo alla destra del portiere',
      },
    ],
  },
  {
    id: 'match-demo-2',
    date: '2026-11-07',
    time: '20:45',
    season: '2026/27',
    competitionId: 'comp-serie-a',
    competitionName: 'Serie A',
    stageOrMatchday: '1ª Giornata',
    matchdayNumber: 1,
    slotIndex: 1,
    status: 'PLAYED',
    homeTeamId: 'team-juventus',
    homeTeamName: 'Juventus',
    awayTeamId: 'team-torino',
    awayTeamName: 'Torino',
    homeScore: 2,
    awayScore: 0,
    homeHalfTimeScore: 1,
    awayHalfTimeScore: 0,
    stadium: 'Allianz Stadium, Torino',
    notes: 'Derby della Mole controllato dai bianconeri.',
    rating: 4,
    createdAt: '2026-11-07T22:40:00.000Z',
    updatedAt: '2026-11-07T22:40:00.000Z',
    events: [
      {
        id: 'ev-5',
        side: 'home',
        type: 'GOAL',
        playerName: 'Weah',
        minute: 18,
        assistPlayerName: 'Cambiaso',
        note: 'Tap-in dopo grande discesa sulla fascia',
      },
      {
        id: 'ev-6',
        side: 'away',
        type: 'YELLOW_CARD',
        playerName: 'Ricci',
        minute: 61,
      },
      {
        id: 'ev-7',
        side: 'home',
        type: 'GOAL',
        playerName: 'Yildiz',
        minute: 84,
        assistPlayerName: 'Conceição',
        note: 'Colpo di testa in tuffo sul secondo palo',
      },
    ],
  },
];

export const DEFAULT_DATABASE: DatabaseSchema = {
  version: 2,
  lastSavedAt: new Date().toISOString(),
  settings: {
    theme: 'light',
    fontScale: 'normal',
    defaultSeason: '2026/27',
    defaultCompetitionId: 'comp-serie-a',
    autoSyncScoreFromGoals: true,
    autoFetchLogosOnline: true,
  },
  competitions: INITIAL_COMPETITIONS,
  teams: INITIAL_TEAMS,
  matches: [],
};

export const KNOWN_CLUB_STADIUMS: Record<string, string> = {
  'team-inter': 'San Siro (Giuseppe Meazza), Milano',
  'team-milan': 'San Siro (Giuseppe Meazza), Milano',
  'team-juventus': 'Allianz Stadium, Torino',
  'team-napoli': 'Stadio Diego Armando Maradona, Napoli',
  'team-roma': 'Stadio Olimpico, Roma',
  'team-lazio': 'Stadio Olimpico, Roma',
  'team-atalanta': 'Gewiss Stadium, Bergamo',
  'team-fiorentina': 'Stadio Artemio Franchi, Firenze',
  'team-bologna': "Stadio Renato Dall'Ara, Bologna",
  'team-torino': 'Stadio Olimpico Grande Torino',
  'team-udinese': 'Bluenergy Stadium, Udine',
  'team-genoa': 'Stadio Luigi Ferraris, Genova',
  'team-verona': 'Stadio Marcantonio Bentegodi, Verona',
  'team-cagliari': 'Unipol Domus, Cagliari',
  'team-lecce': 'Stadio Via del Mare, Lecce',
  'team-empoli': 'Stadio Carlo Castellani, Empoli',
  'team-parma': 'Stadio Ennio Tardini, Parma',
  'team-como': 'Stadio Giuseppe Sinigaglia, Como',
  'team-monza': 'U-Power Stadium, Monza',
  'team-venezia': 'Stadio Pier Luigi Penzo, Venezia',
  'team-realmadrid': 'Santiago Bernabéu, Madrid',
  'team-barcelona': 'Estadi Olímpic / Camp Nou, Barcellona',
  'team-mancity': 'Etihad Stadium, Manchester',
  'team-liverpool': 'Anfield, Liverpool',
  'team-bayern': 'Allianz Arena, Monaco',
  'team-psg': 'Parco dei Principi, Parigi',
  'team-arsenal': 'Emirates Stadium, Londra',
};

/**
 * Returns the remembered or known home stadium for a given home team.
 * Priority:
 * 1) Explicit `team.stadium` saved on the Team object
 * 2) Most recent home match of this team that had a non-empty `stadium`
 * 3) Built-in known stadiums catalog (`KNOWN_CLUB_STADIUMS`)
 */
export function getTeamHomeStadium(
  homeTeamId: string,
  allTeams: Team[],
  allMatches: Match[]
): string {
  if (!homeTeamId) return '';
  const team = allTeams.find((t) => t.id === homeTeamId);
  if (team?.stadium && team.stadium.trim()) {
    return team.stadium.trim();
  }

  // Search previous home matches for this team
  for (const m of allMatches) {
    if (m.homeTeamId === homeTeamId && m.stadium && m.stadium.trim()) {
      return m.stadium.trim();
    }
  }

  if (KNOWN_CLUB_STADIUMS[homeTeamId]) {
    return KNOWN_CLUB_STADIUMS[homeTeamId];
  }

  return '';
}

/**
 * Returns ONLY the teams enrolled in the given competition, sorted alphabetically.
 */
export function getTeamsForCompetition(
  competitionId: string,
  competitions: Competition[],
  allTeams: Team[]
): Team[] {
  const comp = competitions.find((c) => c.id === competitionId);
  if (!comp) return [...allTeams].sort((a, b) => a.name.localeCompare(b.name));

  // When comp.teamIds is explicitly configured, strictly use those teams!
  if (Array.isArray(comp.teamIds) && comp.teamIds.length > 0) {
    const enrolledIds = new Set<string>(comp.teamIds);
    return allTeams
      .filter((t) => enrolledIds.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const filtered = allTeams.filter(
    (t) => t.defaultCompetitionId === competitionId
  );

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}
