import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Flame,
  Search,
  Shield,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { Competition, Match, Team } from '../types';
import { getTeamsForCompetition } from '../data/seedData';
import { CompetitionBadge, TeamCrest } from './TeamCrest';
import { formatEventLabelIt, formatMinute } from '../services/excelService';
import { formatItalianDate } from './MatchHistoryView';

interface StatsAndLeaderboardViewProps {
  matches: Match[];
  teams: Team[];
  competitions: Competition[];
}

interface PlayerAggregatedStat {
  key: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  openPlayGoals: number;
  penalties: number;
  freeKicks: number;
  ownGoals: number;
  missedPenalties: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  braces: number;
  hatTricks: number;
  matchesScoredIn: number;
  eventsLog: {
    match: Match;
    minuteStr: string;
    typeLabel: string;
    note?: string;
    isGoal: boolean;
  }[];
}

interface StandingsRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('V' | 'P' | 'S')[];
}

export const StatsAndLeaderboardView: React.FC<StatsAndLeaderboardViewProps> = ({
  matches,
  teams,
  competitions,
}) => {
  const [subTab, setSubTab] = useState<'scorers' | 'standings' | 'h2h'>('scorers');
  const [filterCompId, setFilterCompId] = useState('ALL');
  const [filterSeason, setFilterSeason] = useState('ALL');
  const [scorerSearch, setScorerSearch] = useState('');
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<PlayerAggregatedStat | null>(null);

  // H2H Team selectors
  const [h2hTeamAId, setH2hTeamAId] = useState(teams[0]?.id || '');
  const [h2hTeamBId, setH2hTeamBId] = useState(teams[1]?.id || teams[0]?.id || '');

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

  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.season) set.add(m.season);
    }
    return Array.from(set).sort().reverse();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (m.status === 'SCHEDULED') return false;
      if (filterCompId !== 'ALL' && m.competitionId !== filterCompId) return false;
      if (filterSeason !== 'ALL' && m.season !== filterSeason) return false;
      return true;
    });
  }, [matches, filterCompId, filterSeason]);

  // Global KPI stats for filtered matches
  const kpis = useMemo(() => {
    const totalMatches = filteredMatches.length;
    let totalGoals = 0;
    let penaltiesScored = 0;
    let penaltiesMissed = 0;
    let yellowCards = 0;
    let redCards = 0;

    for (const m of filteredMatches) {
      totalGoals += m.homeScore + m.awayScore;
      for (const ev of m.events) {
        if (ev.type === 'PENALTY_GOAL') penaltiesScored += 1;
        if (ev.type === 'PENALTY_MISS') penaltiesMissed += 1;
        if (ev.type === 'YELLOW_CARD') yellowCards += 1;
        if (ev.type === 'RED_CARD' || ev.type === 'SECOND_YELLOW_RED') redCards += 1;
      }
    }

    const avgGoals = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0.00';
    return {
      totalMatches,
      totalGoals,
      avgGoals,
      penaltiesScored,
      penaltiesMissed,
      yellowCards,
      redCards,
    };
  }, [filteredMatches]);

  // Compute Player Leaderboard
  const playerStats = useMemo(() => {
    const map = new Map<string, PlayerAggregatedStat>();

    const getOrCreate = (name: string, teamId: string, teamName: string): PlayerAggregatedStat => {
      const cleanName = name.trim();
      const key = `${cleanName.toLowerCase()}__${teamId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          playerName: cleanName,
          teamId,
          teamName,
          goals: 0,
          openPlayGoals: 0,
          penalties: 0,
          freeKicks: 0,
          ownGoals: 0,
          missedPenalties: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          braces: 0,
          hatTricks: 0,
          matchesScoredIn: 0,
          eventsLog: [],
        });
      }
      return map.get(key)!;
    };

    for (const m of filteredMatches) {
      // Track goals per player in this single match for braces/hat-tricks
      const matchGoalsPerPlayerKey = new Map<string, number>();

      for (const ev of m.events) {
        if (!ev.playerName.trim() || ev.playerName === 'Giocatore N.D.') continue;
        const teamId = ev.side === 'home' ? m.homeTeamId : m.awayTeamId;
        const teamName = ev.side === 'home' ? m.homeTeamName : m.awayTeamName;

        const stat = getOrCreate(ev.playerName, teamId, teamName);
        const isGoal =
          ev.type === 'GOAL' || ev.type === 'PENALTY_GOAL' || ev.type === 'FREE_KICK_GOAL';

        if (ev.type === 'GOAL') {
          stat.goals += 1;
          stat.openPlayGoals += 1;
        } else if (ev.type === 'PENALTY_GOAL') {
          stat.goals += 1;
          stat.penalties += 1;
        } else if (ev.type === 'FREE_KICK_GOAL') {
          stat.goals += 1;
          stat.freeKicks += 1;
        } else if (ev.type === 'OWN_GOAL') {
          stat.ownGoals += 1;
        } else if (ev.type === 'PENALTY_MISS') {
          stat.missedPenalties += 1;
        } else if (ev.type === 'YELLOW_CARD') {
          stat.yellowCards += 1;
        } else if (ev.type === 'RED_CARD' || ev.type === 'SECOND_YELLOW_RED') {
          stat.redCards += 1;
        }

        if (isGoal) {
          matchGoalsPerPlayerKey.set(stat.key, (matchGoalsPerPlayerKey.get(stat.key) || 0) + 1);
        }

        stat.eventsLog.push({
          match: m,
          minuteStr: formatMinute(ev),
          typeLabel: formatEventLabelIt(ev.type),
          note: ev.note,
          isGoal,
        });

        // Also credit Assist
        if (ev.assistPlayerName && ev.assistPlayerName.trim()) {
          const assistStat = getOrCreate(ev.assistPlayerName, teamId, teamName);
          assistStat.assists += 1;
          assistStat.eventsLog.push({
            match: m,
            minuteStr: formatMinute(ev),
            typeLabel: `Assist per ${ev.playerName}`,
            note: ev.note,
            isGoal: false,
          });
        }
      }

      for (const [pKey, count] of matchGoalsPerPlayerKey.entries()) {
        const st = map.get(pKey);
        if (st) {
          st.matchesScoredIn += 1;
          if (count === 2) st.braces += 1;
          if (count >= 3) st.hatTricks += 1;
        }
      }
    }

    const q = scorerSearch.trim().toLowerCase();
    return Array.from(map.values())
      .filter((p) => {
        if (!q) return true;
        return (
          p.playerName.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          b.goals - a.goals ||
          b.openPlayGoals - a.openPlayGoals ||
          b.assists - a.assists ||
          b.yellowCards - a.yellowCards
      );
  }, [filteredMatches, scorerSearch]);

  // Compute League Standings Table
  const standings = useMemo(() => {
    const map = new Map<string, StandingsRow>();

    const ensureTeam = (teamId: string, teamName: string): StandingsRow => {
      if (!map.has(teamId)) {
        map.set(teamId, {
          teamId,
          teamName,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
          form: [],
        });
      }
      return map.get(teamId)!;
    };

    // If a specific competition is selected, pre-seed all enrolled teams of that competition
    if (filterCompId !== 'ALL') {
      const enrolled = getTeamsForCompetition(filterCompId, competitions, teams);
      for (const t of enrolled) {
        ensureTeam(t.id, t.name);
      }
    }

    // Sort chronologically ascending so form array ends with latest matches
    const chronological = [...filteredMatches].sort((a, b) => a.date.localeCompare(b.date));

    for (const m of chronological) {
      const home = ensureTeam(m.homeTeamId, m.homeTeamName);
      const away = ensureTeam(m.awayTeamId, m.awayTeamName);

      home.played += 1;
      away.played += 1;
      home.gf += m.homeScore;
      home.ga += m.awayScore;
      home.gd = home.gf - home.ga;

      away.gf += m.awayScore;
      away.ga += m.homeScore;
      away.gd = away.gf - away.ga;

      if (m.homeScore > m.awayScore) {
        home.won += 1;
        home.points += 3;
        home.form.push('V');
        away.lost += 1;
        away.form.push('S');
      } else if (m.homeScore < m.awayScore) {
        away.won += 1;
        away.points += 3;
        away.form.push('V');
        home.lost += 1;
        home.form.push('S');
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
        home.form.push('P');
        away.form.push('P');
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.teamName.localeCompare(b.teamName)
    );
  }, [filteredMatches, filterCompId, competitions, teams]);

  // Compute Head-to-Head (Scontri Diretti)
  const h2hData = useMemo(() => {
    const h2hMatches = matches
      .filter(
        (m) =>
          m.status !== 'SCHEDULED' &&
          ((m.homeTeamId === h2hTeamAId && m.awayTeamId === h2hTeamBId) ||
            (m.homeTeamId === h2hTeamBId && m.awayTeamId === h2hTeamAId))
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    let winsA = 0;
    let draws = 0;
    let winsB = 0;
    let goalsA = 0;
    let goalsB = 0;

    for (const m of h2hMatches) {
      const aIsHome = m.homeTeamId === h2hTeamAId;
      const scoreA = aIsHome ? m.homeScore : m.awayScore;
      const scoreB = aIsHome ? m.awayScore : m.homeScore;
      goalsA += scoreA;
      goalsB += scoreB;
      if (scoreA > scoreB) winsA += 1;
      else if (scoreB > scoreA) winsB += 1;
      else draws += 1;
    }

    return {
      h2hMatches,
      winsA,
      draws,
      winsB,
      goalsA,
      goalsB,
    };
  }, [matches, h2hTeamAId, h2hTeamBId]);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Filter & Sub-Navigation Bar */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSubTab('scorers')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'scorers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            Classifica Marcatori & Cartellini
          </button>
          <button
            type="button"
            onClick={() => setSubTab('standings')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'standings'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Classifica Squadre & Forma
          </button>
          <button
            type="button"
            onClick={() => setSubTab('h2h')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'h2h'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Swords className="w-4 h-4" />
            Scontri Diretti (Testa a Testa)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterCompId}
            onChange={(e) => setFilterCompId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
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
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">📅 Tutte le Stagioni</option>
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                Stagione {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Partite Registrate
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">
            {kpis.totalMatches}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Nel filtro selezionato
          </div>
        </div>

        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Reti Totali Segnate
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            {kpis.totalGoals}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Media: <strong>{kpis.avgGoals}</strong> gol/partita
          </div>
        </div>

        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Calci di Rigore
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">
            {kpis.penaltiesScored}{' '}
            <span className="text-base font-bold text-slate-400">
              / {kpis.penaltiesScored + kpis.penaltiesMissed}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Trasformati ({kpis.penaltiesMissed} sbagliati)
          </div>
        </div>

        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Disciplina & Cartellini
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-black tabular-nums text-amber-500">
              🟨 {kpis.yellowCards}
            </span>
            <span className="text-2xl font-black tabular-nums text-rose-500">
              🟥 {kpis.redCards}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ammonizioni ed espulsioni
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: SCORER LEADERBOARD */}
      {subTab === 'scorers' && (
        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-500" />
                Classifica Capocannonieri, Assist & Disciplina
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clicca sul nome di un giocatore per aprire il riepilogo di tutte le partite in cui ha segnato.
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={scorerSearch}
                onChange={(e) => setScorerSearch(e.target.value)}
                placeholder="Filtra giocatore o squadra..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {playerStats.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Nessun marcatore o evento registrato per i filtri selezionati.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-xs font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Giocatore</th>
                    <th className="py-3 px-4">Squadra</th>
                    <th className="py-3 px-3 text-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      ⚽ Gol Tot.
                    </th>
                    <th className="py-3 px-3 text-center">Su Azione</th>
                    <th className="py-3 px-3 text-center">🎯 Rigori (R)</th>
                    <th className="py-3 px-3 text-center">Punizioni</th>
                    <th className="py-3 px-3 text-center">👟 Assist</th>
                    <th className="py-3 px-3 text-center" title="Doppiette / Triplette">
                      2+ / 3+
                    </th>
                    <th className="py-3 px-3 text-center">🟨 Gialli</th>
                    <th className="py-3 px-3 text-center">🟥 Rossi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {playerStats.map((p, idx) => {
                    const team = teamMap.get(p.teamId);
                    return (
                      <tr
                        key={p.key}
                        onClick={() => setSelectedPlayerModal(p)}
                        className="hover:bg-emerald-50/50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center font-black tabular-nums text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400">
                          {p.playerName}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <TeamCrest team={team} name={p.teamName} size="xs" />
                            <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                              {p.teamName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center bg-emerald-500/5 font-black text-base tabular-nums text-emerald-600 dark:text-emerald-400">
                          {p.goals}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-slate-700 dark:text-slate-300">
                          {p.openPlayGoals}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-sky-600 dark:text-sky-400">
                          {p.penalties > 0 ? p.penalties : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          {p.freeKicks > 0 ? p.freeKicks : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-slate-700 dark:text-slate-300">
                          {p.assists > 0 ? p.assists : '-'}
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-bold tabular-nums text-slate-500">
                          {p.braces > 0 || p.hatTricks > 0
                            ? `${p.braces}D / ${p.hatTricks}T`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-amber-500">
                          {p.yellowCards > 0 ? p.yellowCards : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-rose-500">
                          {p.redCards > 0 ? p.redCards : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LEAGUE STANDINGS TABLE */}
      {subTab === 'standings' && (
        <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Classifica Squadre (Calcolata dalle Partite Registrate)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3 punti per vittoria, 1 punto per pareggio. Filtra per Competizione in alto per vedere la classifica di un singolo campionato.
            </p>
          </div>

          {standings.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Nessuna partita registrata per calcolare la classifica.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-xs font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4 w-12 text-center">Pos</th>
                    <th className="py-3 px-4">Squadra</th>
                    <th className="py-3 px-3 text-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Punti
                    </th>
                    <th className="py-3 px-3 text-center">PG</th>
                    <th className="py-3 px-3 text-center">V</th>
                    <th className="py-3 px-3 text-center">P</th>
                    <th className="py-3 px-3 text-center">S</th>
                    <th className="py-3 px-3 text-center">GF</th>
                    <th className="py-3 px-3 text-center">GS</th>
                    <th className="py-3 px-3 text-center">DR</th>
                    <th className="py-3 px-4 text-center">Ultime 5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {standings.map((row, idx) => {
                    const team = teamMap.get(row.teamId);
                    const last5 = row.form.slice(-5);
                    return (
                      <tr
                        key={row.teamId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="py-3 px-4 text-center font-black tabular-nums text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <TeamCrest team={team} name={row.teamName} size="sm" />
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {row.teamName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center bg-emerald-500/5 font-black text-base tabular-nums text-emerald-600 dark:text-emerald-400">
                          {row.points}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-slate-700 dark:text-slate-300">
                          {row.played}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {row.won}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-amber-500">
                          {row.drawn}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-rose-500">
                          {row.lost}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          {row.gf}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          {row.ga}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {row.gd > 0 ? `+${row.gd}` : row.gd}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {last5.map((res, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center text-white ${
                                  res === 'V'
                                    ? 'bg-emerald-500'
                                    : res === 'P'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              >
                                {res}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: HEAD TO HEAD (SCONTRI DIRETTI) */}
      {subTab === 'h2h' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
              <div className="md:col-span-4 flex items-center gap-3">
                <TeamCrest team={teamMap.get(h2hTeamAId)} size="lg" />
                <select
                  value={h2hTeamAId}
                  onChange={(e) => setH2hTeamAId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-extrabold text-slate-900 dark:text-white"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 text-center">
                <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Bilancio Scontri Diretti
                </div>
                <div className="mt-2 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {h2hData.winsA}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Vittorie</div>
                  </div>
                  <div className="text-center px-3 border-x border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-black text-amber-500">{h2hData.draws}</div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Pareggi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-sky-500">{h2hData.winsB}</div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Vittorie</div>
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Reti complessive: {h2hData.goalsA} - {h2hData.goalsB}
                </div>
              </div>

              <div className="md:col-span-4 flex items-center gap-3">
                <select
                  value={h2hTeamBId}
                  onChange={(e) => setH2hTeamBId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-extrabold text-slate-900 dark:text-white"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <TeamCrest team={teamMap.get(h2hTeamBId)} size="lg" />
              </div>
            </div>
          </div>

          {h2hData.h2hMatches.length === 0 ? (
            <div className="bg-white dark:bg-studio-card border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Nessuno scontro diretto registrato in archivio tra queste due squadre.
            </div>
          ) : (
            <div className="bg-white dark:bg-studio-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
                Precedenti in Archivio ({h2hData.h2hMatches.length})
              </h4>
              {h2hData.h2hMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{m.date}</span>
                    <span>•</span>
                    <CompetitionBadge
                      competition={compMap.get(m.competitionId)}
                      name={m.competitionName}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 font-extrabold text-sm">
                    <span>{m.homeTeamName}</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white tabular-nums">
                      {m.homeScore} - {m.awayScore}
                    </span>
                    <span>{m.awayTeamName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player Match Breakdown Modal */}
      {selectedPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[82vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamCrest
                  team={teamMap.get(selectedPlayerModal.teamId)}
                  name={selectedPlayerModal.teamName}
                  size="md"
                />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedPlayerModal.playerName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPlayerModal.teamName} •{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {selectedPlayerModal.goals} Gol
                    </strong>{' '}
                    ({selectedPlayerModal.penalties} rigori) • {selectedPlayerModal.assists} Assist
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayerModal(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5">
              {selectedPlayerModal.eventsLog.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.match.homeTeamName} {item.match.homeScore}-{item.match.awayScore}{' '}
                      {item.match.awayTeamName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {formatItalianDate(item.match.date)} • {item.match.competitionName}
                      {item.note ? ` — “${item.note}”` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums">
                      {item.minuteStr} • {item.typeLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
