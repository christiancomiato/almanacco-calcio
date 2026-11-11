import React from 'react';
import {
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle2,
  X,
  ArrowUpCircle,
  ShieldCheck,
  History,
} from 'lucide-react';

export interface UpdateModalInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string | null;
  assetName?: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CHANGELOG_HISTORY: ChangelogRelease[] = [
  {
    version: '1.2.0',
    date: 'Novembre 2026',
    title: 'Almanacco Sportivo, Modifica Nomi Squadre, Punti di Penalità & Nuovo Logo',
    highlights: [
      '🏆 Cambio Nome in "Almanacco Sportivo" & Nuova Icona Ufficiale: nuovo logo ufficiale sul Desktop, nella barra di Windows e nell’intestazione dell’app, pronta per accogliere anche altri sport nei prossimi aggiornamenti.',
      '✏️ Modifica Libera del Nome Squadra (Maiuscole/Minuscole): ora puoi correggere in qualsiasi momento il nome di una squadra già inserita (es. da "napoli" a "Napoli") sia dalla scheda "Squadre & Competizioni" (tasto Modifica su ogni squadra) sia da "Modifica Squadre" nel Calendario, con tasto rapido "Aa" per le iniziali maiuscole. Il nome si aggiorna in automatico anche in tutte le partite e classifiche!',
      '⚖️ Punti di Penalità in Classifica: nella sezione "Statistiche & Classifiche → Classifica Squadre", clicca sul pulsante nella colonna "Penalità" di qualsiasi squadra per assegnare o rimuovere punti di penalizzazione (es. -1, -2, -4, -10 pt) con motivazione opzionale.',
      '🔔 Notifica Aggiornamenti & Finestra "Novità dell’Aggiornamento": all’apertura dell’app viene mostrato un avviso chiaro quando c’è un nuovo aggiornamento disponibile e, dopo ogni aggiornamento installato, compare automaticamente il riepilogo illustrato di tutte le modifiche effettuate.',
    ],
  },
  {
    version: '1.1.1',
    date: 'Novembre 2026',
    title: 'Range Date Giornata, Stadio Automatico & Memoria Giornata Selezionata',
    highlights: [
      '📅 Intervallo Date per Giornata (Dal ... Al ...) + "Vai a data": ogni giornata mostra l’intervallo completo delle date (es. Dal 10 al 14) e scegliendo un giorno qualsiasi nel selettore "Vai a data" si apre subito l’intera giornata corrispondente.',
      '🏟️ Stadio di Casa Automatico: quando inserisci lo stadio di una squadra di casa, viene memorizzato e compilato automaticamente per tutte le successive partite casalinghe di quella squadra (restando sempre modificabile).',
      '📌 Mantiene la Giornata Selezionata dopo il Salvataggio: modificando una partita della 5ª o 12ª giornata, al salvataggio rimani esattamente nella giornata in cui stavi lavorando senza tornare alla 1ª Giornata.',
      '🔢 Numero Squadre Campionati sempre sincronizzato nel badge di Calendario & Giornate.',
    ],
  },
  {
    version: '1.1.0',
    date: 'Novembre 2026',
    title: 'Calendario & Giornate Intere, Girone di Ritorno Automatico & Wizard Campionati',
    highlights: [
      '🗓️ Vista "Calendario & Giornate": inserisci tutte le partite di una giornata in un’unica schermata e genera con 1 clic l’intero Girone di Ritorno invertendo Casa/Trasferta.',
      '🧙 Creazione Rapida Campionato con Elenco Squadre: imposta il numero di squadre (es. 18 o 20) e inserisci subito la rosa ufficiale del campionato.',
      '🔒 Filtro Intelligente Squadre per Campionato: selezionando una competizione compaiono solo le squadre iscritte a quel torneo, senza preselezione forzata Inter-Milan.',
      '⏱️ Inserimento Minuto Facilitato: campo minuto libero (es. 25, 45+2, 90+4) con pulsanti rapidi.',
    ],
  },
  {
    version: '1.0.1',
    date: 'Novembre 2026',
    title: 'Svuota Dati di Esempio & Aggiornamenti Automatici con 1 Clic',
    highlights: [
      '🧹 Pulsante "Svuota Archivio" per eliminare i dati dimostrativi iniziali e partire da zero.',
      '🔄 Sistema di aggiornamento automatico integrato collegato a GitHub Releases.',
    ],
  },
];

interface UpdateAndChangelogModalProps {
  isOpen: boolean;
  mode: 'update-available' | 'whats-new';
  currentVersion: string;
  updateInfo: UpdateModalInfo | null;
  isInstallingUpdate: boolean;
  updateDownloadPercent: number;
  onInstallUpdate: () => void;
  onClose: () => void;
}

export const UpdateAndChangelogModal: React.FC<UpdateAndChangelogModalProps> = ({
  isOpen,
  mode,
  currentVersion,
  updateInfo,
  isInstallingUpdate,
  updateDownloadPercent,
  onInstallUpdate,
  onClose,
}) => {
  if (!isOpen) return null;

  const isUpdatePrompt = mode === 'update-available' && updateInfo?.updateAvailable;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            isUpdatePrompt
              ? 'bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 text-white border-indigo-500/30'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white border-emerald-500/30'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/25 shadow-md shrink-0 overflow-hidden">
              <img
                src="./app-icon.jpg"
                alt="Almanacco Sportivo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <Sparkles className="w-6 h-6 text-white hidden" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-black uppercase tracking-wider mb-1">
                {isUpdatePrompt ? (
                  <>
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    Nuovo Aggiornamento Disponibile
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Novità & Cronologia Aggiornamenti
                  </>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight">
                {isUpdatePrompt
                  ? `Aggiornamento v${updateInfo?.latestVersion} Pronto da Installare!`
                  : `Novità di Almanacco Sportivo v${currentVersion}`}
              </h2>
            </div>
          </div>

          {!isInstallingUpdate && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isUpdatePrompt && updateInfo ? (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Passaggio da v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />I tuoi campionati e partite restano salvati al
                  100%
                </span>
              </div>

              {updateInfo.releaseNotes && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  <div className="font-extrabold text-slate-900 dark:text-white mb-1">
                    Note di Rilascio Ufficiali:
                  </div>
                  {updateInfo.releaseNotes}
                </div>
              )}

              {isInstallingUpdate && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Download e installazione automatica in corso...
                    </span>
                    <span>{updateDownloadPercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-indigo-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.max(8, updateDownloadPercent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Attendere qualche secondo: l’applicazione si chiuderà e si riaprirà da sola
                    appena completato l’aggiornamento.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <strong>Aggiornamento installato con successo!</strong> Qui sotto trovi spiegate
                in modo semplice tutte le nuove funzioni aggiunte in questa versione e nelle
                precedenti.
              </div>
            </div>
          )}

          {/* Detailed Release History in Italian */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
              <History className="w-4 h-4 text-emerald-500" />
              Dettaglio Modifiche per Versione
            </div>

            {CHANGELOG_HISTORY.map((rel, idx) => {
              const isCurrent = rel.version === currentVersion;
              return (
                <div
                  key={rel.version}
                  className={`p-4 rounded-2xl border transition ${
                    isCurrent || idx === 0
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-emerald-500/50 shadow-xs'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          isCurrent || idx === 0
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Versione {rel.version}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          • In uso ora
                        </span>
                      )}
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {rel.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{rel.date}</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rel.highlights.map((item, i) => (
                      <li
                        key={i}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/60"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Almanacco Sportivo v{currentVersion}
          </div>

          <div className="flex items-center gap-2.5">
            {isUpdatePrompt ? (
              <>
                {!isInstallingUpdate && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Più tardi
                  </button>
                )}
                <button
                  type="button"
                  disabled={isInstallingUpdate}
                  onClick={onInstallUpdate}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isInstallingUpdate ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Installazione in corso ({updateDownloadPercent}%)...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Scarica e Installa Aggiornamento Ora
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm cursor-pointer"
              >
                Perfetto, Inizia!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
