import React, { useState } from 'react';
import {
  CheckCircle2,
  FolderOpen,
  Globe,
  HardDrive,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Competition, StorageInfo, Team } from '../types';
import { CompetitionBadge, TeamCrest } from './TeamCrest';
import { OnlineLogoModal } from './OnlineLogoModal';
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
  onSaveTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onSaveCompetition: (comp: Competition) => void;
  onDeleteCompetition: (compId: string) => void;
  onBatchUpdateLogos: (
    teamLogos: Record<string, string>,
    compLogos: Record<string, string>
  ) => void;
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
  onClearAllMatches,
}) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');
  const [newTeamPrimary, setNewTeamPrimary] = useState('#0284c7');
  const [newTeamSecondary, setNewTeamSecondary] = useState('#ffffff');
  const [newTeamStyle, setNewTeamStyle] = useState<Team['crestStyle']>('stripes');

  const [newCompName, setNewCompName] = useState('');
  const [newCompCountry, setNewCompCountry] = useState('Italia');
  const [newCompColor, setNewCompColor] = useState('#0284c7');

  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const [logoModalTarget, setLogoModalTarget] = useState<{
    kind: 'team' | 'competition';
    item: Team | Competition;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const created: Team = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      shortCode: (newTeamShort.trim() || newTeamName.trim().slice(0, 3)).toUpperCase(),
      primaryColor: newTeamPrimary,
      secondaryColor: newTeamSecondary,
      crestStyle: newTeamStyle,
    };
    onSaveTeam(created);
    setNewTeamName('');
    setNewTeamShort('');
  };

  const handleAddCompetition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    const created: Competition = {
      id: `comp-${Date.now()}`,
      name: newCompName.trim(),
      shortName: newCompName.trim().slice(0, 3).toUpperCase(),
      country: newCompCountry.trim() || 'Italia',
      accentColor: newCompColor,
    };
    onSaveCompetition(created);
    setNewCompName('');
  };

  const handleBatchDownloadMissingLogos = async () => {
    const missingTeams = teams.filter((t) => !t.logoUrl);
    const missingComps = competitions.filter((c) => !c.logoUrl);
    const total = missingTeams.length + missingComps.length;

    if (total === 0) {
      setBatchProgress('Tutti i club e le competizioni hanno già uno stemma salvato!');
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
      const countFound = Object.keys(foundTeamLogos).length + Object.keys(foundCompLogos).length;
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
      {/* 1. Internet Logo Auto-Downloader Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white rounded-2xl p-6 border border-emerald-500/30 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
            <Globe className="w-4 h-4" />
            Stemmi Club & Loghi Campionati da Internet
          </div>
          <h3 className="text-xl font-black">
            Personalizza ogni Squadra e Competizione con il suo Stemma Ufficiale
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Puoi cliccare su <strong>“Cerca Stemma”</strong> su qualsiasi squadra qui sotto per scegliere il logo da Internet (Wikipedia / TheSportsDB) o caricarlo dal computer, oppure scaricare automaticamente tutti gli stemmi mancanti con un solo clic. Una volta scaricati, restano salvati sul PC anche senza internet.
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
            Scarica Automaticamente Tutti gli Stemmi Mancanti
          </button>
          {batchProgress && (
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {batchProgress}
            </span>
          )}
        </div>
      </div>

      {/* 2. SQUADRE SECTION */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Elenco Squadre ({teams.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clicca sullo stemma o sul pulsante <strong>Stemma Online</strong> per scaricare il logo ufficiale del club.
            </p>
          </div>

          {/* Quick Add Team Form */}
          <form onSubmit={handleAddTeam} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Nuova squadra (es. Sampdoria)..."
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
            <input
              type="text"
              maxLength={3}
              value={newTeamShort}
              onChange={(e) => setNewTeamShort(e.target.value)}
              placeholder="Sigla (SAM)"
              className="w-24 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-center text-slate-900 dark:text-white"
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
              className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="stripes">Strisce</option>
              <option value="solid">Tinta Unita</option>
              <option value="halves"> Bicolore</option>
              <option value="hoops">Fasce</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Squadra
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {teams.map((t) => (
            <div
              key={t.id}
              className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500/60 flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <TeamCrest
                  team={t}
                  size="md"
                  onClick={() => setLogoModalTarget({ kind: 'team', item: t })}
                />
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {t.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {t.shortCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogoModalTarget({ kind: 'team', item: t })}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />
                      {t.logoUrl ? 'Cambia Logo' : 'Cerca Logo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="color"
                  value={t.primaryColor}
                  onChange={(e) => onSaveTeam({ ...t, primaryColor: e.target.value })}
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
          ))}
        </div>
      </div>

      {/* 3. COMPETIZIONI SECTION */}
      <div className="bg-white dark:bg-studio-card border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              Campionati e Coppe ({competitions.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestisci i tornei e scarica i loghi ufficiali delle competizioni.
            </p>
          </div>

          <form onSubmit={handleAddCompetition} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newCompName}
              onChange={(e) => setNewCompName(e.target.value)}
              placeholder="Nome torneo (es. Supercoppa)..."
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={newCompCountry}
              onChange={(e) => setNewCompCountry(e.target.value)}
              placeholder="Nazione/Area"
              className="w-28 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            />
            <input
              type="color"
              value={newCompColor}
              onChange={(e) => setNewCompColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border-0"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Torneo
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {competitions.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CompetitionBadge competition={c} size="lg" showName={false} />
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {c.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{c.country}</span>
                    <button
                      type="button"
                      onClick={() => setLogoModalTarget({ kind: 'competition', item: c })}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />
                      {c.logoUrl ? 'Cambia Logo' : 'Cerca Logo'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteCompetition(c.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                title="Rimuovi competizione"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
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
            {onClearAllMatches && (
              confirmClearAll ? (
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
              )
            )}
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

      {/* Logo Picker Modal */}
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
