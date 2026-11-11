import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Edit3,
  FolderOpen,
  Globe,
  HardDrive,
  Loader2,
  MapPin,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Type,
  Users,
  X,
} from 'lucide-react';
import { Competition, StorageInfo, Team } from '../types';
import { getTeamsForCompetition } from '../data/seedData';
import { CompetitionBadge, TeamCrest } from './TeamCrest';
import { OnlineLogoModal } from './OnlineLogoModal';
import { formatTeamDisplayName } from './CompetitionWizardModal';
import {
  fetchAndCacheLogoUrl,
  openAppDataFolder,
  openBackupFolder,
  searchLogosOnline,
} from '../services/storageService';

interface TeamsAndCompetitionsViewProps {
  teams: Team[];
  competitions: Competition[];
  storageInfo: StorageInfo | null;
  onSaveTeam: (team: Team, enrollInCompetitionId?: string) => void;
  onDeleteTeam: (teamId: string) => void;
  onSaveCompetition: (comp: Competition) => void;
  onDeleteCompetition: (compId: string) => void;
  onBatchUpdateLogos: (
    teamLogos: Record<string, string>,
    compLogos: Record<string, string>
  ) => void;
  onOpenNewCompetitionWizard: () => void;
  onOpenEditCompetitionWizard: (comp: Competition) => void;
  onClearAllMatches?: () => void;
}

export const TeamsAndCompetitionsView: React.FC<TeamsAndCompetitionsViewProps> = ({
  teams,
  competitions,
  storageInfo,
  onSaveTeam,
  onDeleteTeam,
  onSaveCompetition,
  onDeleteCompetition,
  onBatchUpdateLogos,
  onOpenNewCompetitionWizard,
  onOpenEditCompetitionWizard,
  onClearAllMatches,
}) => {
  const [filterCompId, setFilterCompId] = useState<string>(
    competitions[0]?.id || 'ALL'
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');
  const [newTeamPrimary, setNewTeamPrimary] = useState('#0284c7');
  const [newTeamSecondary, setNewTeamSecondary] = useState('#ffffff');
  const [newTeamStyle, setNewTeamStyle] =
    useState<Team['crestStyle']>('stripes');

  // State for editing an existing team's name, shortCode, and home stadium
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamShort, setEditTeamShort] = useState('');
  const [editTeamStadium, setEditTeamStadium] = useState('');

  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const [logoModalTarget, setLogoModalTarget] = useState<{
    kind: 'team' | 'competition';
    item: Team | Competition;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const displayedTeams = useMemo(() => {
    if (filterCompId === 'ALL') {
      return [...teams].sort((a, b) => a.name.localeCompare(b.name));
    }
    return getTeamsForCompetition(filterCompId, competitions, teams);
  }, [filterCompId, competitions, teams]);

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = formatTeamDisplayName(newTeamName);
    if (!formattedName) return;
    const targetCompId =
      filterCompId !== 'ALL' ? filterCompId : competitions[0]?.id;
    const created: Team = {
      id: `team-${Date.now()}`,
      name: formattedName,
      shortCode: (
        newTeamShort.trim() || formattedName.replace(/[^a-zA-Z]/g, '').slice(0, 3)
      ).toUpperCase(),
      primaryColor: newTeamPrimary,
      secondaryColor: newTeamSecondary,
      defaultCompetitionId: targetCompId,
      crestStyle: newTeamStyle,
    };
    onSaveTeam(created, targetCompId);
    setNewTeamName('');
    setNewTeamShort('');
  };

  const startEditingTeam = (t: Team) => {
    setEditingTeamId(t.id);
    setEditTeamName(t.name);
    setEditTeamShort(t.shortCode);
    setEditTeamStadium(t.stadium || '');
  };

  const saveEditedTeam = (t: Team) => {
    const trimmedName = editTeamName.trim();
    if (!trimmedName) return;
    const updated: Team = {
      ...t,
      name: trimmedName,
      shortCode:
        editTeamShort.trim().toUpperCase() ||
        trimmedName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() ||
        t.shortCode,
      stadium: editTeamStadium.trim() || undefined,
    };
    onSaveTeam(updated);
    setEditingTeamId(null);
  };

  const handleBatchDownloadMissingLogos = async () => {
    const missingTeams = teams.filter((t) => !t.logoUrl);
    const missingComps = competitions.filter((c) => !c.logoUrl);
    const total = missingTeams.length + missingComps.length;

    if (total === 0) {
      setBatchProgress(
        'Tutti i club e le competizioni hanno già uno stemma salvato!'
      );
      setTimeout(() => setBatchProgress(null), 4000);
      return;
    }

    setIsBatchRunning(true);
    const foundTeamLogos: Record<string, string> = {};
    const foundCompLogos: Record<string, string> = {};
    let done = 0;

    try {
      for (const comp of missingComps) {
        done += 1;
        setBatchProgress(`Ricerca logo (${done}/${total}): ${comp.name}...`);
        const results = await searchLogosOnline(comp.name);
        if (results.length > 0) {
          const top = results[0];
          const cached = top.dataUrl?.startsWith('data:image/')
            ? top.dataUrl
            : await fetchAndCacheLogoUrl(top.imageUrl);
          if (cached) {
            foundCompLogos[comp.id] = cached;
          }
        }
      }

      for (const team of missingTeams) {
        done += 1;
        setBatchProgress(`Ricerca stemma (${done}/${total}): ${team.name}...`);
        const results = await searchLogosOnline(team.name);
        if (results.length > 0) {
          const top = results[0];
          const cached = top.dataUrl?.startsWith('data:image/')
            ? top.dataUrl
            : await fetchAndCacheLogoUrl(top.imageUrl);
          if (cached) {
            foundTeamLogos[team.id] = cached;
          }
        }
      }

      onBatchUpdateLogos(foundTeamLogos, foundCompLogos);
      const countFound =
        Object.keys(foundTeamLogos).length + Object.keys(foundCompLogos).length;
      setBatchProgress(
        `Completato! Scaricati e salvati ${countFound} stemmi ufficiali sul disco.`
      );
      setTimeout(() => setBatchProgress(null), 5000);
    } catch {
      setBatchProgress('Download interrotto. Verifica la connessione internet.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. CAMPIONATI E COMPETIZIONI SECTION (Top & Prominent!) */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-emerald-600" />
              Campionati e Competizioni ({competitions.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Crea un nuovo campionato indicando il numero di squadre e i loro nomi, oppure modifica le squadre di un torneo esistente.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewCompetitionWizard}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Crea Nuovo Campionato (con Squadre)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitions.map((c) => {
            const compTeams = getTeamsForCompetition(c.id, competitions, teams);
            const count = c.teamCount || compTeams.length || 20;
            const andata = Math.max(1, count - 1);
            const totalDays = c.hasReturnLeg !== false ? andata * 2 : andata;

            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between gap-4 hover:border-emerald-500/60 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CompetitionBadge
                      competition={c}
                      size="lg"
                      showName={false}
                    />
                    <div className="min-w-0">
                      <div className="font-black text-base text-slate-900 dark:text-white truncate">
                        {c.name}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {c.country} •{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {compTeams.length} squadre
                        </strong>{' '}
                        • {totalDays} giornate
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteCompetition(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Elimina campionato"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
                  <button
                    type="button"
                    onClick={() =>
                      setLogoModalTarget({ kind: 'competition', item: c })
                    }
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    {c.logoUrl ? 'Cambia Logo' : 'Cerca Logo'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEditCompetitionWizard(c)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Modifica Squadre ({compTeams.length})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SQUADRE SECTION (Filtered by Competition + Direct Name/Stadium Editor!) */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                Squadre del Campionato ({displayedTeams.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clicca su <strong>Modifica Nome</strong> su qualsiasi squadra per correggere il nome (maiuscole/minuscole), la sigla o lo stadio di casa.
              </p>
            </div>

            <select
              value={filterCompId}
              onChange={(e) => setFilterCompId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-50/40 dark:bg-slate-800 text-sm font-black text-slate-900 dark:text-white cursor-pointer"
            >
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  🏆 Squadre di: {c.name}
                </option>
              ))}
              <option value="ALL">📋 Tutte le Squadre in Archivio</option>
            </select>
          </div>

          {/* Quick Add Team Form */}
          <form
            onSubmit={handleAddTeam}
            className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-2xl border border-slate-200 dark:border-slate-700"
          >
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onBlur={() => setNewTeamName(formatTeamDisplayName(newTeamName))}
              placeholder="Nome nuova squadra..."
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
            />
            <input
              type="text"
              maxLength={3}
              value={newTeamShort}
              onChange={(e) => setNewTeamShort(e.target.value)}
              placeholder="Sigla (SAM)"
              className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold uppercase text-center text-slate-900 dark:text-white"
            />
            <input
              type="color"
              value={newTeamPrimary}
              onChange={(e) => setNewTeamPrimary(e.target.value)}
              title="Colore sociale 1"
              className="w-8 h-8 rounded-lg cursor-pointer border-0"
            />
            <input
              type="color"
              value={newTeamSecondary}
              onChange={(e) => setNewTeamSecondary(e.target.value)}
              title="Colore sociale 2"
              className="w-8 h-8 rounded-lg cursor-pointer border-0"
            />
            <select
              value={newTeamStyle}
              onChange={(e) => setNewTeamStyle(e.target.value as any)}
              className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="stripes">Strisce</option>
              <option value="solid">Tinta Unita</option>
              <option value="halves">Bicolore</option>
              <option value="hoops">Fasce</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Aggiungi Squadra
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {displayedTeams.map((t) => {
            const isEditingThis = editingTeamId === t.id;

            return (
              <div
                key={t.id}
                className={`p-3.5 rounded-xl border transition ${
                  isEditingThis
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-slate-800 shadow-md'
                    : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500/60'
                }`}
              >
                {isEditingThis ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Modifica Squadra
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditTeamName((prev) =>
                            prev
                              .trim()
                              .split(/\s+/)
                              .map((w) =>
                                w.length > 0
                                  ? w[0].toUpperCase() + w.slice(1).toLowerCase()
                                  : w
                              )
                              .join(' ')
                          )
                        }
                        className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Imposta Iniziale Maiuscola (es. napoli -> Napoli)"
                      >
                        <Type className="w-3 h-3" />
                        Aa
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedTeam(t);
                          if (e.key === 'Escape') setEditingTeamId(null);
                        }}
                        placeholder="Nome squadra..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        maxLength={3}
                        value={editTeamShort}
                        onChange={(e) => setEditTeamShort(e.target.value)}
                        placeholder="SIG"
                        className="w-14 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold uppercase text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <input
                        type="text"
                        value={editTeamStadium}
                        onChange={(e) => setEditTeamStadium(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedTeam(t);
                        }}
                        placeholder="Stadio di casa (opzionale)..."
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTeamId(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditedTeam(t)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salva
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamCrest
                        team={t}
                        size="md"
                        onClick={() =>
                          setLogoModalTarget({ kind: 'team', item: t })
                        }
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => startEditingTeam(t)}
                          title="Clicca per modificare il nome della squadra"
                          className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 truncate block text-left cursor-pointer"
                        >
                          {t.name}
                        </button>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {t.shortCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditingTeam(t)}
                            className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLogoModalTarget({ kind: 'team', item: t })
                            }
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Globe className="w-3 h-3" />
                            Logo
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="color"
                        value={t.primaryColor}
                        onChange={(e) =>
                          onSaveTeam({ ...t, primaryColor: e.target.value })
                        }
                        title="Modifica colore primario"
                        className="w-5 h-5 rounded cursor-pointer border-0"
                      />
                      <button
                        type="button"
                        onClick={() => onDeleteTeam(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Rimuovi squadra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Internet Logo Auto-Downloader Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white rounded-2xl p-6 border border-emerald-500/30 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
            <Globe className="w-4 h-4" />
            Stemmi Club & Loghi Campionati da Internet
          </div>
          <h3 className="text-lg font-black">
            Scarica Automaticamente Tutti gli Stemmi Ufficiali Mancanti
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Con un solo clic il programma cerca e salva sul PC gli stemmi ufficiali di tutte le squadre e dei campionati inseriti.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            disabled={isBatchRunning}
            onClick={handleBatchDownloadMissingLogos}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            {isBatchRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Scarica Stemmi Mancanti
          </button>
          {batchProgress && (
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {batchProgress}
            </span>
          )}
        </div>
      </div>

      {/* 4. STORAGE & BACKUP SAFETY DIAGNOSTICS */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Sicurezza Dati & Percorsi di Salvataggio Automatico
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ogni singola modifica viene salvata istantaneamente sul disco rigido in doppia copia atomica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onClearAllMatches &&
              (confirmClearAll ? (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">
                    Confermi eliminazione di tutte le partite?
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
                  className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Svuota Tutte le Partite
                </button>
              ))}
            <button
              type="button"
              onClick={openBackupFolder}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Apri Cartella Backup in Documenti
            </button>
            <button
              type="button"
              onClick={openAppDataFolder}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Apri Cartella Database (AppData)
            </button>
          </div>
        </div>

        {storageInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="font-bold text-slate-400 uppercase block">
                Database Principale (Protetto):
              </span>
              <code className="text-slate-700 dark:text-slate-300 break-all">
                {storageInfo.dbPath}
              </code>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase block">
                Copia Specchio Automatica in Documenti:
              </span>
              <code className="text-slate-700 dark:text-slate-300 break-all">
                {storageInfo.documentsMirrorPath}
              </code>
            </div>
          </div>
        )}
      </div>

      {logoModalTarget && (
        <OnlineLogoModal
          isOpen={true}
          initialQuery={logoModalTarget.item.name}
          targetTitle={logoModalTarget.item.name}
          currentLogoUrl={logoModalTarget.item.logoUrl}
          onClose={() => setLogoModalTarget(null)}
          onSelectLogo={(dataUrl, colors) => {
            if (logoModalTarget.kind === 'team') {
              const t = logoModalTarget.item as Team;
              onSaveTeam({
                ...t,
                logoUrl: dataUrl || undefined,
                primaryColor: colors?.primary || t.primaryColor,
                secondaryColor: colors?.secondary || t.secondaryColor,
              });
            } else {
              const c = logoModalTarget.item as Competition;
              onSaveCompetition({
                ...c,
                logoUrl: dataUrl || undefined,
              });
            }
          }}
        />
      )}
    </div>
  );
};
