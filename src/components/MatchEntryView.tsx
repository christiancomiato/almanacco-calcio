import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Globe,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  UserCheck,
} from 'lucide-react';
import {
  Competition,
  EventType,
  Match,
  MatchEvent,
  Team,
  TeamSide,
} from '../types';
import { getTeamsForCompetition } from '../data/seedData';
import { CompetitionBadge, TeamCrest } from './TeamCrest';
import { OnlineLogoModal } from './OnlineLogoModal';

interface MatchEntryViewProps {
  competitions: Competition[];
  teams: Team[];
  matches: Match[];
  defaultSeason: string;
  defaultCompetitionId: string;
  autoSyncScoreDefault: boolean;
  editingMatch: Match | null;
  onSaveMatch: (
    match: Match,
    newTeams?: Team[],
    newCompetition?: Competition
  ) => void;
  onUpdateTeamLogo: (
    teamId: string,
    logoUrl: string,
    colors?: { primary?: string; secondary?: string }
  ) => void;
  onUpdateCompetitionLogo: (compId: string, logoUrl: string) => void;
  onOpenNewCompetitionWizard: () => void;
  onCancelEdit: () => void;
}

const CUP_STAGES = [
  'Fase a Gironi',
  'Fase Campionato',
  'Sedicesimi di Finale',
  'Ottavi di Finale - Andata',
  'Ottavi di Finale - Ritorno',
  'Ottavi di Finale',
  'Quarti di Finale - Andata',
  'Quarti di Finale - Ritorno',
  'Quarti di Finale',
  'Semifinale - Andata',
  'Semifinale - Ritorno',
  'Semifinale',
  'Finale',
  'Amichevole',
];

const SEASONS_LIST = [
  '2026/27',
  '2025/26',
  '2024/25',
  '2023/24',
  '2022/23',
  '2021/22',
  '2020/21',
];

export const MatchEntryView: React.FC<MatchEntryViewProps> = ({
  competitions,
  teams,
  matches,
  defaultSeason,
  defaultCompetitionId,
  autoSyncScoreDefault,
  editingMatch,
  onSaveMatch,
  onUpdateTeamLogo,
  onUpdateCompetitionLogo,
  onOpenNewCompetitionWizard,
  onCancelEdit,
}) => {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState('20:45');
  const [season, setSeason] = useState(defaultSeason || '2026/27');
  const [competitionId, setCompetitionId] = useState(
    defaultCompetitionId || competitions[0]?.id || ''
  );

  const [stageOrMatchday, setStageOrMatchday] = useState('1ª Giornata');

  // Start EMPTY when creating a new match so it never forces Inter vs Milan!
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');

  const [isCreatingHomeTeam, setIsCreatingHomeTeam] = useState(false);
  const [newHomeTeamName, setNewHomeTeamName] = useState('');
  const [newHomePrimary, setNewHomePrimary] = useState('#0284c7');
  const [newHomeSecondary, setNewHomeSecondary] = useState('#ffffff');

  const [isCreatingAwayTeam, setIsCreatingAwayTeam] = useState(false);
  const [newAwayTeamName, setNewAwayTeamName] = useState('');
  const [newAwayPrimary, setNewAwayPrimary] = useState('#dc2626');
  const [newAwaySecondary, setNewAwaySecondary] = useState('#111827');

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeHalfTimeScore, setHomeHalfTimeScore] = useState<string>('');
  const [awayHalfTimeScore, setAwayHalfTimeScore] = useState<string>('');
  const [autoSyncScore, setAutoSyncScore] = useState(autoSyncScoreDefault);

  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stadium, setStadium] = useState('');
  const [referee, setReferee] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(0);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [logoModalTarget, setLogoModalTarget] = useState<{
    kind: 'team' | 'competition';
    id: string;
    name: string;
    currentLogoUrl?: string;
  } | null>(null);

  // Populate form when editing an existing match
  useEffect(() => {
    if (editingMatch) {
      setDate(editingMatch.date);
      setTime(editingMatch.time || '20:45');
      setSeason(editingMatch.season);
      setCompetitionId(editingMatch.competitionId);
      setStageOrMatchday(editingMatch.stageOrMatchday || '1ª Giornata');
      setHomeTeamId(editingMatch.homeTeamId);
      setAwayTeamId(editingMatch.awayTeamId);
      setHomeScore(editingMatch.homeScore);
      setAwayScore(editingMatch.awayScore);
      setHomeHalfTimeScore(
        editingMatch.homeHalfTimeScore !== undefined
          ? String(editingMatch.homeHalfTimeScore)
          : ''
      );
      setAwayHalfTimeScore(
        editingMatch.awayHalfTimeScore !== undefined
          ? String(editingMatch.awayHalfTimeScore)
          : ''
      );
      setEvents(editingMatch.events.map((e) => ({ ...e })));
      setStadium(editingMatch.stadium || '');
      setReferee(editingMatch.referee || '');
      setNotes(editingMatch.notes || '');
      setRating(editingMatch.rating || 0);
      setIsCreatingHomeTeam(false);
      setIsCreatingAwayTeam(false);
    } else {
      setHomeTeamId('');
      setAwayTeamId('');
    }
  }, [editingMatch]);

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === competitionId),
    [competitions, competitionId]
  );

  // Strictly filter teams enrolled in the selected competition
  const competitionTeams = useMemo(() => {
    return getTeamsForCompetition(competitionId, competitions, teams);
  }, [competitionId, competitions, teams]);

  // Dynamic matchday options based on the competition's team count
  const matchdayOptions = useMemo(() => {
    const count =
      selectedCompetition?.teamCount || competitionTeams.length || 20;
    const evenCount = count % 2 === 0 ? count : count + 1;
    const andata = Math.max(1, evenCount - 1);
    const total =
      selectedCompetition?.hasReturnLeg !== false ? andata * 2 : andata;
    const numbered = Array.from(
      { length: total },
      (_, i) => `${i + 1}ª Giornata`
    );
    return [...numbered, ...CUP_STAGES];
  }, [selectedCompetition, competitionTeams.length]);

  const handleCompetitionChange = (newCompId: string) => {
    setCompetitionId(newCompId);
    const nextTeams = getTeamsForCompetition(newCompId, competitions, teams);
    const nextIds = new Set(nextTeams.map((t) => t.id));
    if (!nextIds.has(homeTeamId)) setHomeTeamId('');
    if (!nextIds.has(awayTeamId)) setAwayTeamId('');
  };

  const selectedHomeTeam = useMemo(
    () => teams.find((t) => t.id === homeTeamId),
    [teams, homeTeamId]
  );

  const selectedAwayTeam = useMemo(
    () => teams.find((t) => t.id === awayTeamId),
    [teams, awayTeamId]
  );

  // Build player autocomplete lists from historical matches
  const homePlayerSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      for (const ev of m.events) {
        const eventTeamId = ev.side === 'home' ? m.homeTeamId : m.awayTeamId;
        if (eventTeamId === homeTeamId && ev.playerName.trim()) {
          set.add(ev.playerName.trim());
        }
        if (eventTeamId === homeTeamId && ev.assistPlayerName?.trim()) {
          set.add(ev.assistPlayerName.trim());
        }
      }
    }
    for (const m of matches) {
      for (const ev of m.events) {
        if (ev.playerName.trim()) set.add(ev.playerName.trim());
      }
    }
    return Array.from(set);
  }, [matches, homeTeamId]);

  const awayPlayerSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      for (const ev of m.events) {
        const eventTeamId = ev.side === 'home' ? m.homeTeamId : m.awayTeamId;
        if (eventTeamId === awayTeamId && ev.playerName.trim()) {
          set.add(ev.playerName.trim());
        }
        if (eventTeamId === awayTeamId && ev.assistPlayerName?.trim()) {
          set.add(ev.assistPlayerName.trim());
        }
      }
    }
    for (const m of matches) {
      for (const ev of m.events) {
        if (ev.playerName.trim()) set.add(ev.playerName.trim());
      }
    }
    return Array.from(set);
  }, [matches, awayTeamId]);

  const recalculateScoresFromEvents = (updatedEvents: MatchEvent[]) => {
    if (!autoSyncScore) return;
    let h = 0;
    let a = 0;
    for (const ev of updatedEvents) {
      const isGoalType =
        ev.type === 'GOAL' ||
        ev.type === 'PENALTY_GOAL' ||
        ev.type === 'OWN_GOAL' ||
        ev.type === 'FREE_KICK_GOAL';
      if (!isGoalType) continue;
      if (ev.side === 'home') {
        h += 1;
      } else {
        a += 1;
      }
    }
    setHomeScore(h);
    setAwayScore(a);
  };

  // Start minute at 0 (empty input!) so typing any minute like 23' or 89' never requires deleting a pre-filled '1'!
  const handleAddEvent = (side: TeamSide, type: EventType) => {
    const newEv: MatchEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      side,
      type,
      playerName: '',
      minute: 0,
      assistPlayerName: '',
      note: '',
    };
    const next = [...events, newEv];
    setEvents(next);
    recalculateScoresFromEvents(next);
  };

  const handleUpdateEvent = (id: string, patch: Partial<MatchEvent>) => {
    const next = events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev));
    setEvents(next);
    if (patch.type || patch.side) {
      recalculateScoresFromEvents(next);
    }
  };

  const handleRemoveEvent = (id: string) => {
    const next = events.filter((ev) => ev.id !== id);
    setEvents(next);
    recalculateScoresFromEvents(next);
  };

  const stepDateByDays = (deltaDays: number) => {
    const d = new Date(date + 'T12:00:00');
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + deltaDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const handleSwapTeams = () => {
    const prevHomeId = homeTeamId;
    const prevAwayId = awayTeamId;
    setHomeTeamId(prevAwayId);
    setAwayTeamId(prevHomeId);

    const prevHScore = homeScore;
    const prevAScore = awayScore;
    setHomeScore(prevAScore);
    setAwayScore(prevHScore);

    const prevHHT = homeHalfTimeScore;
    const prevAHT = awayHalfTimeScore;
    setHomeHalfTimeScore(prevAHT);
    setAwayHalfTimeScore(prevHHT);

    setEvents((prev) =>
      prev.map((ev) => ({
        ...ev,
        side: ev.side === 'home' ? 'away' : 'home',
      }))
    );
  };

  const handleResetForm = () => {
    setEvents([]);
    setHomeTeamId('');
    setAwayTeamId('');
    setHomeScore(0);
    setAwayScore(0);
    setHomeHalfTimeScore('');
    setAwayHalfTimeScore('');
    setNotes('');
    setStadium('');
    setReferee('');
    setRating(0);
    setValidationError(null);
    if (editingMatch) {
      onCancelEdit();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const createdTeams: Team[] = [];
    const finalCompId = competitionId;
    const finalCompName = selectedCompetition?.name || 'Serie A';

    // Resolve Home Team
    let finalHomeId = homeTeamId;
    let finalHomeName = selectedHomeTeam?.name || '';
    if (isCreatingHomeTeam) {
      if (!newHomeTeamName.trim()) {
        setValidationError('Inserisci il nome della nuova Squadra di Casa.');
        return;
      }
      const ht: Team = {
        id: `team-h-${Date.now()}`,
        name: newHomeTeamName.trim(),
        shortCode: newHomeTeamName.trim().slice(0, 3).toUpperCase(),
        primaryColor: newHomePrimary,
        secondaryColor: newHomeSecondary,
        defaultCompetitionId: finalCompId,
        crestStyle: 'stripes',
      };
      createdTeams.push(ht);
      finalHomeId = ht.id;
      finalHomeName = ht.name;
    }

    // Resolve Away Team
    let finalAwayId = awayTeamId;
    let finalAwayName = selectedAwayTeam?.name || '';
    if (isCreatingAwayTeam) {
      if (!newAwayTeamName.trim()) {
        setValidationError('Inserisci il nome della nuova Squadra Ospite.');
        return;
      }
      const at: Team = {
        id: `team-a-${Date.now() + 1}`,
        name: newAwayTeamName.trim(),
        shortCode: newAwayTeamName.trim().slice(0, 3).toUpperCase(),
        primaryColor: newAwayPrimary,
        secondaryColor: newAwaySecondary,
        defaultCompetitionId: finalCompId,
        crestStyle: 'stripes',
      };
      createdTeams.push(at);
      finalAwayId = at.id;
      finalAwayName = at.name;
    }

    if (!finalHomeName || !finalAwayName) {
      setValidationError(
        'Seleziona sia la Squadra di Casa sia la Squadra Ospite dal menu a tendina.'
      );
      return;
    }

    if (finalHomeId === finalAwayId) {
      setValidationError(
        'La Squadra di Casa e la Squadra Ospite devono essere diverse.'
      );
      return;
    }

    const cleanedEvents: MatchEvent[] = events.map((ev) => ({
      ...ev,
      playerName: ev.playerName.trim() || 'Marcatore',
      minute: ev.minute && ev.minute > 0 ? Math.min(130, ev.minute) : 45,
    }));

    const parsedDayMatch = stageOrMatchday.match(/^(\d+)ª?\s*Giornata/i);
    const matchdayNumber = parsedDayMatch
      ? parseInt(parsedDayMatch[1], 10)
      : editingMatch?.matchdayNumber;

    const nowIso = new Date().toISOString();
    const matchToSave: Match = {
      id: editingMatch ? editingMatch.id : `match-${Date.now()}`,
      date,
      time: time.trim() || undefined,
      season,
      competitionId: finalCompId,
      competitionName: finalCompName,
      stageOrMatchday: stageOrMatchday.trim(),
      matchdayNumber,
      slotIndex: editingMatch?.slotIndex,
      pairedMatchId: editingMatch?.pairedMatchId,
      status: 'PLAYED',
      homeTeamId: finalHomeId,
      homeTeamName: finalHomeName,
      awayTeamId: finalAwayId,
      awayTeamName: finalAwayName,
      homeScore: Math.max(0, Number(homeScore) || 0),
      awayScore: Math.max(0, Number(awayScore) || 0),
      homeHalfTimeScore:
        homeHalfTimeScore.trim() !== ''
          ? Math.max(0, Number(homeHalfTimeScore))
          : undefined,
      awayHalfTimeScore:
        awayHalfTimeScore.trim() !== ''
          ? Math.max(0, Number(awayHalfTimeScore))
          : undefined,
      events: cleanedEvents,
      stadium: stadium.trim() || undefined,
      referee: referee.trim() || undefined,
      notes: notes.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      createdAt: editingMatch ? editingMatch.createdAt : nowIso,
      updatedAt: nowIso,
    };

    onSaveMatch(matchToSave, createdTeams);

    setSavedBanner(
      `${finalHomeName} ${matchToSave.homeScore} - ${matchToSave.awayScore} ${finalAwayName} salvata sul disco!`
    );
    setTimeout(() => setSavedBanner(null), 4500);

    if (!editingMatch) {
      setIsCreatingHomeTeam(false);
      setIsCreatingAwayTeam(false);
      setNewHomeTeamName('');
      setNewAwayTeamName('');
      setHomeTeamId('');
      setAwayTeamId('');
      setHomeScore(0);
      setAwayScore(0);
      setHomeHalfTimeScore('');
      setAwayHalfTimeScore('');
      setEvents([]);
      setStadium('');
      setReferee('');
      setNotes('');
      setRating(0);
    }
  };

  const homeEvents = events.filter((e) => e.side === 'home');
  const awayEvents = events.filter((e) => e.side === 'away');

  return (
    <div className="space-y-6 pb-10">
      <datalist id="home-players-list">
        {homePlayerSuggestions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id="away-players-list">
        {awayPlayerSuggestions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* Edit Mode Banner */}
      {editingMatch && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-black text-emerald-950 dark:text-emerald-200">
                Scheda Partita ({editingMatch.stageOrMatchday}):{' '}
              </span>
              <span className="font-bold text-emerald-900 dark:text-emerald-300">
                {editingMatch.homeTeamName} vs {editingMatch.awayTeamName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-100 text-xs font-extrabold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al Tabellone Giornata
          </button>
        </div>
      )}

      {savedBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3 text-emerald-900 dark:text-emerald-200 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="font-bold">{savedBanner}</div>
        </div>
      )}

      {validationError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 font-semibold text-sm">
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. CONTEXT BAR: Competizione, Stagione, Giornata (Select Automatico), Data & Ora */}
        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600" />
              Impostazioni Competizione e Turno
            </div>
            <button
              type="button"
              onClick={onOpenNewCompetitionWizard}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              Crea Nuovo Campionato
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Competizione */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Competizione / Campionato
              </label>
              <div className="flex items-center gap-2.5">
                <CompetitionBadge
                  competition={selectedCompetition}
                  size="md"
                  showName={false}
                />
                <select
                  value={competitionId}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stagione */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Stagione
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SEASONS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Giornata / Turno (Dropdown Automatico!) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Giornata / Turno
              </label>
              <select
                value={stageOrMatchday}
                onChange={(e) => setStageOrMatchday(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {matchdayOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Partita */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Data Partita
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepDateByDays(-1)}
                    className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                  >
                    -1g
                  </button>
                  <button
                    type="button"
                    onClick={() => setDate(todayIso)}
                    className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => stepDateByDays(1)}
                    className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                  >
                    +1g
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Ora */}
            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Ora
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="20:45"
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white font-semibold text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 2. BROADCAST SCOREBOARD COMPOSER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white border border-slate-700/80 shadow-xl p-6 lg:p-8">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              background: `linear-gradient(90deg, ${
                selectedHomeTeam?.primaryColor || '#0284c7'
              } 0%, #10b981 50%, ${
                selectedAwayTeam?.primaryColor || '#dc2626'
              } 100%)`,
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <span>TABELLONE PARTITA</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">
                {selectedCompetition?.name} ({competitionTeams.length} squadre iscritte)
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">{stageOrMatchday}</span>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none bg-slate-800/90 px-3 py-1.5 rounded-full border border-slate-700">
              <input
                type="checkbox"
                checked={autoSyncScore}
                onChange={(e) => setAutoSyncScore(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 accent-emerald-500"
              />
              <span>Aggiorna punteggio automaticamente dai gol inseriti</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-center">
            {/* HOME TEAM COLUMN */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-end text-center lg:text-right space-y-3">
              <div className="flex items-center gap-4 w-full justify-center lg:justify-end">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Squadra di Casa
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingHomeTeam(!isCreatingHomeTeam)}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isCreatingHomeTeam ? 'Usa elenco' : 'Nuova Squadra'}
                    </button>
                  </div>

                  {isCreatingHomeTeam ? (
                    <div className="space-y-2 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                      <input
                        type="text"
                        value={newHomeTeamName}
                        onChange={(e) => setNewHomeTeamName(e.target.value)}
                        placeholder="Nome nuova squadra..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white font-bold text-sm"
                      />
                      <div className="flex items-center justify-end gap-3 text-xs text-slate-300">
                        <label className="flex items-center gap-1.5">
                          <span>Colore 1:</span>
                          <input
                            type="color"
                            value={newHomePrimary}
                            onChange={(e) => setNewHomePrimary(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0"
                          />
                        </label>
                        <label className="flex items-center gap-1.5">
                          <span>Colore 2:</span>
                          <input
                            type="color"
                            value={newHomeSecondary}
                            onChange={(e) => setNewHomeSecondary(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={homeTeamId}
                      onChange={(e) => setHomeTeamId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-600 text-white text-lg font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Seleziona Squadra Casa --</option>
                      {competitionTeams
                        .filter((t) => t.id !== awayTeamId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.shortCode})
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1 shrink-0">
                  <TeamCrest
                    team={selectedHomeTeam}
                    name={selectedHomeTeam?.name || 'CAS'}
                    size="lg"
                    onClick={() => {
                      if (selectedHomeTeam && !isCreatingHomeTeam) {
                        setLogoModalTarget({
                          kind: 'team',
                          id: selectedHomeTeam.id,
                          name: selectedHomeTeam.name,
                          currentLogoUrl: selectedHomeTeam.logoUrl,
                        });
                      }
                    }}
                  />
                  {!isCreatingHomeTeam && selectedHomeTeam && (
                    <button
                      type="button"
                      onClick={() =>
                        setLogoModalTarget({
                          kind: 'team',
                          id: selectedHomeTeam.id,
                          name: selectedHomeTeam.name,
                          currentLogoUrl: selectedHomeTeam.logoUrl,
                        })
                      }
                      className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />
                      Stemma
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER SCORE STEPPERS */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/80 px-5 py-4 rounded-2xl border border-slate-700/80 shadow-inner">
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHomeScore((s) => s + 1)}
                    className="w-10 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={homeScore}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setHomeScore(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-16 text-center bg-transparent text-4xl sm:text-5xl font-black tabular-nums text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHomeScore((s) => Math.max(0, s - 1))}
                    className="w-10 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-3xl font-black text-slate-500 select-none">:</div>

                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAwayScore((s) => s + 1)}
                    className="w-10 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={awayScore}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setAwayScore(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-16 text-center bg-transparent text-4xl sm:text-5xl font-black tabular-nums text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAwayScore((s) => Math.max(0, s - 1))}
                    className="w-10 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Optional Half-Time Score & Swap Button */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>1°T:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="-"
                    value={homeHalfTimeScore}
                    onChange={(e) =>
                      setHomeHalfTimeScore(e.target.value.replace(/\D/g, ''))
                    }
                    className="w-8 py-0.5 text-center rounded bg-slate-800 border border-slate-700 text-white font-bold tabular-nums"
                  />
                  <span>-</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="-"
                    value={awayHalfTimeScore}
                    onChange={(e) =>
                      setAwayHalfTimeScore(e.target.value.replace(/\D/g, ''))
                    }
                    className="w-8 py-0.5 text-center rounded bg-slate-800 border border-slate-700 text-white font-bold tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSwapTeams}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                  Inverti
                </button>
              </div>
            </div>

            {/* AWAY TEAM COLUMN */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
              <div className="flex items-center gap-4 w-full justify-center lg:justify-start">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <TeamCrest
                    team={selectedAwayTeam}
                    name={selectedAwayTeam?.name || 'OSP'}
                    size="lg"
                    onClick={() => {
                      if (selectedAwayTeam && !isCreatingAwayTeam) {
                        setLogoModalTarget({
                          kind: 'team',
                          id: selectedAwayTeam.id,
                          name: selectedAwayTeam.name,
                          currentLogoUrl: selectedAwayTeam.logoUrl,
                        });
                      }
                    }}
                  />
                  {!isCreatingAwayTeam && selectedAwayTeam && (
                    <button
                      type="button"
                      onClick={() =>
                        setLogoModalTarget({
                          kind: 'team',
                          id: selectedAwayTeam.id,
                          name: selectedAwayTeam.name,
                          currentLogoUrl: selectedAwayTeam.logoUrl,
                        })
                      }
                      className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />
                      Stemma
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Squadra Ospite
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingAwayTeam(!isCreatingAwayTeam)}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isCreatingAwayTeam ? 'Usa elenco' : 'Nuova Squadra'}
                    </button>
                  </div>

                  {isCreatingAwayTeam ? (
                    <div className="space-y-2 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                      <input
                        type="text"
                        value={newAwayTeamName}
                        onChange={(e) => setNewAwayTeamName(e.target.value)}
                        placeholder="Nome nuova squadra..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white font-bold text-sm"
                      />
                      <div className="flex items-center justify-start gap-3 text-xs text-slate-300">
                        <label className="flex items-center gap-1.5">
                          <span>Colore 1:</span>
                          <input
                            type="color"
                            value={newAwayPrimary}
                            onChange={(e) => setNewAwayPrimary(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0"
                          />
                        </label>
                        <label className="flex items-center gap-1.5">
                          <span>Colore 2:</span>
                          <input
                            type="color"
                            value={newAwaySecondary}
                            onChange={(e) => setNewAwaySecondary(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={awayTeamId}
                      onChange={(e) => setAwayTeamId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-600 text-white text-lg font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Seleziona Squadra Ospite --</option>
                      {competitionTeams
                        .filter((t) => t.id !== homeTeamId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.shortCode})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SPLIT TIMELINE BUILDER: Marcatori, Rigori e Cartellini */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HOME EVENTS PANEL */}
          <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <TeamCrest team={selectedHomeTeam} size="sm" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Eventi{' '}
                    {isCreatingHomeTeam
                      ? newHomeTeamName || 'Squadra Casa'
                      : selectedHomeTeam?.name || 'Squadra Casa'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marcatori, rigori, autogol e cartellini squadra di casa
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {homeEvents.length} eventi
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'GOAL')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                ⚽ + Gol
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'PENALTY_GOAL')}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🎯 + Rigore (R)
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'FREE_KICK_GOAL')}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🎯 + Punizione
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'OWN_GOAL')}
                className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🥅 + Autogol
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'YELLOW_CARD')}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🟨 + Giallo
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'RED_CARD')}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🟥 + Rosso
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('home', 'PENALTY_MISS')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                ❌ + Rig. Sbagliato
              </button>
            </div>

            {homeEvents.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-xs">
                Nessun marcatore o cartellino registrato per la squadra di casa.
              </div>
            ) : (
              <div className="space-y-3">
                {homeEvents.map((ev) => (
                  <EventRowEditor
                    key={ev.id}
                    event={ev}
                    datalistId="home-players-list"
                    onUpdate={(patch) => handleUpdateEvent(ev.id, patch)}
                    onRemove={() => handleRemoveEvent(ev.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* AWAY EVENTS PANEL */}
          <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <TeamCrest team={selectedAwayTeam} size="sm" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Eventi{' '}
                    {isCreatingAwayTeam
                      ? newAwayTeamName || 'Squadra Ospite'
                      : selectedAwayTeam?.name || 'Squadra Ospite'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marcatori, rigori, autogol e cartellini squadra ospite
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {awayEvents.length} eventi
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'GOAL')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                ⚽ + Gol
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'PENALTY_GOAL')}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🎯 + Rigore (R)
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'FREE_KICK_GOAL')}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🎯 + Punizione
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'OWN_GOAL')}
                className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🥅 + Autogol
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'YELLOW_CARD')}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🟨 + Giallo
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'RED_CARD')}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              >
                🟥 + Rosso
              </button>
              <button
                type="button"
                onClick={() => handleAddEvent('away', 'PENALTY_MISS')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                ❌ + Rig. Sbagliato
              </button>
            </div>

            {awayEvents.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-xs">
                Nessun marcatore o cartellino registrato per la squadra ospite.
              </div>
            ) : (
              <div className="space-y-3">
                {awayEvents.map((ev) => (
                  <EventRowEditor
                    key={ev.id}
                    event={ev}
                    datalistId="away-players-list"
                    onUpdate={(patch) => handleUpdateEvent(ev.id, patch)}
                    onRemove={() => handleRemoveEvent(ev.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. DETTAGLI PARTITA, NOTE & SALVATAGGIO */}
        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Stadio / Città (Opzionale)
              </label>
              <input
                type="text"
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                placeholder="Es. San Siro, Milano"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Arbitro (Opzionale)
              </label>
              <input
                type="text"
                value={referee}
                onChange={(e) => setReferee(e.target.value)}
                placeholder="Es. Orsato, Mariani..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Valutazione Spettacolo Partita (1-5 Stelle)
              </label>
              <div className="flex items-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? 0 : star)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      star <= rating
                        ? 'text-amber-400 scale-110'
                        : 'text-slate-300 dark:text-slate-700 hover:text-amber-300'
                    }`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">
                    {rating}/5
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Note, Cronaca o Commento Personale
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Annotazioni sulla partita, episodi chiave, rigori parati, condizioni meteo..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {editingMatch ? 'Torna indietro senza salvare' : 'Pulisci Campi'}
            </button>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base flex items-center gap-2.5 shadow-lg shadow-emerald-600/25 transition transform active:scale-98 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {editingMatch
                ? 'Salva Risultato e Marcatori'
                : 'Registra e Salva Partita'}
            </button>
          </div>
        </div>
      </form>

      {logoModalTarget && (
        <OnlineLogoModal
          isOpen={true}
          initialQuery={logoModalTarget.name}
          targetTitle={logoModalTarget.name}
          currentLogoUrl={logoModalTarget.currentLogoUrl}
          onClose={() => setLogoModalTarget(null)}
          onSelectLogo={(dataUrl, colors) => {
            if (logoModalTarget.kind === 'team') {
              onUpdateTeamLogo(logoModalTarget.id, dataUrl, colors);
            } else {
              onUpdateCompetitionLogo(logoModalTarget.id, dataUrl);
            }
          }}
        />
      )}
    </div>
  );
};

interface EventRowEditorProps {
  event: MatchEvent;
  datalistId: string;
  onUpdate: (patch: Partial<MatchEvent>) => void;
  onRemove: () => void;
}

const EventRowEditor: React.FC<EventRowEditorProps> = ({
  event,
  datalistId,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/80 space-y-2">
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Tipo Evento */}
        <div className="col-span-5 sm:col-span-4">
          <select
            value={event.type}
            onChange={(e) => onUpdate({ type: e.target.value as EventType })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="GOAL">⚽ Gol</option>
            <option value="PENALTY_GOAL">🎯 Rigore Segnato (R)</option>
            <option value="FREE_KICK_GOAL">🎯 Punizione Diretta</option>
            <option value="OWN_GOAL">🥅 Autogol a favore (AG)</option>
            <option value="YELLOW_CARD">🟨 Ammonizione (Giallo)</option>
            <option value="SECOND_YELLOW_RED">🟨🟥 Doppio Giallo (Rosso)</option>
            <option value="RED_CARD">🟥 Espulsione Diretta (Rosso)</option>
            <option value="PENALTY_MISS">❌ Rigore Sbagliato/Parato</option>
          </select>
        </div>

        {/* Nome Giocatore */}
        <div className="col-span-7 sm:col-span-5">
          <input
            type="text"
            list={datalistId}
            value={event.playerName}
            onChange={(e) => onUpdate({ playerName: e.target.value })}
            placeholder="Nome giocatore (es. Lautaro)..."
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Minuto — FIXED: Free text numeric input, starts empty, no forced '1' on backspace! */}
        <div className="col-span-10 sm:col-span-2 flex items-center gap-1">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Min."
              value={event.minute && event.minute > 0 ? String(event.minute) : ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                const num =
                  digits === '' ? 0 : Math.min(130, parseInt(digits, 10));
                onUpdate({ minute: num });
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-extrabold text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Minuto (es. 23, 45, 90)"
            />
            <span className="text-[10px] font-bold text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
              &apos;
            </span>
          </div>
        </div>

        {/* Elimina */}
        <div className="col-span-2 sm:col-span-1 flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
            title="Rimuovi evento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Seconda riga compatta: Assist / Recupero / Nota */}
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-5">
          <input
            type="text"
            list={datalistId}
            value={event.assistPlayerName || ''}
            onChange={(e) => onUpdate({ assistPlayerName: e.target.value })}
            placeholder="Assist (opzionale)..."
            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="col-span-5">
          <input
            type="text"
            value={event.note || ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
            placeholder="Nota (es. colpo di testa, tiro da fuori)..."
            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="col-span-2">
          <input
            type="text"
            inputMode="numeric"
            value={event.stoppageMinute ? String(event.stoppageMinute) : ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              onUpdate({
                stoppageMinute: digits
                  ? Math.min(25, parseInt(digits, 10))
                  : undefined,
              });
            }}
            placeholder="+Rec"
            title="Minuti di recupero (es. 2 per 45+2')"
            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 text-xs text-center tabular-nums text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>
    </div>
  );
};
