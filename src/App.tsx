import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderOpen,
  History,
  Loader2,
  Moon,
  PlusCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Sun,
  Type,
  Upload,
} from 'lucide-react';
import {
  Competition,
  DatabaseSchema,
  Match,
  StorageInfo,
  Team,
} from './types';
import { DEFAULT_DATABASE, INITIAL_MATCHES } from './data/seedData';
import {
  checkForAppUpdates,
  fetchAndCacheLogoUrl,
  getStorageInfo,
  installAppUpdate,
  loadDatabase,
  openBackupFolder,
  saveDatabase,
  searchLogosOnline,
} from './services/storageService';
import {
  exportJsonBackupFile,
  exportToCsvFile,
  exportToExcelWorkbook,
  importBackupOrExcel,
} from './services/excelService';
import { MatchdayScheduleView } from './components/MatchdayScheduleView';
import { MatchEntryView } from './components/MatchEntryView';
import { MatchHistoryView } from './components/MatchHistoryView';
import { StatsAndLeaderboardView } from './components/StatsAndLeaderboardView';
import { TeamsAndCompetitionsView } from './components/TeamsAndCompetitionsView';
import { CompetitionWizardModal } from './components/CompetitionWizardModal';
import { UpdateAndChangelogModal, UpdateModalInfo } from './components/UpdateAndChangelogModal';

type ActiveTab = 'schedule' | 'entry' | 'history' | 'stats' | 'teams';
const CURRENT_APP_VERSION = '1.2.0';

export const App: React.FC = () => {
  const [db, setDb] = useState<DatabaseSchema>(DEFAULT_DATABASE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>(
    DEFAULT_DATABASE.settings.defaultCompetitionId || 'comp-serie-a'
  );
  const [selectedMatchday, setSelectedMatchday] = useState<number>(1);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [returnToScheduleAfterEdit, setReturnToScheduleAfterEdit] = useState(false);
  const [isCompWizardOpen, setIsCompWizardOpen] = useState(false);
  const [editingCompForWizard, setEditingCompForWizard] = useState<Competition | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateModalInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [changelogModalMode, setChangelogModalMode] = useState<'update-available' | 'whats-new'>(
    'whats-new'
  );
  const autoFetchStartedRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleManualUpdateCheck = async (silent = false) => {
    if (!silent) setIsCheckingUpdate(true);
    try {
      const res = await checkForAppUpdates();
      const nextInfo: UpdateModalInfo = {
        updateAvailable: res.updateAvailable,
        currentVersion: res.currentVersion || CURRENT_APP_VERSION,
        latestVersion: res.latestVersion,
        releaseNotes: (res as any).releaseNotes,
        downloadUrl: res.downloadUrl,
        assetName: res.assetName,
      };
      setUpdateInfo(nextInfo);
      if (res.updateAvailable) {
        setChangelogModalMode('update-available');
        setIsChangelogModalOpen(true);
        if (!silent) {
          showToast(`Nuova versione v${res.latestVersion} disponibile!`);
        }
      } else if (!silent) {
        if (res.checked) {
          showToast(`Hai già l'ultima versione installata (v${res.currentVersion}).`);
        } else if (res.error) {
          showToast(res.error);
        }
      }
    } finally {
      if (!silent) setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdateNow = async () => {
    if (!updateInfo?.downloadUrl || !updateInfo.assetName) return;
    setIsInstallingUpdate(true);
    showToast('Download aggiornamento in corso... Il programma si riavvierà da solo.');
    const res = await installAppUpdate({
      downloadUrl: updateInfo.downloadUrl,
      assetName: updateInfo.assetName,
      latestVersion: updateInfo.latestVersion,
    });
    if (!res.success) {
      setIsInstallingUpdate(false);
      showToast(res.error || 'Impossibile completare l’aggiornamento automatico.');
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadDatabase();
      if (!mounted) return;
      setDb(loaded);
      if (loaded.competitions.length > 0) {
        const defaultComp = loaded.competitions.some(
          (c) => c.id === loaded.settings.defaultCompetitionId
        )
          ? loaded.settings.defaultCompetitionId
          : loaded.competitions[0].id;
        setSelectedCompetitionId(defaultComp);
      }
      setIsLoaded(true);

      // Show "What's New / Novità dell'Aggiornamento" modal automatically when a new version is launched for the first time
      if (loaded.settings.lastSeenVersion !== CURRENT_APP_VERSION) {
        setChangelogModalMode('whats-new');
        setIsChangelogModalOpen(true);
      }

      const info = await getStorageInfo(loaded);
      if (mounted) setStorageInfo(info);
      // Silent startup check for updates on GitHub
      handleManualUpdateCheck(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply Dark/Light theme and Font Size Comfort scale to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (db.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.fontSize = db.settings.fontScale === 'large' ? '17.5px' : '16px';
  }, [db.settings.theme, db.settings.fontScale]);

  // Background auto-enrichment for priority clubs & leagues that don't have a cached logo yet
  useEffect(() => {
    if (!isLoaded || autoFetchStartedRef.current || !db.settings.autoFetchLogosOnline) return;
    autoFetchStartedRef.current = true;

    const missingPriorityTeams = db.teams
      .filter((t) => t.isFavorite && !t.logoUrl)
      .slice(0, 10);
    const missingPriorityComps = db.competitions
      .filter((c) => c.isFavorite && !c.logoUrl)
      .slice(0, 4);

    if (missingPriorityTeams.length === 0 && missingPriorityComps.length === 0) return;

    (async () => {
      const teamLogoUpdates: Record<string, string> = {};
      const compLogoUpdates: Record<string, string> = {};

      for (const comp of missingPriorityComps) {
        try {
          const found = await searchLogosOnline(comp.name);
          if (found.length > 0) {
            const url = found[0].dataUrl?.startsWith('data:image/')
              ? found[0].dataUrl
              : await fetchAndCacheLogoUrl(found[0].imageUrl);
            if (url) compLogoUpdates[comp.id] = url;
          }
        } catch {
          // ignore offline
        }
      }

      for (const team of missingPriorityTeams) {
        try {
          const found = await searchLogosOnline(team.name);
          if (found.length > 0) {
            const url = found[0].dataUrl?.startsWith('data:image/')
              ? found[0].dataUrl
              : await fetchAndCacheLogoUrl(found[0].imageUrl);
            if (url) teamLogoUpdates[team.id] = url;
          }
        } catch {
          // ignore offline
        }
      }

      if (
        Object.keys(teamLogoUpdates).length > 0 ||
        Object.keys(compLogoUpdates).length > 0
      ) {
        setDb((prev) => {
          const next: DatabaseSchema = {
            ...prev,
            teams: prev.teams.map((t) =>
              teamLogoUpdates[t.id] ? { ...t, logoUrl: teamLogoUpdates[t.id] } : t
            ),
            competitions: prev.competitions.map((c) =>
              compLogoUpdates[c.id] ? { ...c, logoUrl: compLogoUpdates[c.id] } : c
            ),
          };
          saveDatabase(next, false);
          return next;
        });
      }
    })();
  }, [isLoaded]);

  const persistUpdate = async (updater: (prev: DatabaseSchema) => DatabaseSchema, snapshot = false) => {
    setDb((prev) => {
      const next = updater(prev);
      saveDatabase(next, snapshot).then(async (saved) => {
        const info = await getStorageInfo(saved);
        setStorageInfo(info);
      });
      return next;
    });
  };

  const autoFetchLogoForTeam = async (team: Team) => {
    if (team.logoUrl) return;
    try {
      const found = await searchLogosOnline(team.name);
      if (found.length > 0) {
        const top = found[0];
        const cached = top.dataUrl?.startsWith('data:image/')
          ? top.dataUrl
          : await fetchAndCacheLogoUrl(top.imageUrl);
        if (cached) {
          persistUpdate((prev) => ({
            ...prev,
            teams: prev.teams.map((t) =>
              t.id === team.id
                ? {
                    ...t,
                    logoUrl: cached,
                    primaryColor: top.primaryColor || t.primaryColor,
                    secondaryColor: top.secondaryColor || t.secondaryColor,
                  }
                : t
            ),
          }));
          showToast(`Stemma ufficiale di "${team.name}" scaricato da internet!`);
        }
      }
    } catch {
      // ignore offline
    }
  };

  const handleSaveMatch = (
    match: Match,
    newTeams?: Team[],
    newCompetition?: Competition
  ) => {
    persistUpdate((prev) => {
      let nextCompetitions = newCompetition
        ? [...prev.competitions, newCompetition]
        : prev.competitions;

      // Also enroll any newly created quick-teams into the match's competition
      if (newTeams && newTeams.length > 0) {
        const newIds = newTeams.map((t) => t.id);
        nextCompetitions = nextCompetitions.map((c) => {
          if (c.id !== match.competitionId) return c;
          const existingIds = c.teamIds || [];
          const merged = Array.from(new Set([...existingIds, ...newIds]));
          return {
            ...c,
            teamIds: merged,
            teamCount: Math.max(c.teamCount || 0, merged.length),
          };
        });
      }

      let nextTeams =
        newTeams && newTeams.length > 0 ? [...prev.teams, ...newTeams] : prev.teams;

      // Automatically remember the stadium on the Home Team so future home matches auto-fill it!
      if (match.stadium && match.stadium.trim()) {
        const trimmedStadium = match.stadium.trim();
        nextTeams = nextTeams.map((t) =>
          t.id === match.homeTeamId ? { ...t, stadium: trimmedStadium } : t
        );
      }

      const exists = prev.matches.some((m) => m.id === match.id);
      const nextMatches = exists
        ? prev.matches.map((m) => (m.id === match.id ? match : m))
        : [match, ...prev.matches];

      return {
        ...prev,
        competitions: nextCompetitions,
        teams: nextTeams,
        matches: nextMatches,
      };
    });

    if (newTeams && newTeams.length > 0) {
      for (const nt of newTeams) {
        autoFetchLogoForTeam(nt);
      }
    }

    if (match.matchdayNumber && match.matchdayNumber > 0) {
      setSelectedMatchday(match.matchdayNumber);
    }

    if (editingMatch) {
      setEditingMatch(null);
      if (returnToScheduleAfterEdit) {
        setReturnToScheduleAfterEdit(false);
        setActiveTab('schedule');
      } else {
        setActiveTab('history');
      }
      showToast('Partita aggiornata e salvata sul disco!');
    }
  };

  const handleUpsertMatches = (matchesToSave: Match[]) => {
    if (matchesToSave.length === 0) return;
    persistUpdate((prev) => {
      const incomingMap = new Map<string, Match>();
      for (const m of matchesToSave) {
        incomingMap.set(m.id, m);
      }
      const updatedExisting = prev.matches.map((m) => incomingMap.get(m.id) || m);
      const existingIds = new Set(prev.matches.map((m) => m.id));
      const brandNew = matchesToSave.filter((m) => !existingIds.has(m.id));
      return {
        ...prev,
        matches: [...brandNew, ...updatedExisting],
      };
    });
  };

  const handleSaveCompetitionWithTeams = (
    comp: Competition,
    newlyCreatedTeams: Team[],
    updatedExistingTeams?: Team[]
  ) => {
    persistUpdate((prev) => {
      const updatedMap = new Map<string, Team>();
      if (updatedExistingTeams) {
        for (const ut of updatedExistingTeams) {
          updatedMap.set(ut.id, ut);
        }
      }

      const mergedExistingTeams = prev.teams.map((t) => updatedMap.get(t.id) || t);
      const nextTeams =
        newlyCreatedTeams.length > 0
          ? [...mergedExistingTeams, ...newlyCreatedTeams]
          : mergedExistingTeams;

      const exists = prev.competitions.some((c) => c.id === comp.id);
      const nextCompetitions = exists
        ? prev.competitions.map((c) => (c.id === comp.id ? comp : c))
        : [...prev.competitions, comp];

      // Propagate any renamed team names into existing matches as well
      const nextMatches =
        updatedMap.size > 0
          ? prev.matches.map((m) => {
              const homeRenamed = updatedMap.get(m.homeTeamId);
              const awayRenamed = updatedMap.get(m.awayTeamId);
              if (!homeRenamed && !awayRenamed) return m;
              return {
                ...m,
                homeTeamName: homeRenamed ? homeRenamed.name : m.homeTeamName,
                awayTeamName: awayRenamed ? awayRenamed.name : m.awayTeamName,
              };
            })
          : prev.matches;

      return {
        ...prev,
        teams: nextTeams,
        competitions: nextCompetitions,
        matches: nextMatches,
      };
    }, true);

    setSelectedCompetitionId(comp.id);
    showToast(
      `Campionato "${comp.name}" configurato con ${comp.teamIds?.length || comp.teamCount || 0} squadre!`
    );

    // Background fetch logos for newly created teams (first 8 to avoid rate limits)
    for (const nt of newlyCreatedTeams.slice(0, 8)) {
      autoFetchLogoForTeam(nt);
    }
  };

  const handleDeleteMatch = (matchId: string) => {
    persistUpdate(
      (prev) => ({
        ...prev,
        matches: prev.matches.filter((m) => m.id !== matchId),
      }),
      true
    );
    showToast('Partita rimossa dall’archivio.');
  };

  const handleClearAllMatches = () => {
    persistUpdate(
      (prev) => ({
        ...prev,
        matches: [],
      }),
      true
    );
    showToast('Archivio partite svuotato con successo.');
  };

  const handleLoadDemoMatches = () => {
    persistUpdate(
      (prev) => ({
        ...prev,
        matches: INITIAL_MATCHES,
      }),
      true
    );
    showToast('Partite di esempio caricate.');
  };

  const handleDuplicateMatch = (match: Match) => {
    const copy: Match = {
      ...match,
      id: `match-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingMatch(copy);
    setReturnToScheduleAfterEdit(false);
    setActiveTab('entry');
    showToast('Partita caricata nel modulo: modifica i dettagli e premi Salva!');
  };

  const handleUpdateTeamLogo = (
    teamId: string,
    logoUrl: string,
    colors?: { primary?: string; secondary?: string }
  ) => {
    persistUpdate((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              logoUrl: logoUrl || undefined,
              primaryColor: colors?.primary || t.primaryColor,
              secondaryColor: colors?.secondary || t.secondaryColor,
            }
          : t
      ),
    }));
    showToast('Stemma squadra aggiornato e salvato per l’uso offline!');
  };

  const handleUpdateCompetitionLogo = (compId: string, logoUrl: string) => {
    persistUpdate((prev) => ({
      ...prev,
      competitions: prev.competitions.map((c) =>
        c.id === compId ? { ...c, logoUrl: logoUrl || undefined } : c
      ),
    }));
    showToast('Logo competizione aggiornato e salvato!');
  };

  const handleSaveTeam = (team: Team, addToCompetitionId?: string) => {
    const isNew = !db.teams.some((t) => t.id === team.id);
    persistUpdate((prev) => {
      const exists = prev.teams.some((t) => t.id === team.id);
      const nextTeams = exists
        ? prev.teams.map((t) => (t.id === team.id ? team : t))
        : [...prev.teams, team];

      const nextCompetitions = addToCompetitionId
        ? prev.competitions.map((c) => {
            if (c.id !== addToCompetitionId) return c;
            const currentIds = c.teamIds || [];
            if (currentIds.includes(team.id)) return c;
            const merged = [...currentIds, team.id];
            return {
              ...c,
              teamIds: merged,
              teamCount: Math.max(c.teamCount || 0, merged.length),
            };
          })
        : prev.competitions;

      // Also propagate any renamed team name into existing matches
      const nextMatches = exists
        ? prev.matches.map((m) => {
            const isHome = m.homeTeamId === team.id;
            const isAway = m.awayTeamId === team.id;
            if (!isHome && !isAway) return m;
            return {
              ...m,
              homeTeamName: isHome ? team.name : m.homeTeamName,
              awayTeamName: isAway ? team.name : m.awayTeamName,
            };
          })
        : prev.matches;

      return {
        ...prev,
        teams: nextTeams,
        competitions: nextCompetitions,
        matches: nextMatches,
      };
    });
    showToast(`Squadra "${team.name}" salvata.`);
    if (isNew && !team.logoUrl) {
      autoFetchLogoForTeam(team);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== teamId),
    }));
  };

  const handleSaveCompetition = (comp: Competition) => {
    persistUpdate((prev) => {
      const exists = prev.competitions.some((c) => c.id === comp.id);
      return {
        ...prev,
        competitions: exists
          ? prev.competitions.map((c) => (c.id === comp.id ? comp : c))
          : [...prev.competitions, comp],
      };
    });
    showToast(`Competizione "${comp.name}" salvata.`);
  };

  const handleDeleteCompetition = (compId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      competitions: prev.competitions.filter((c) => c.id !== compId),
    }));
  };

  const handleBatchUpdateLogos = (
    teamLogos: Record<string, string>,
    compLogos: Record<string, string>
  ) => {
    persistUpdate((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (teamLogos[t.id] ? { ...t, logoUrl: teamLogos[t.id] } : t)),
      competitions: prev.competitions.map((c) =>
        compLogos[c.id] ? { ...c, logoUrl: compLogos[c.id] } : c
      ),
    }));
  };

  const handleExportExcel = async () => {
    setExportMenuOpen(false);
    const res = await exportToExcelWorkbook(db);
    if (res.success) {
      showToast(`Esportato in Excel con successo!`);
    } else if (res.error) {
      showToast(`Errore esportazione: ${res.error}`);
    }
  };

  const handleExportCsv = async () => {
    setExportMenuOpen(false);
    const res = await exportToCsvFile(db);
    if (res.success) {
      showToast(`File CSV esportato con successo!`);
    }
  };

  const handleExportBackupJson = async () => {
    setExportMenuOpen(false);
    const res = await exportJsonBackupFile(db);
    if (res.success) {
      showToast(`Backup completo JSON salvato con successo!`);
    }
  };

  const handleImportFile = async () => {
    const res = await importBackupOrExcel(db);
    if (res.success && res.updatedDb) {
      const saved = await saveDatabase(res.updatedDb, true);
      setDb(saved);
      const info = await getStorageInfo(saved);
      setStorageInfo(info);
      showToast(res.message || 'Importazione completata con successo!');
      setActiveTab('history');
    } else if (res.error) {
      showToast(res.error);
    }
  };

  const lastSavedTimeStr = (() => {
    try {
      return new Date(db.lastSavedAt).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Ora';
    }
  })();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-studio-dark text-slate-900 dark:text-slate-100 flex flex-col">
      {/* PERSISTENT HEADER & EXCEL/BACKUP SAFETY BAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <img
              src="./app-icon.jpg"
              alt="Almanacco Sportivo"
              className="w-11 h-11 rounded-2xl object-cover shadow-md shadow-emerald-600/20 border border-emerald-500/30"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Almanacco Sportivo
                </h1>
                <button
                  type="button"
                  onClick={openBackupFolder}
                  title="Tutti i dati sono salvati automaticamente sul PC. Clicca per aprire la cartella dei backup in Documenti."
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Salvato ({lastSavedTimeStr})
                </button>
                <button
                  type="button"
                  onClick={() => handleManualUpdateCheck(false)}
                  disabled={isCheckingUpdate}
                  title="Controlla se è disponibile una nuova versione su GitHub"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  v{updateInfo?.currentVersion || CURRENT_APP_VERSION}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangelogModalMode(
                      updateInfo?.updateAvailable ? 'update-available' : 'whats-new'
                    );
                    setIsChangelogModalOpen(true);
                  }}
                  title="Visualizza tutte le novità e le modifiche introdotte negli aggiornamenti"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Novità
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calendario Giornate, Risultati, Marcatori, Classifiche & Archivio Storico
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendario & Giornate
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              {editingMatch ? 'Modifica Partita' : 'Partita Singola'}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              Storico Partite
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'history'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {db.matches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              Classifiche & Marcatori
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              Campionati & Squadre
            </button>
          </nav>

          {/* Right Action Bar: Excel Export, Import, Font Scale & Theme */}
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((o) => !o)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Esporta Excel
              </button>

              {exportMenuOpen && (
                <div
                  onMouseLeave={() => setExportMenuOpen(false)}
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50"
                >
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>Cartella Excel Completa (.xlsx)</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        Fogli Partite, Gol e Classifica Marcatori
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-sky-600" />
                    <div>
                      <div>Tabella CSV per Excel (.csv)</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        Formato tabellare universale
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBackupJson}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-700 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <div>
                      <div>Salva Backup Completo (.json)</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        Include partite, squadre e stemmi
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Import Excel or Backup */}
            <button
              type="button"
              onClick={handleImportFile}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Importa partite da un file Excel (.xlsx / .csv) o ripristina un Backup (.json)"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Importa
            </button>

            {/* Font Comfort Toggle */}
            <button
              type="button"
              onClick={() =>
                persistUpdate((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    fontScale: prev.settings.fontScale === 'normal' ? 'large' : 'normal',
                  },
                }))
              }
              className={`px-2.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                db.settings.fontScale === 'large'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title="Ingrandisci o riduci la dimensione del testo per una lettura più comoda"
            >
              <Type className="w-4 h-4" />
              <span>{db.settings.fontScale === 'large' ? 'A+' : 'A'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() =>
                persistUpdate((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
                  },
                }))
              }
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition cursor-pointer"
              title={
                db.settings.theme === 'dark'
                  ? 'Passa al Tema Chiaro (Giorno)'
                  : 'Passa al Tema Scuro (Stadio Notturno)'
              }
            >
              {db.settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Banner Aggiornamento Disponibile */}
      {updateInfo?.updateAvailable && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                È disponibile una nuova versione di Almanacco Sportivo (v{updateInfo.latestVersion})!
                Tutte le tue partite e i tuoi dati resteranno salvati.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChangelogModalMode('update-available');
                  setIsChangelogModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer"
              >
                Vedi Modifiche
              </button>
              {updateInfo.downloadUrl && (
                <button
                  type="button"
                  disabled={isInstallingUpdate}
                  onClick={handleInstallUpdateNow}
                  className="px-4 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  {isInstallingUpdate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {isInstallingUpdate ? 'Download in corso...' : 'Scarica e Aggiorna Ora'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md px-5 py-3.5 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-sm shadow-2xl border border-slate-700 dark:border-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'schedule' && (
          <MatchdayScheduleView
            competitions={db.competitions}
            teams={db.teams}
            matches={db.matches}
            defaultSeason={db.settings.defaultSeason}
            selectedCompetitionId={selectedCompetitionId}
            onSelectCompetitionId={(newCompId) => {
              setSelectedCompetitionId(newCompId);
              setSelectedMatchday(1);
            }}
            selectedDay={selectedMatchday}
            onSelectDay={setSelectedMatchday}
            onSaveCompetition={handleSaveCompetition}
            onOpenNewCompetitionWizard={() => {
              setEditingCompForWizard(null);
              setIsCompWizardOpen(true);
            }}
            onOpenEditCompetitionWizard={(comp) => {
              setEditingCompForWizard(comp);
              setIsCompWizardOpen(true);
            }}
            onOpenMatchDetails={(m) => {
              if (m.matchdayNumber && m.matchdayNumber > 0) {
                setSelectedMatchday(m.matchdayNumber);
              }
              setEditingMatch(m);
              setReturnToScheduleAfterEdit(true);
              setActiveTab('entry');
            }}
            onUpsertMatches={handleUpsertMatches}
            onDeleteMatch={handleDeleteMatch}
          />
        )}

        {activeTab === 'entry' && (
          <MatchEntryView
            competitions={db.competitions}
            teams={db.teams}
            matches={db.matches}
            defaultSeason={db.settings.defaultSeason}
            defaultCompetitionId={selectedCompetitionId || db.settings.defaultCompetitionId}
            autoSyncScoreDefault={db.settings.autoSyncScoreFromGoals}
            editingMatch={editingMatch}
            onSaveMatch={handleSaveMatch}
            onUpdateTeamLogo={handleUpdateTeamLogo}
            onUpdateCompetitionLogo={handleUpdateCompetitionLogo}
            onOpenNewCompetitionWizard={() => {
              setEditingCompForWizard(null);
              setIsCompWizardOpen(true);
            }}
            onCancelEdit={() => {
              setEditingMatch(null);
              if (returnToScheduleAfterEdit) {
                setReturnToScheduleAfterEdit(false);
                setActiveTab('schedule');
              } else {
                setActiveTab('history');
              }
            }}
          />
        )}

        {activeTab === 'history' && (
          <MatchHistoryView
            matches={db.matches}
            teams={db.teams}
            competitions={db.competitions}
            onEditMatch={(m) => {
              setEditingMatch(m);
              setReturnToScheduleAfterEdit(false);
              setActiveTab('entry');
            }}
            onDuplicateMatch={handleDuplicateMatch}
            onDeleteMatch={handleDeleteMatch}
            onClearAllMatches={handleClearAllMatches}
            onLoadDemoMatches={handleLoadDemoMatches}
          />
        )}

        {activeTab === 'stats' && (
          <StatsAndLeaderboardView
            matches={db.matches}
            teams={db.teams}
            competitions={db.competitions}
            onSaveCompetition={handleSaveCompetition}
          />
        )}

        {activeTab === 'teams' && (
          <TeamsAndCompetitionsView
            teams={db.teams}
            competitions={db.competitions}
            storageInfo={storageInfo}
            onSaveTeam={handleSaveTeam}
            onDeleteTeam={handleDeleteTeam}
            onSaveCompetition={handleSaveCompetition}
            onDeleteCompetition={handleDeleteCompetition}
            onBatchUpdateLogos={handleBatchUpdateLogos}
            onOpenNewCompetitionWizard={() => {
              setEditingCompForWizard(null);
              setIsCompWizardOpen(true);
            }}
            onOpenEditCompetitionWizard={(comp) => {
              setEditingCompForWizard(comp);
              setIsCompWizardOpen(true);
            }}
            onClearAllMatches={handleClearAllMatches}
          />
        )}
      </main>

      {/* Global Wizard Modal for Creating/Editing a Championship with its Enrolled Teams */}
      <CompetitionWizardModal
        isOpen={isCompWizardOpen}
        editingCompetition={editingCompForWizard}
        allTeams={db.teams}
        defaultSeason={db.settings.defaultSeason}
        onClose={() => {
          setIsCompWizardOpen(false);
          setEditingCompForWizard(null);
        }}
        onSaveCompetitionWithTeams={handleSaveCompetitionWithTeams}
      />

      {/* Update Notification & Post-Update Changelog ("Novità dell'Aggiornamento") Modal */}
      <UpdateAndChangelogModal
        isOpen={isChangelogModalOpen}
        mode={changelogModalMode}
        currentVersion={updateInfo?.currentVersion || CURRENT_APP_VERSION}
        updateInfo={updateInfo}
        isInstallingUpdate={isInstallingUpdate}
        updateDownloadPercent={isInstallingUpdate ? 65 : 0}
        onInstallUpdate={handleInstallUpdateNow}
        onClose={() => {
          setIsChangelogModalOpen(false);
          if (db.settings.lastSeenVersion !== CURRENT_APP_VERSION) {
            persistUpdate((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                lastSeenVersion: CURRENT_APP_VERSION,
              },
            }));
          }
        }}
      />
    </div>
  );
};
