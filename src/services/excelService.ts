import * as XLSX from 'xlsx';
import { DatabaseSchema, EventType, Match, MatchEvent, Team } from '../types';

export function formatEventLabelIt(type: EventType): string {
  switch (type) {
    case 'GOAL':
      return 'Gol';
    case 'PENALTY_GOAL':
      return 'Rigore (R)';
    case 'OWN_GOAL':
      return 'Autogol (AG)';
    case 'FREE_KICK_GOAL':
      return 'Punizione (Pun)';
    case 'PENALTY_MISS':
      return 'Rigore Sbagliato';
    case 'YELLOW_CARD':
      return 'Ammonizione (Giallo)';
    case 'SECOND_YELLOW_RED':
      return 'Espulsione (Doppio Giallo)';
    case 'RED_CARD':
      return 'Espulsione (Rosso Diretto)';
    default:
      return type;
  }
}

export function formatEventShortBadgeIt(type: EventType): string {
  switch (type) {
    case 'GOAL':
      return '';
    case 'PENALTY_GOAL':
      return '(R)';
    case 'OWN_GOAL':
      return '(AG)';
    case 'FREE_KICK_GOAL':
      return '(Pun)';
    case 'PENALTY_MISS':
      return '(Rig. Sbagliato)';
    case 'YELLOW_CARD':
      return '[Giallo]';
    case 'SECOND_YELLOW_RED':
      return '[2° Giallo/Rosso]';
    case 'RED_CARD':
      return '[Rosso]';
    default:
      return '';
  }
}

export function formatMinute(ev: MatchEvent): string {
  if (ev.stoppageMinute && ev.stoppageMinute > 0) {
    return `${ev.minute}+${ev.stoppageMinute}'`;
  }
  return `${ev.minute}'`;
}

export function summarizeSideGoals(events: MatchEvent[], side: 'home' | 'away'): string {
  const goals = events
    .filter(
      (e) =>
        e.side === side &&
        (e.type === 'GOAL' ||
          e.type === 'PENALTY_GOAL' ||
          e.type === 'OWN_GOAL' ||
          e.type === 'FREE_KICK_GOAL')
    )
    .sort((a, b) => a.minute - b.minute);

  return goals
    .map((g) => {
      const tag = formatEventShortBadgeIt(g.type);
      const notePart = g.note ? ` [${g.note}]` : '';
      return `${formatMinute(g)} ${g.playerName}${tag ? ' ' + tag : ''}${notePart}`;
    })
    .join('; ');
}

export function summarizeCardsAndPenMisses(events: MatchEvent[]): string {
  const others = events
    .filter(
      (e) =>
        e.type === 'YELLOW_CARD' ||
        e.type === 'SECOND_YELLOW_RED' ||
        e.type === 'RED_CARD' ||
        e.type === 'PENALTY_MISS'
    )
    .sort((a, b) => a.minute - b.minute);

  return others
    .map((e) => `${formatMinute(e)} ${e.playerName} ${formatEventShortBadgeIt(e.type)}`)
    .join('; ');
}

export async function exportToExcelWorkbook(
  db: DatabaseSchema
): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Partite
  const matchesSorted = [...db.matches].sort((a, b) => b.date.localeCompare(a.date));
  const matchRows = matchesSorted.map((m) => ({
    Data: m.date,
    Ora: m.time || '',
    Stagione: m.season,
    Competizione: m.competitionName,
    'Giornata / Turno': m.stageOrMatchday || '',
    'Squadra Casa': m.homeTeamName,
    'Gol Casa': m.homeScore,
    'Gol Ospite': m.awayScore,
    'Squadra Ospite': m.awayTeamName,
    Risultato: `${m.homeScore}-${m.awayScore}`,
    'Risultato 1° Tempo':
      m.homeHalfTimeScore !== undefined && m.awayHalfTimeScore !== undefined
        ? `${m.homeHalfTimeScore}-${m.awayHalfTimeScore}`
        : '',
    'Marcatori Casa': summarizeSideGoals(m.events, 'home'),
    'Marcatori Ospite': summarizeSideGoals(m.events, 'away'),
    'Cartellini e Rigori Sbagliati': summarizeCardsAndPenMisses(m.events),
    Stadio: m.stadium || '',
    Arbitro: m.referee || '',
    'Valutazione (1-5)': m.rating || '',
    Note: m.notes || '',
  }));

  const wsMatches = XLSX.utils.json_to_sheet(
    matchRows.length > 0
      ? matchRows
      : [
          {
            Data: '2026-11-08',
            Stagione: '2026/27',
            Competizione: 'Serie A',
            'Giornata / Turno': '1ª Giornata',
            'Squadra Casa': 'Squadra A',
            'Gol Casa': 0,
            'Gol Ospite': 0,
            'Squadra Ospite': 'Squadra B',
            Risultato: '0-0',
            'Marcatori Casa': '',
            'Marcatori Ospite': '',
            Note: '',
          },
        ]
  );
  wsMatches['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 36 },
    { wch: 36 },
    { wch: 32 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMatches, 'Partite');

  // 2. Sheet: Dettaglio Gol e Cartellini
  const eventRows: Record<string, unknown>[] = [];
  for (const m of matchesSorted) {
    const sortedEvs = [...m.events].sort((a, b) => a.minute - b.minute);
    for (const ev of sortedEvs) {
      const teamName = ev.side === 'home' ? m.homeTeamName : m.awayTeamName;
      const opponentName = ev.side === 'home' ? m.awayTeamName : m.homeTeamName;
      eventRows.push({
        Data: m.date,
        Stagione: m.season,
        Competizione: m.competitionName,
        Partita: `${m.homeTeamName} ${m.homeScore}-${m.awayScore} ${m.awayTeamName}`,
        Squadra: teamName,
        Avversario: opponentName,
        Giocatore: ev.playerName,
        Minuto: formatMinute(ev),
        'Tipo Evento': formatEventLabelIt(ev.type),
        Assist: ev.assistPlayerName || '',
        'Note Evento': ev.note || '',
      });
    }
  }
  const wsEvents = XLSX.utils.json_to_sheet(
    eventRows.length > 0
      ? eventRows
      : [
          {
            Data: '',
            Competizione: '',
            Partita: '',
            Squadra: '',
            Giocatore: '',
            Minuto: '',
            'Tipo Evento': '',
            Assist: '',
            'Note Evento': '',
          },
        ]
  );
  wsEvents['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Gol e Cartellini');

  // 3. Sheet: Classifica Marcatori
  const scorerMap = new Map<
    string,
    {
      playerName: string;
      teamName: string;
      goals: number;
      openPlayGoals: number;
      penalties: number;
      freeKicks: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }
  >();

  for (const m of db.matches) {
    for (const ev of m.events) {
      const teamName = ev.side === 'home' ? m.homeTeamName : m.awayTeamName;
      const key = `${ev.playerName.trim().toLowerCase()}__${teamName.toLowerCase()}`;
      if (!scorerMap.has(key)) {
        scorerMap.set(key, {
          playerName: ev.playerName.trim(),
          teamName,
          goals: 0,
          openPlayGoals: 0,
          penalties: 0,
          freeKicks: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        });
      }
      const stat = scorerMap.get(key)!;
      if (ev.type === 'GOAL') {
        stat.goals += 1;
        stat.openPlayGoals += 1;
      } else if (ev.type === 'PENALTY_GOAL') {
        stat.goals += 1;
        stat.penalties += 1;
      } else if (ev.type === 'FREE_KICK_GOAL') {
        stat.goals += 1;
        stat.freeKicks += 1;
      } else if (ev.type === 'YELLOW_CARD') {
        stat.yellowCards += 1;
      } else if (ev.type === 'RED_CARD' || ev.type === 'SECOND_YELLOW_RED') {
        stat.redCards += 1;
      }

      if (ev.assistPlayerName && ev.assistPlayerName.trim()) {
        const assistKey = `${ev.assistPlayerName.trim().toLowerCase()}__${teamName.toLowerCase()}`;
        if (!scorerMap.has(assistKey)) {
          scorerMap.set(assistKey, {
            playerName: ev.assistPlayerName.trim(),
            teamName,
            goals: 0,
            openPlayGoals: 0,
            penalties: 0,
            freeKicks: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
          });
        }
        scorerMap.get(assistKey)!.assists += 1;
      }
    }
  }

  const scorerRows = Array.from(scorerMap.values())
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .map((s, idx) => ({
      Pos: idx + 1,
      Giocatore: s.playerName,
      Squadra: s.teamName,
      'Gol Totali': s.goals,
      'Gol su Azione': s.openPlayGoals,
      Rigori: s.penalties,
      Punizioni: s.freeKicks,
      Assist: s.assists,
      Ammonizioni: s.yellowCards,
      Espulsioni: s.redCards,
    }));

  const wsScorers = XLSX.utils.json_to_sheet(
    scorerRows.length > 0
      ? scorerRows
      : [
          {
            Pos: 1,
            Giocatore: '',
            Squadra: '',
            'Gol Totali': 0,
            'Gol su Azione': 0,
            Rigori: 0,
            Punizioni: 0,
            Assist: 0,
            Ammonizioni: 0,
            Espulsioni: 0,
          },
        ]
  );
  wsScorers['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsScorers, 'Classifica Marcatori');

  const today = new Date().toISOString().slice(0, 10);
  const defaultFileName = `Almanacco_Calcio_${today}.xlsx`;

  if (window.electronAPI) {
    const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return await window.electronAPI.saveFileDialog({
      defaultFileName,
      filters: [{ name: 'Cartella di lavoro Excel (*.xlsx)', extensions: ['xlsx'] }],
      dataBase64: base64Data,
    });
  } else {
    XLSX.writeFile(wb, defaultFileName);
    return { success: true, filePath: defaultFileName };
  }
}

export async function exportToCsvFile(
  db: DatabaseSchema
): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> {
  const matchesSorted = [...db.matches].sort((a, b) => b.date.localeCompare(a.date));
  const rows = matchesSorted.map((m) => ({
    Data: m.date,
    Stagione: m.season,
    Competizione: m.competitionName,
    Giornata: m.stageOrMatchday || '',
    Squadra_Casa: m.homeTeamName,
    Gol_Casa: m.homeScore,
    Gol_Ospite: m.awayScore,
    Squadra_Ospite: m.awayTeamName,
    Marcatori_Casa: summarizeSideGoals(m.events, 'home'),
    Marcatori_Ospite: summarizeSideGoals(m.events, 'away'),
    Cartellini: summarizeCardsAndPenMisses(m.events),
    Note: m.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csvContent = '\uFEFF' + XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const today = new Date().toISOString().slice(0, 10);
  const defaultFileName = `Almanacco_Calcio_${today}.csv`;

  if (window.electronAPI) {
    return await window.electronAPI.saveFileDialog({
      defaultFileName,
      filters: [{ name: 'File CSV per Excel (*.csv)', extensions: ['csv'] }],
      textContent: csvContent,
    });
  } else {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, filePath: defaultFileName };
  }
}

export async function exportJsonBackupFile(
  db: DatabaseSchema
): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> {
  const serialized = JSON.stringify(db, null, 2);
  const today = new Date().toISOString().slice(0, 10);
  const defaultFileName = `Almanacco_Calcio_Backup_${today}.json`;

  if (window.electronAPI) {
    return await window.electronAPI.saveFileDialog({
      defaultFileName,
      filters: [{ name: 'Backup Completo Almanacco (*.json)', extensions: ['json'] }],
      textContent: serialized,
    });
  } else {
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, filePath: defaultFileName };
  }
}

// Parse scorers string like "23' McTominay; 78' Lautaro Martinez (R)" or "Lautaro 23', Calhanoglu 43'"
function parseScorersString(raw: string, side: 'home' | 'away'): MatchEvent[] {
  if (!raw || !raw.trim()) return [];
  const events: MatchEvent[] = [];
  const parts = raw
    .split(/[;,\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    let type: EventType = 'GOAL';
    if (/\(R\)|\(P\)|rigore|pen/i.test(part)) {
      type = 'PENALTY_GOAL';
    } else if (/\(AG\)|\(OG\)|autogol/i.test(part)) {
      type = 'OWN_GOAL';
    } else if (/\(Pun\)|\(FK\)|punizione/i.test(part)) {
      type = 'FREE_KICK_GOAL';
    }

    const minMatch = part.match(/(\d{1,3})(?:\+(\d{1,2}))?\s*['°]?/);
    const minute = minMatch ? Math.min(120, Math.max(1, parseInt(minMatch[1], 10))) : 45;
    const stoppage = minMatch && minMatch[2] ? parseInt(minMatch[2], 10) : undefined;

    let playerName = part
      .replace(/(\d{1,3})(?:\+(\d{1,2}))?\s*['°]?/g, '')
      .replace(/\((R|P|AG|OG|Pun|FK)\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    if (!playerName) playerName = 'Marcatore';

    events.push({
      id: `ev-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      side,
      type,
      playerName,
      minute,
      stoppageMinute: stoppage,
    });
  }
  return events;
}

export async function importBackupOrExcel(
  currentDb: DatabaseSchema
): Promise<{
  success: boolean;
  canceled?: boolean;
  updatedDb?: DatabaseSchema;
  importedMatchesCount?: number;
  message?: string;
  error?: string;
}> {
  let fileName = '';
  let base64Data = '';

  if (window.electronAPI) {
    const res = await window.electronAPI.openFileDialog({
      filters: [
        {
          name: 'Backup o Fogli Excel (*.json, *.xlsx, *.xls, *.csv)',
          extensions: ['json', 'xlsx', 'xls', 'csv'],
        },
      ],
    });
    if (res.canceled || !res.success || !res.dataBase64) {
      return { success: false, canceled: true };
    }
    fileName = res.fileName || '';
    base64Data = res.dataBase64;
  } else {
    const picked = await new Promise<{ name: string; base64: string } | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.xlsx,.xls,.csv';
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const b64 = result.includes(',') ? result.split(',')[1] : '';
          resolve({ name: f.name, base64: b64 });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(f);
      };
      input.click();
    });
    if (!picked) return { success: false, canceled: true };
    fileName = picked.name;
    base64Data = picked.base64;
  }

  try {
    const lowerName = fileName.toLowerCase();

    // Case 1: Full JSON Backup
    if (lowerName.endsWith('.json')) {
      const binaryStr = atob(base64Data);
      const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
      const jsonText = new TextDecoder('utf-8').decode(bytes);
      const parsed = JSON.parse(jsonText);

      if (parsed && Array.isArray(parsed.matches) && Array.isArray(parsed.teams)) {
        return {
          success: true,
          updatedDb: parsed,
          importedMatchesCount: parsed.matches.length,
          message: `Backup ripristinato con successo (${parsed.matches.length} partite, ${parsed.teams.length} squadre).`,
        };
      }
      return {
        success: false,
        error: 'Il file JSON non sembra essere un backup valido di Almanacco Calcio.',
      };
    }

    // Case 2: Excel (.xlsx / .xls) or CSV (.csv)
    const wb = XLSX.read(base64Data, { type: 'base64', cellDates: true });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) {
      return { success: false, error: 'Il foglio Excel/CSV selezionato è vuoto.' };
    }

    const updatedTeams: Team[] = [...currentDb.teams];
    const updatedCompetitions = [...currentDb.competitions];
    const newMatches: Match[] = [];

    const findOrCreateTeam = (rawName: string): Team => {
      const cleanName = String(rawName || 'Squadra').trim();
      const existing = updatedTeams.find((t) => t.name.toLowerCase() === cleanName.toLowerCase());
      if (existing) return existing;

      const palette = ['#0284c7', '#dc2626', '#16a34a', '#7c3aed', '#ea580c', '#0f172a'];
      const color = palette[updatedTeams.length % palette.length];
      const created: Team = {
        id: `team-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        shortCode: cleanName.slice(0, 3).toUpperCase(),
        primaryColor: color,
        secondaryColor: '#ffffff',
        crestStyle: 'stripes',
      };
      updatedTeams.push(created);
      return created;
    };

    const findOrCreateCompetition = (rawComp: string) => {
      const cleanComp = String(rawComp || 'Serie A').trim() || 'Serie A';
      const existing = updatedCompetitions.find(
        (c) => c.name.toLowerCase() === cleanComp.toLowerCase()
      );
      if (existing) return existing;
      const created = {
        id: `comp-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanComp,
        shortName: cleanComp.slice(0, 3).toUpperCase(),
        country: 'Italia',
        accentColor: '#0284c7',
      };
      updatedCompetitions.push(created);
      return created;
    };

    for (const row of rows) {
      // Flexible header matching (Italian & English)
      const getField = (candidates: string[]): any => {
        for (const key of Object.keys(row)) {
          const normKey = key.trim().toLowerCase().replace(/_/g, ' ');
          if (candidates.some((c) => normKey === c || normKey.includes(c))) {
            return row[key];
          }
        }
        return '';
      };

      const homeName = String(
        getField(['squadra casa', 'casa', 'home team', 'home', 'squadra 1'])
      ).trim();
      const awayName = String(
        getField(['squadra ospite', 'ospite', 'fuori', 'away team', 'away', 'squadra 2'])
      ).trim();

      if (!homeName || !awayName) continue;

      let homeScore = 0;
      let awayScore = 0;
      const rawScore = String(getField(['risultato', 'score', 'finale', 'result'])).trim();
      const rawHomeGoals = getField(['gol casa', 'reti casa', 'home score', 'home goals']);
      const rawAwayGoals = getField(['gol ospite', 'reti ospite', 'away score', 'away goals']);

      if (rawHomeGoals !== '' && rawAwayGoals !== '') {
        homeScore = parseInt(String(rawHomeGoals), 10) || 0;
        awayScore = parseInt(String(rawAwayGoals), 10) || 0;
      } else if (rawScore.includes('-')) {
        const [h, a] = rawScore.split('-').map((s) => parseInt(s.trim(), 10) || 0);
        homeScore = h;
        awayScore = a;
      }

      let dateStr = new Date().toISOString().slice(0, 10);
      const rawDate = getField(['data', 'date', 'giorno']);
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        dateStr = rawDate.toISOString().slice(0, 10);
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        const s = rawDate.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
          dateStr = s.slice(0, 10);
        } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s)) {
          const [d, m, y] = s.split(/[\/\-]/);
          const fullYear = y.length === 2 ? `20${y}` : y;
          dateStr = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      const compObj = findOrCreateCompetition(
        getField(['competizione', 'campionato', 'torneo', 'competition', 'league'])
      );
      const homeTeam = findOrCreateTeam(homeName);
      const awayTeam = findOrCreateTeam(awayName);

      const homeScorersRaw = String(getField(['marcatori casa', 'home scorers', 'gol casa nomi']));
      const awayScorersRaw = String(
        getField(['marcatori ospite', 'away scorers', 'gol ospite nomi'])
      );
      const genericScorersRaw = String(getField(['marcatori', 'scorers']));

      const events: MatchEvent[] = [
        ...parseScorersString(homeScorersRaw, 'home'),
        ...parseScorersString(awayScorersRaw, 'away'),
      ];
      if (events.length === 0 && genericScorersRaw) {
        events.push(...parseScorersString(genericScorersRaw, 'home'));
      }

      newMatches.push({
        id: `match-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: dateStr,
        season: String(getField(['stagione', 'season']) || currentDb.settings.defaultSeason),
        competitionId: compObj.id,
        competitionName: compObj.name,
        stageOrMatchday: String(getField(['giornata', 'turno', 'matchday']) || ''),
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.name,
        homeScore,
        awayScore,
        events,
        notes: String(getField(['note', 'notes', 'commento']) || ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (newMatches.length === 0) {
      return {
        success: false,
        error:
          'Nessuna partita trovata. Assicurati che il foglio Excel abbia colonne come "Squadra Casa", "Squadra Ospite", "Gol Casa", "Gol Ospite" (o "Risultato").',
      };
    }

    const updatedDb: DatabaseSchema = {
      ...currentDb,
      competitions: updatedCompetitions,
      teams: updatedTeams,
      matches: [...newMatches, ...currentDb.matches],
      lastSavedAt: new Date().toISOString(),
    };

    return {
      success: true,
      updatedDb,
      importedMatchesCount: newMatches.length,
      message: `Importate con successo ${newMatches.length} partite dal foglio Excel/CSV!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Errore durante l’importazione del file.',
    };
  }
}
