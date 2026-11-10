import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { Competition, Match, Team } from '../types';
import { getTeamsForCompetition } from '../data/seedData';
import { CompetitionBadge, TeamCrest } from './TeamCrest';
import { formatEventShortBadgeIt, formatMinute } from '../services/excelService';

interface MatchdayScheduleViewProps {
  competitions: Competition[];
  teams: Team[];
  matches: Match[];
  defaultSeason: string;
  selectedCompetitionId: string;
  onSelectCompetitionId: (compId: string) => void;
  onOpenNewCompetitionWizard: () => void;
  onOpenEditCompetitionWizard: (comp: Competition) => void;
  onOpenMatchDetails: (match: Match) => void;
  onUpsertMatches: (matchesToSave: Match[]) => void;
  onDeleteMatch: (matchId: string) => void;
}

export const MatchdayScheduleView: React.FC<MatchdayScheduleViewProps> = ({
  competitions,
  teams,
  matches,
  defaultSeason,
  selectedCompetitionId,
  onSelectCompetitionId,
  onOpenNewCompetitionWizard,
  onOpenEditCompetitionWizard,
  onOpenMatchDetails,
  onUpsertMatches,
  onDeleteMatch,
}) => {
  const todayIso = new Date().toISOString().slice(0, 10);

  const selectedCompetition = useMemo(
    () =>
      competitions.find((c) => c.id === selectedCompetitionId) ||
      competitions[0],
    [competitions, selectedCompetitionId]
  );

  const [season, setSeason] = useState(
    selectedCompetition?.season || defaultSeason || '2026/27'
  );
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [matchdayDate, setMatchdayDate] = useState<string>(todayIso);

  // Draft selections for empty slots: slotIndex -> { homeTeamId, awayTeamId }
  const [draftSlots, setDraftSlots] = useState<
    Record<number, { homeTeamId: string; awayTeamId: string }>
  >({});

  useEffect(() => {
    setDraftSlots({});
  }, [selectedCompetition?.id, season, selectedDay]);

  // Enrolled teams strictly for this competition
  const enrolledTeams = useMemo(() => {
    if (!selectedCompetition) return [];
    return getTeamsForCompetition(
      selectedCompetition.id,
      competitions,
      teams
    );
  }, [selectedCompetition, competitions, teams]);

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  // Calculate competition calendar structure
  const effectiveTeamCount = useMemo(() => {
    const raw =
      selectedCompetition?.teamCount || enrolledTeams.length || 20;
    const count = Math.max(2, raw);
    return count % 2 === 0 ? count : count + 1;
  }, [selectedCompetition, enrolledTeams.length]);

  const matchesPerDay = Math.floor(effectiveTeamCount / 2);
  const andataDays = Math.max(1, effectiveTeamCount - 1);
  const hasReturnLeg =
    selectedCompetition?.hasReturnLeg !== undefined
      ? selectedCompetition.hasReturnLeg
      : true;
  const totalDays = hasReturnLeg ? andataDays * 2 : andataDays;

  // Ensure selectedDay stays within bounds when switching competition
  useEffect(() => {
    if (selectedDay > totalDays) {
      setSelectedDay(1);
    }
  }, [totalDays, selectedDay]);

  // Helper to get matchdayNumber from a Match record (even if created before v1.1)
  const getMatchdayNumber = (m: Match): number | null => {
    if (m.matchdayNumber && m.matchdayNumber > 0) return m.matchdayNumber;
    const match = (m.stageOrMatchday || '').match(/^(\d+)ª?\s*Giornata/i);
    if (match) return parseInt(match[1], 10);
    return null;
  };

  // All matches in this competition & season
  const competitionMatches = useMemo(() => {
    if (!selectedCompetition) return [];
    return matches.filter(
      (m) =>
        m.competitionId === selectedCompetition.id && m.season === season
    );
  }, [matches, selectedCompetition, season]);

  // Matches for the currently selected Matchday, mapped to slots 0..(matchesPerDay - 1)
  const currentDaySlots = useMemo(() => {
    const dayMatches = competitionMatches.filter(
      (m) => getMatchdayNumber(m) === selectedDay
    );

    const slots: (Match | null)[] = Array(matchesPerDay).fill(null);
    const unassigned: Match[] = [];

    for (const m of dayMatches) {
      if (
        m.slotIndex !== undefined &&
        m.slotIndex >= 0 &&
        m.slotIndex < matchesPerDay &&
        !slots[m.slotIndex]
      ) {
        slots[m.slotIndex] = m;
      } else {
        unassigned.push(m);
      }
    }

    for (const m of unassigned) {
      const emptyIdx = slots.findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        slots[emptyIdx] = m;
      } else {
        slots.push(m);
      }
    }

    return slots;
  }, [competitionMatches, selectedDay, matchesPerDay]);

  // Set of team IDs already used in the current Matchday (across saved matches AND active draft selections)
  const usedTeamIdsInCurrentDay = useMemo(() => {
    const set = new Set<string>();
    for (const m of currentDaySlots) {
      if (m) {
        set.add(m.homeTeamId);
        set.add(m.awayTeamId);
      }
    }
    for (const draft of Object.values(draftSlots)) {
      if (draft.homeTeamId) set.add(draft.homeTeamId);
      if (draft.awayTeamId) set.add(draft.awayTeamId);
    }
    return set;
  }, [currentDaySlots, draftSlots]);

  // Count status per matchday for the visual navigator dots
  const matchdayStatusMap = useMemo(() => {
    const map = new Map<
      number,
      { total: number; played: number; scheduled: number }
    >();
    for (const m of competitionMatches) {
      const d = getMatchdayNumber(m);
      if (!d) continue;
      const cur = map.get(d) || { total: 0, played: 0, scheduled: 0 };
      cur.total += 1;
      if (m.status === 'SCHEDULED') {
        cur.scheduled += 1;
      } else {
        cur.played += 1;
      }
      map.set(d, cur);
    }
    return map;
  }, [competitionMatches]);

  // Create or update a match in a slot (and auto-generate/update the Return Leg if in Andata!)
  const createOrUpdateSlotFixture = (
    slotIdx: number,
    homeTeamId: string,
    awayTeamId: string,
    existingMatch?: Match | null
  ) => {
    if (!selectedCompetition || !homeTeamId || !awayTeamId) return;
    if (homeTeamId === awayTeamId) return;

    const homeTeam = teamMap.get(homeTeamId);
    const awayTeam = teamMap.get(awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const nowIso = new Date().toISOString();
    const primaryMatchId =
      existingMatch?.id ||
      `match-${selectedCompetition.id}-${season.replace('/', '')}-d${selectedDay}-s${slotIdx}-${Date.now()}`;

    const primaryMatch: Match = {
      id: primaryMatchId,
      date: existingMatch?.date || matchdayDate,
      time: existingMatch?.time || '15:00',
      season,
      competitionId: selectedCompetition.id,
      competitionName: selectedCompetition.name,
      stageOrMatchday: `${selectedDay}ª Giornata`,
      matchdayNumber: selectedDay,
      slotIndex: slotIdx,
      status: existingMatch?.status || 'SCHEDULED',
      homeTeamId: homeTeam.id,
      homeTeamName: homeTeam.name,
      awayTeamId: awayTeam.id,
      awayTeamName: awayTeam.name,
      homeScore: existingMatch ? existingMatch.homeScore : 0,
      awayScore: existingMatch ? existingMatch.awayScore : 0,
      homeHalfTimeScore: existingMatch?.homeHalfTimeScore,
      awayHalfTimeScore: existingMatch?.awayHalfTimeScore,
      events: existingMatch ? existingMatch.events : [],
      stadium: existingMatch?.stadium,
      referee: existingMatch?.referee,
      notes: existingMatch?.notes,
      rating: existingMatch?.rating,
      createdAt: existingMatch?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const matchesToSave: Match[] = [primaryMatch];

    // If this is a Girone d'Andata matchday and hasReturnLeg is enabled, automatically create/update the Return Leg match!
    if (hasReturnLeg && selectedDay <= andataDays) {
      const returnDayNumber = selectedDay + andataDays;
      const existingReturnMatch = competitionMatches.find(
        (m) =>
          m.pairedMatchId === primaryMatch.id ||
          (getMatchdayNumber(m) === returnDayNumber && m.slotIndex === slotIdx)
      );

      const returnMatchId =
        existingReturnMatch?.id ||
        `match-${selectedCompetition.id}-${season.replace('/', '')}-d${returnDayNumber}-s${slotIdx}-${Date.now() + 1}`;

      primaryMatch.pairedMatchId = returnMatchId;

      const returnMatch: Match = {
        id: returnMatchId,
        pairedMatchId: primaryMatch.id,
        date: existingReturnMatch?.date || matchdayDate,
        time: existingReturnMatch?.time || '15:00',
        season,
        competitionId: selectedCompetition.id,
        competitionName: selectedCompetition.name,
        stageOrMatchday: `${returnDayNumber}ª Giornata`,
        matchdayNumber: returnDayNumber,
        slotIndex: slotIdx,
        status: existingReturnMatch?.status || 'SCHEDULED',
        // INVERT HOME AND AWAY TEAMS FOR RETURN LEG!
        homeTeamId: awayTeam.id,
        homeTeamName: awayTeam.name,
        awayTeamId: homeTeam.id,
        awayTeamName: homeTeam.name,
        homeScore: existingReturnMatch ? existingReturnMatch.homeScore : 0,
        awayScore: existingReturnMatch ? existingReturnMatch.awayScore : 0,
        homeHalfTimeScore: existingReturnMatch?.homeHalfTimeScore,
        awayHalfTimeScore: existingReturnMatch?.awayHalfTimeScore,
        events: existingReturnMatch ? existingReturnMatch.events : [],
        stadium: existingReturnMatch?.stadium,
        referee: existingReturnMatch?.referee,
        notes: existingReturnMatch?.notes,
        rating: existingReturnMatch?.rating,
        createdAt: existingReturnMatch?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      matchesToSave.push(returnMatch);
    }

    onUpsertMatches(matchesToSave);

    // Clear draft for this slot
    setDraftSlots((prev) => {
      const copy = { ...prev };
      delete copy[slotIdx];
      return copy;
    });
  };

  // Handle draft dropdown selection on an empty slot
  const handleDraftSelect = (
    slotIdx: number,
    side: 'home' | 'away',
    teamId: string
  ) => {
    const current = draftSlots[slotIdx] || { homeTeamId: '', awayTeamId: '' };
    const updated = {
      ...current,
      [side === 'home' ? 'homeTeamId' : 'awayTeamId']: teamId,
    };

    if (
      updated.homeTeamId &&
      updated.awayTeamId &&
      updated.homeTeamId !== updated.awayTeamId
    ) {
      createOrUpdateSlotFixture(
        slotIdx,
        updated.homeTeamId,
        updated.awayTeamId,
        null
      );
    } else {
      setDraftSlots((prev) => ({
        ...prev,
        [slotIdx]: updated,
      }));
    }
  };

  // Sync all Andata matches to Ritorno with 1 click
  const handleSyncAllReturnLegs = () => {
    if (!selectedCompetition || !hasReturnLeg) return;
    const toUpsert: Match[] = [];
    const nowIso = new Date().toISOString();

    for (let day = 1; day <= andataDays; day++) {
      const andataMatches = competitionMatches.filter(
        (m) => getMatchdayNumber(m) === day
      );
      const returnDay = day + andataDays;

      andataMatches.forEach((m, idx) => {
        const slot = m.slotIndex !== undefined ? m.slotIndex : idx;
        const existingReturn = competitionMatches.find(
          (rm) =>
            rm.pairedMatchId === m.id ||
            (getMatchdayNumber(rm) === returnDay && rm.slotIndex === slot)
        );

        const returnId =
          existingReturn?.id ||
          `match-${selectedCompetition.id}-d${returnDay}-s${slot}-${Date.now()}-${idx}`;

        toUpsert.push({
          id: returnId,
          pairedMatchId: m.id,
          date: existingReturn?.date || m.date,
          time: existingReturn?.time || m.time || '15:00',
          season,
          competitionId: selectedCompetition.id,
          competitionName: selectedCompetition.name,
          stageOrMatchday: `${returnDay}ª Giornata`,
          matchdayNumber: returnDay,
          slotIndex: slot,
          status: existingReturn?.status || 'SCHEDULED',
          homeTeamId: m.awayTeamId,
          homeTeamName: m.awayTeamName,
          awayTeamId: m.homeTeamId,
          awayTeamName: m.homeTeamName,
          homeScore: existingReturn ? existingReturn.homeScore : 0,
          awayScore: existingReturn ? existingReturn.awayScore : 0,
          events: existingReturn ? existingReturn.events : [],
          createdAt: existingReturn?.createdAt || nowIso,
          updatedAt: nowIso,
        });
      });
    }

    if (toUpsert.length > 0) {
      onUpsertMatches(toUpsert);
    }
  };

  const handleQuickScoreChange = (
    match: Match,
    side: 'home' | 'away',
    rawVal: string
  ) => {
    const cleaned = rawVal.replace(/\D/g, '');
    const numericScore = cleaned === '' ? 0 : Math.min(99, parseInt(cleaned, 10));
    const updated: Match = {
      ...match,
      homeScore: side === 'home' ? numericScore : match.homeScore,
      awayScore: side === 'away' ? numericScore : match.awayScore,
      status: 'PLAYED',
      updatedAt: new Date().toISOString(),
    };
    onUpsertMatches([updated]);
  };

  const handleTogglePlayedStatus = (match: Match) => {
    const nextStatus = match.status === 'SCHEDULED' ? 'PLAYED' : 'SCHEDULED';
    onUpsertMatches([
      {
        ...match,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  const handleSwapMatchTeams = (match: Match) => {
    const updated: Match = {
      ...match,
      homeTeamId: match.awayTeamId,
      homeTeamName: match.awayTeamName,
      awayTeamId: match.homeTeamId,
      awayTeamName: match.homeTeamName,
      homeScore: match.awayScore,
      awayScore: match.homeScore,
      events: match.events.map((e) => ({
        ...e,
        side: e.side === 'home' ? 'away' : 'home',
      })),
      updatedAt: new Date().toISOString(),
    };
    onUpsertMatches([updated]);
  };

  const isReturnLegDay = hasReturnLeg && selectedDay > andataDays;
  const correspondingAndataDay = isReturnLegDay
    ? selectedDay - andataDays
    : selectedDay + andataDays;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP COMPETITION BAR & BIG ACTION BUTTONS */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Competition Selector */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {selectedCompetition && (
              <CompetitionBadge
                competition={selectedCompetition}
                size="lg"
                showName={false}
              />
            )}
            <div className="flex-1 max-w-sm">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                Campionato / Competizione Attiva
              </label>
              <select
                value={selectedCompetition?.id || ''}
                onChange={(e) => onSelectCompetitionId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-black text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.teamIds?.length || c.teamCount || 20} squadre)
                  </option>
                ))}
              </select>
            </div>

            <div className="w-32">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Stagione
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {['2026/27', '2025/26', '2024/25', '2023/24', '2022/23'].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Prominent Creation & Management Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {selectedCompetition && (
              <button
                type="button"
                onClick={() => onOpenEditCompetitionWizard(selectedCompetition)}
                className="px-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-extrabold flex items-center gap-2 transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Squadre Iscritte ({enrolledTeams.length})
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewCompetitionWizard}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nuovo Campionato
            </button>
          </div>
        </div>
      </div>

      {/* 2. AUTOMATIC NUMBERED MATCHDAY NAVIGATOR (ANDATA & RITORNO) */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={selectedDay <= 1}
              onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white disabled:opacity-35 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Giornata precedente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {selectedDay}ª Giornata
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    isReturnLegDay
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isReturnLegDay
                    ? `Girone di Ritorno (${selectedDay - andataDays}ª di Ritorno)`
                    : "Girone d'Andata"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isReturnLegDay ? (
                  <>
                    Campi invertiti rispetto alla{' '}
                    <button
                      type="button"
                      onClick={() => setSelectedDay(correspondingAndataDay)}
                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {correspondingAndataDay}ª Giornata d&apos;Andata
                    </button>
                  </>
                ) : hasReturnLeg ? (
                  <>
                    Inserendo le partite qui, la{' '}
                    <button
                      type="button"
                      onClick={() => setSelectedDay(correspondingAndataDay)}
                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {correspondingAndataDay}ª Giornata (Ritorno)
                    </button>{' '}
                    viene creata automaticamente a campi invertiti!
                  </>
                ) : (
                  `${matchesPerDay} partite in programma per questo turno`
                )}
              </p>
            </div>

            <button
              type="button"
              disabled={selectedDay >= totalDays}
              onClick={() => setSelectedDay((d) => Math.min(totalDays, d + 1))}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white disabled:opacity-35 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Giornata successiva"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Default Date for this Matchday & Sync Return Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Data turno:
              </span>
              <input
                type="date"
                value={matchdayDate}
                onChange={(e) => setMatchdayDate(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-900 dark:text-white tabular-nums focus:outline-none"
              />
            </div>

            {hasReturnLeg && (
              <button
                type="button"
                onClick={handleSyncAllReturnLegs}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                title="Genera o aggiorna tutte le giornate del Girone di Ritorno invertendo le partite dell'Andata"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sincronizza Ritorno
              </button>
            )}
          </div>
        </div>

        {/* Numbered Pills Grid for Andata & Ritorno */}
        <div className="space-y-2.5">
          {/* Girone d'Andata Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
              Andata:
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {Array.from({ length: andataDays }, (_, i) => i + 1).map((day) => {
                const stat = matchdayStatusMap.get(day);
                const isSelected = selectedDay === day;
                const isComplete = stat && stat.played >= matchesPerDay;
                const hasAny = stat && stat.total > 0;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-[38px] h-8 px-2 rounded-lg text-xs font-black tabular-nums flex items-center justify-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm scale-105'
                        : isComplete
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : hasAny
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {day}ª
                  </button>
                );
              })}
            </div>
          </div>

          {/* Girone di Ritorno Row */}
          {hasReturnLeg && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-20 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
                Ritorno:
              </span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {Array.from(
                  { length: andataDays },
                  (_, i) => i + 1 + andataDays
                ).map((day) => {
                  const stat = matchdayStatusMap.get(day);
                  const isSelected = selectedDay === day;
                  const isComplete = stat && stat.played >= matchesPerDay;
                  const hasAny = stat && stat.total > 0;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`min-w-[38px] h-8 px-2 rounded-lg text-xs font-black tabular-nums flex items-center justify-center gap-1 transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-sm scale-105'
                          : isComplete
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : hasAny
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {day}ª
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. THE MATCHDAY BOARD (ALL 10 MATCHES OF THE GIORNATA IN ONE LIST) */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider">
              {selectedDay}ª Giornata
            </span>
            <h3 className="text-base sm:text-lg font-black">
              Tabellone Partite — {selectedCompetition?.name} ({season})
            </h3>
          </div>

          <div className="text-xs text-slate-300 font-medium">
            Squadre disponibili da inserire in questa giornata:{' '}
            <strong className="text-emerald-400">
              {Math.max(0, enrolledTeams.length - usedTeamIdsInCurrentDay.size)}
            </strong>{' '}
            su {enrolledTeams.length}
          </div>
        </div>

        {enrolledTeams.length < 2 ? (
          <div className="p-10 text-center space-y-3">
            <Users className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Nessuna squadra iscritta a questo campionato
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Clicca sul pulsante qui sotto per inserire l&apos;elenco delle squadre partecipanti a{' '}
              <strong>{selectedCompetition?.name}</strong>.
            </p>
            <button
              type="button"
              onClick={() =>
                selectedCompetition &&
                onOpenEditCompetitionWizard(selectedCompetition)
              }
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black cursor-pointer"
            >
              Configura Squadre del Campionato
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
            {currentDaySlots.map((match, slotIdx) => {
              const draft = draftSlots[slotIdx] || {
                homeTeamId: '',
                awayTeamId: '',
              };

              const currentHomeId = match ? match.homeTeamId : draft.homeTeamId;
              const currentAwayId = match ? match.awayTeamId : draft.awayTeamId;

              // Filter dropdown options: ONLY show teams of this competition that are NOT already used in another slot of this matchday!
              const availableHomeTeams = enrolledTeams.filter(
                (t) =>
                  t.id === currentHomeId ||
                  (!usedTeamIdsInCurrentDay.has(t.id) && t.id !== currentAwayId)
              );

              const availableAwayTeams = enrolledTeams.filter(
                (t) =>
                  t.id === currentAwayId ||
                  (!usedTeamIdsInCurrentDay.has(t.id) && t.id !== currentHomeId)
              );

              const isPlayed = match && match.status !== 'SCHEDULED';
              const homeTeamObj = currentHomeId
                ? teamMap.get(currentHomeId)
                : undefined;
              const awayTeamObj = currentAwayId
                ? teamMap.get(currentAwayId)
                : undefined;

              return (
                <div
                  key={match?.id || `slot-${slotIdx}`}
                  className={`px-4 sm:px-6 py-3.5 transition ${
                    match
                      ? isPlayed
                        ? 'bg-white dark:bg-studio-card hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        : 'bg-sky-50/30 dark:bg-sky-950/15 hover:bg-sky-50/60 dark:hover:bg-sky-950/25'
                      : 'bg-slate-50/50 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                    {/* Slot Number & Status Badge */}
                    <div className="lg:col-span-2 flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center shrink-0 tabular-nums">
                        {slotIdx + 1}
                      </span>

                      {match ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePlayedStatus(match)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                            isPlayed
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          }`}
                          title="Clicca per cambiare stato tra Da Giocare e Giocata"
                        >
                          {isPlayed ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              Giocata
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Da Giocare
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          Da accoppiare
                        </span>
                      )}
                    </div>

                    {/* Home Team Selector */}
                    <div className="lg:col-span-3 flex items-center gap-2.5">
                      <TeamCrest
                        team={homeTeamObj}
                        name={match?.homeTeamName || 'Casa'}
                        size="sm"
                      />
                      <select
                        value={currentHomeId}
                        onChange={(e) => {
                          const newHomeId = e.target.value;
                          if (match) {
                            if (newHomeId) {
                              createOrUpdateSlotFixture(
                                slotIdx,
                                newHomeId,
                                match.awayTeamId,
                                match
                              );
                            }
                          } else {
                            handleDraftSelect(slotIdx, 'home', newHomeId);
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                          currentHomeId
                            ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 text-slate-400'
                        }`}
                      >
                        <option value="">-- Squadra Casa --</option>
                        {availableHomeTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Center Score Inputs / VS */}
                    <div className="lg:col-span-2 flex items-center justify-center gap-1.5">
                      {match ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={isPlayed ? String(match.homeScore) : ''}
                            placeholder="-"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleQuickScoreChange(
                                match,
                                'home',
                                e.target.value
                              )
                            }
                            className="w-11 h-10 rounded-xl bg-slate-900 text-white font-black text-lg text-center tabular-nums border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            title="Gol Squadra Casa"
                          />
                          <button
                            type="button"
                            onClick={() => handleSwapMatchTeams(match)}
                            className="p-1 text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                            title="Inverti Casa / Ospite"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={isPlayed ? String(match.awayScore) : ''}
                            placeholder="-"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleQuickScoreChange(
                                match,
                                'away',
                                e.target.value
                              )
                            }
                            className="w-11 h-10 rounded-xl bg-slate-900 text-white font-black text-lg text-center tabular-nums border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            title="Gol Squadra Ospite"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-black text-slate-400 uppercase">
                          VS
                        </span>
                      )}
                    </div>

                    {/* Away Team Selector */}
                    <div className="lg:col-span-3 flex items-center gap-2.5">
                      <select
                        value={currentAwayId}
                        onChange={(e) => {
                          const newAwayId = e.target.value;
                          if (match) {
                            if (newAwayId) {
                              createOrUpdateSlotFixture(
                                slotIdx,
                                match.homeTeamId,
                                newAwayId,
                                match
                              );
                            }
                          } else {
                            handleDraftSelect(slotIdx, 'away', newAwayId);
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                          currentAwayId
                            ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 text-slate-400'
                        }`}
                      >
                        <option value="">-- Squadra Ospite --</option>
                        {availableAwayTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <TeamCrest
                        team={awayTeamObj}
                        name={match?.awayTeamName || 'Ospite'}
                        size="sm"
                      />
                    </div>

                    {/* Right Action Buttons: Open Match Scorers/Details & Delete */}
                    <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                      {match ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenMatchDetails(match)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            title="Apri scheda partita per inserire marcatori, minuti, rigori e cartellini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>
                              Marcatori
                              {match.events.length > 0
                                ? ` (${match.events.length})`
                                : ''}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteMatch(match.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Svuota questa riga"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic pr-2">
                          Scegli le 2 squadre
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Summary of Scorers if already entered */}
                  {match && match.events.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pl-9">
                      {match.events
                        .slice()
                        .sort((a, b) => (a.minute || 0) - (b.minute || 0))
                        .map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-flex items-center gap-1"
                          >
                            <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatMinute(ev)}
                            </strong>
                            <span>
                              {ev.type === 'YELLOW_CARD'
                                ? '🟨'
                                : ev.type === 'RED_CARD' ||
                                  ev.type === 'SECOND_YELLOW_RED'
                                ? '🟥'
                                : '⚽'}
                            </span>
                            <span className="font-bold">{ev.playerName}</span>
                            {formatEventShortBadgeIt(ev.type) && (
                              <span className="text-[10px] text-slate-400">
                                {formatEventShortBadgeIt(ev.type)}
                              </span>
                            )}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
