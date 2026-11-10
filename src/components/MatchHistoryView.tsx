import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Copy,
  Edit3,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Star,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { Competition, Match, MatchEvent, Team } from '../types';
import { CompetitionBadge, TeamCrest } from './TeamCrest';
import { formatEventShortBadgeIt, formatMinute } from '../services/excelService';
import { getTeamsForCompetition } from '../data/seedData';

interface MatchHistoryViewProps {
  matches: Match[];
  teams: Team[];
  competitions: Competition[];
  onEditMatch: (match: Match) => void;
  onDuplicateMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
  onClearAllMatches?: () => void;
  onLoadDemoMatches?: () => void;
}

export function formatItalianDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00');
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  matches,
  teams,
  competitions,
  onEditMatch,
  onDuplicateMatch,
  onDeleteMatch,
  onClearAllMatches,
  onLoadDemoMatches,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompetitionId, setFilterCompetitionId] = useState('ALL');
  const [filterSeason, setFilterSeason] = useState('ALL');
  const [filterTeamId, setFilterTeamId] = useState('ALL');
  const [filterSpecial, setFilterSpecial] = useState<
    | 'ALL'
    | 'PLAYED'
    | 'SCHEDULED'
    | 'PENALTIES'
    | 'RED_CARDS'
    | 'TOP_RATED'
    | 'HOME_WIN'
    | 'DRAW'
    | 'AWAY_WIN'
  >('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const compMap = useMemo(() => {
    const map = new Map<string, Competition>();
    for (const c of competitions) map.set(c.id, c);
    return map;
  }, [competitions]);

  const availableTeamsForFilter = useMemo(() => {
    if (filterCompetitionId === 'ALL') return teams;
    return getTeamsForCompetition(filterCompetitionId, competitions, teams);
  }, [filterCompetitionId, competitions, teams]);

  const availableSeasons = useMemo(() => {
    const s = new Set<string>();
    for (const m of matches) {
      if (m.season) s.add(m.season);
    }
    return Array.from(s).sort().reverse();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...matches]
      .filter((m) => {
        const isScheduled = m.status === 'SCHEDULED';
        if (filterCompetitionId !== 'ALL' && m.competitionId !== filterCompetitionId) return false;
        if (filterSeason !== 'ALL' && m.season !== filterSeason) return false;
        if (
          filterTeamId !== 'ALL' &&
          m.homeTeamId !== filterTeamId &&
          m.awayTeamId !== filterTeamId
        ) {
          return false;
        }
        if (filterSpecial === 'PLAYED') {
          if (isScheduled) return false;
        } else if (filterSpecial === 'SCHEDULED') {
          if (!isScheduled) return false;
        } else if (filterSpecial === 'PENALTIES') {
          if (!m.events.some((e) => e.type === 'PENALTY_GOAL' || e.type === 'PENALTY_MISS'))
            return false;
        } else if (filterSpecial === 'RED_CARDS') {
          if (!m.events.some((e) => e.type === 'RED_CARD' || e.type === 'SECOND_YELLOW_RED'))
            return false;
        } else if (filterSpecial === 'TOP_RATED') {
          if ((m.rating || 0) < 4) return false;
        } else if (filterSpecial === 'HOME_WIN') {
          if (isScheduled || m.homeScore <= m.awayScore) return false;
        } else if (filterSpecial === 'DRAW') {
          if (isScheduled || m.homeScore !== m.awayScore) return false;
        } else if (filterSpecial === 'AWAY_WIN') {
          if (isScheduled || m.awayScore <= m.homeScore) return false;
        }

        if (!q) return true;
        const inTeams =
          m.homeTeamName.toLowerCase().includes(q) || m.awayTeamName.toLowerCase().includes(q);
        const inComp =
          m.competitionName.toLowerCase().includes(q) ||
          (m.stageOrMatchday || '').toLowerCase().includes(q);
        const inNotes =
          (m.notes || '').toLowerCase().includes(q) ||
          (m.stadium || '').toLowerCase().includes(q) ||
          (m.referee || '').toLowerCase().includes(q);
        const inEvents = m.events.some(
          (e) =>
            e.playerName.toLowerCase().includes(q) ||
            (e.assistPlayerName || '').toLowerCase().includes(q) ||
            (e.note || '').toLowerCase().includes(q)
        );
        return inTeams || inComp || inNotes || inEvents;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [matches, searchQuery, filterCompetitionId, filterSeason, filterTeamId, filterSpecial]);

  const totalGoalsInFiltered = useMemo(
    () =>
      filteredMatches.reduce(
        (acc, m) => (m.status === 'SCHEDULED' ? acc : acc + m.homeScore + m.awayScore),
        0
      ),
    [filteredMatches]
  );

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterCompetitionId !== 'ALL' ||
    filterSeason !== 'ALL' ||
    filterTeamId !== 'ALL' ||
    filterSpecial !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCompetitionId('ALL');
    setFilterSeason('ALL');
    setFilterTeamId('ALL');
    setFilterSpecial('ALL');
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca squadra, marcatore, assist, stadio, arbitro o nota..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Summary Pill, Clear All Button & View Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {matches.length > 0 &&
              onClearAllMatches &&
              (confirmClearAll ? (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">
                    Cancellare tutte le {matches.length} partite?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllMatches();
                      setConfirmClearAll(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black cursor-pointer shadow-xs"
                  >
                    Sì, svuota
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer flex items-center gap-1"
                  title="Elimina tutte le partite per ricominciare da un archivio pulito"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Svuota Archivio
                </button>
              ))}

            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>{filteredMatches.length} partite</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {totalGoalsInFiltered} gol totali
              </span>
            </div>

            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Schede TV
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Tabella Excel
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <select
            value={filterCompetitionId}
            onChange={(e) => {
              setFilterCompetitionId(e.target.value);
              setFilterTeamId('ALL');
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">🏆 Tutte le Competizioni</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterSeason}
            onChange={(e) => setFilterSeason(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">📅 Tutte le Stagioni</option>
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                Stagione {s}
              </option>
            ))}
          </select>

          <select
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">
              🛡️ Tutte le Squadre ({availableTeamsForFilter.length})
            </option>
            {availableTeamsForFilter.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <select
              value={filterSpecial}
              onChange={(e) => setFilterSpecial(e.target.value as any)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">⚡ Tutte le Partite (Giocate + Da Giocare)</option>
              <option value="PLAYED">✅ Solo Partite Giocate</option>
              <option value="SCHEDULED">⏳ Solo Partite Da Giocare</option>
              <option value="PENALTIES">🎯 Partite con Rigori</option>
              <option value="RED_CARDS">🟥 Partite con Espulsioni</option>
              <option value="TOP_RATED">⭐ Partite Spettacolari (4-5★)</option>
              <option value="HOME_WIN">🏠 Vittorie in Casa (Segno 1)</option>
              <option value="DRAW">🤝 Pareggi (Segno X)</option>
              <option value="AWAY_WIN">✈️ Vittorie in Trasferta (Segno 2)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold shrink-0 cursor-pointer"
                title="Azzera tutti i filtri"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white dark:bg-studio-card border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-black">
            ⚽
          </div>
          {matches.length === 0 ? (
            <>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                L’archivio partite è completamente vuoto e pronto!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Puoi iniziare subito compilando un’intera giornata dalla scheda{' '}
                <strong>“Calendario & Giornate”</strong> oppure registrando una singola partita da{' '}
                <strong>“Partita Singola”</strong>.
              </p>
              {onLoadDemoMatches && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onLoadDemoMatches}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    Carica 3 partite di esempio per prova
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Nessuna partita corrisponde ai filtri selezionati
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Prova a premere <strong>Reset</strong> sui filtri per rivedere tutte le{' '}
                {matches.length} partite registrate.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Azzera Filtri
                </button>
              )}
            </>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* BROADCAST MATCH CARDS VIEW */
        <div className="space-y-4">
          {filteredMatches.map((m) => {
            const isScheduled = m.status === 'SCHEDULED';
            const comp = compMap.get(m.competitionId);
            const homeTeam = teamMap.get(m.homeTeamId);
            const awayTeam = teamMap.get(m.awayTeamId);
            const homeEvs = [...m.events]
              .filter((e) => e.side === 'home')
              .sort((a, b) => a.minute - b.minute);
            const awayEvs = [...m.events]
              .filter((e) => e.side === 'away')
              .sort((a, b) => a.minute - b.minute);

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/60 rounded-2xl overflow-hidden shadow-xs transition"
              >
                {/* Top Meta Strip */}
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <CompetitionBadge competition={comp} name={m.competitionName} size="sm" />
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {m.season}
                    </span>
                    {m.stageOrMatchday && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/80 font-bold text-slate-700 dark:text-slate-200">
                          {m.stageOrMatchday}
                        </span>
                      </>
                    )}
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 capitalize">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatItalianDate(m.date)}
                      {m.time ? ` ore ${m.time}` : ''}
                    </span>
                    {isScheduled && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[10px] inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        DA GIOCARE
                      </span>
                    )}
                  </div>

                  {/* Rating & Quick Actions */}
                  <div className="flex items-center gap-2">
                    {m.rating && m.rating > 0 ? (
                      <div className="flex items-center gap-0.5 text-amber-400 mr-2">
                        {Array.from({ length: m.rating }).map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onEditMatch(m)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Modifica questa partita"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {isScheduled ? 'Inserisci Risultato' : 'Modifica'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateMatch(m)}
                      className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 hover:bg-sky-600 hover:text-white text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Duplica partita"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteId === m.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMatch(m.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Conferma Elimina
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(m.id)}
                        className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Elimina partita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Scoreline Row */}
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                  {/* Home Team */}
                  <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3.5">
                    <span
                      className={`text-lg sm:text-xl font-extrabold truncate ${
                        !isScheduled && m.homeScore > m.awayScore
                          ? 'text-slate-950 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.homeTeamName}
                    </span>
                    <TeamCrest team={homeTeam} name={m.homeTeamName} size="md" />
                  </div>

                  {/* Score Box */}
                  <div className="md:col-span-3 flex flex-col items-center justify-center">
                    {isScheduled ? (
                      <button
                        type="button"
                        onClick={() => onEditMatch(m)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-wider cursor-pointer transition"
                      >
                        <Clock className="w-4 h-4" />
                        Da Giocare
                      </button>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white font-black text-2xl sm:text-3xl tabular-nums shadow-xs border border-slate-700/80">
                          <span className={m.homeScore > m.awayScore ? 'text-emerald-400' : ''}>
                            {m.homeScore}
                          </span>
                          <span className="text-slate-500 text-xl">-</span>
                          <span className={m.awayScore > m.homeScore ? 'text-emerald-400' : ''}>
                            {m.awayScore}
                          </span>
                        </div>
                        {m.homeHalfTimeScore !== undefined && m.awayHalfTimeScore !== undefined && (
                          <span className="text-[11px] font-semibold text-slate-400 mt-1 tabular-nums">
                            (1°T: {m.homeHalfTimeScore}-{m.awayHalfTimeScore})
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="md:col-span-4 flex items-center justify-between md:justify-start gap-3.5">
                    <TeamCrest team={awayTeam} name={m.awayTeamName} size="md" />
                    <span
                      className={`text-lg sm:text-xl font-extrabold truncate ${
                        !isScheduled && m.awayScore > m.homeScore
                          ? 'text-slate-950 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.awayTeamName}
                    </span>
                  </div>
                </div>

                {/* Events & Notes Sub-Footer */}
                {(m.events.length > 0 || m.notes || m.stadium || m.referee) && (
                  <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                    {m.events.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Home Events */}
                        <div className="space-y-1 md:text-right md:pr-4 md:border-r border-slate-200 dark:border-slate-800">
                          {homeEvs.map((ev) => (
                            <EventBadgeLine key={ev.id} ev={ev} align="right" />
                          ))}
                        </div>
                        {/* Away Events */}
                        <div className="space-y-1 md:pl-2">
                          {awayEvs.map((ev) => (
                            <EventBadgeLine key={ev.id} ev={ev} align="left" />
                          ))}
                        </div>
                      </div>
                    )}

                    {(m.notes || m.stadium || m.referee) && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-3">
                          {m.stadium && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              {m.stadium}
                            </span>
                          )}
                          {m.referee && (
                            <span className="inline-flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Arbitro: {m.referee}
                            </span>
                          )}
                        </div>
                        {m.notes && (
                          <p className="italic text-slate-600 dark:text-slate-300 font-medium">
                            “{m.notes}”
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT EXCEL-STYLE TABLE VIEW */
        <div className="bg-white dark:bg-studio-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-xs font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Competizione</th>
                  <th className="py-3 px-4">Giornata</th>
                  <th className="py-3 px-4 text-right">Squadra Casa</th>
                  <th className="py-3 px-3 text-center">Ris.</th>
                  <th className="py-3 px-4">Squadra Ospite</th>
                  <th className="py-3 px-4">Marcatori & Cartellini</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredMatches.map((m) => {
                  const isScheduled = m.status === 'SCHEDULED';
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-semibold tabular-nums text-slate-600 dark:text-slate-300 text-xs">
                        {m.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-bold">
                        <CompetitionBadge
                          competition={compMap.get(m.competitionId)}
                          name={m.competitionName}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {m.stageOrMatchday || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {m.homeTeamName}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isScheduled ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[11px]">
                            Da Giocare
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-black text-xs tabular-nums">
                            {m.homeScore} - {m.awayScore}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {m.awayTeamName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {m.events
                          .map(
                            (e) =>
                              `${formatMinute(e)} ${e.playerName} ${formatEventShortBadgeIt(e.type)}`
                          )
                          .join(', ') ||
                          m.notes ||
                          '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditMatch(m)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                            title="Modifica"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMatch(m.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const EventBadgeLine: React.FC<{ ev: MatchEvent; align: 'left' | 'right' }> = ({ ev, align }) => {
  const icon =
    ev.type === 'GOAL'
      ? '⚽'
      : ev.type === 'PENALTY_GOAL'
      ? '🎯'
      : ev.type === 'FREE_KICK_GOAL'
      ? '🎯'
      : ev.type === 'OWN_GOAL'
      ? '🥅'
      : ev.type === 'YELLOW_CARD'
      ? '🟨'
      : ev.type === 'SECOND_YELLOW_RED'
      ? '🟨🟥'
      : ev.type === 'RED_CARD'
      ? '🟥'
      : '❌';

  const shortTag = formatEventShortBadgeIt(ev.type);

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        align === 'right' ? 'md:justify-end' : 'justify-start'
      }`}
    >
      <span className="font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
        {formatMinute(ev)}
      </span>
      <span>{icon}</span>
      <span className="font-bold text-slate-800 dark:text-slate-100">{ev.playerName}</span>
      {shortTag && (
        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
          {shortTag}
        </span>
      )}
      {ev.assistPlayerName && (
        <span className="text-slate-500 dark:text-slate-400">
          (Assist: <strong>{ev.assistPlayerName}</strong>)
        </span>
      )}
      {ev.note && <span className="text-slate-400 dark:text-slate-500 italic">— {ev.note}</span>}
    </div>
  );
};
