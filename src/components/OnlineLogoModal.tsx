import React, { useEffect, useState } from 'react';
import { Globe, Upload, Link2, Check, X, Loader2, Search, Shield, Sparkles } from 'lucide-react';
import { OnlineLogoSearchResult } from '../types';
import {
  fetchAndCacheLogoUrl,
  pickLocalLogoFile,
  searchLogosOnline,
} from '../services/storageService';

interface OnlineLogoModalProps {
  isOpen: boolean;
  initialQuery: string;
  targetTitle: string;
  currentLogoUrl?: string;
  onClose: () => void;
  onSelectLogo: (dataUrl: string, colors?: { primary?: string; secondary?: string }) => void;
}

export const OnlineLogoModal: React.FC<OnlineLogoModalProps> = ({
  isOpen,
  initialQuery,
  targetTitle,
  currentLogoUrl,
  onClose,
  onSelectLogo,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<OnlineLogoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setErrorMsg(null);
      if (initialQuery.trim()) {
        handleSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const found = await searchLogosOnline(searchTerm.trim());
      setResults(found);
      if (found.length === 0) {
        setErrorMsg(
          'Nessuno stemma trovato con questo nome. Prova a cercare il nome ufficiale del club (es. "AC Milan", "SSC Napoli", "Serie A") oppure incolla un link immagine qui sotto.'
        );
      }
    } catch {
      setErrorMsg('Impossibile contattare il servizio di ricerca online. Verifica la connessione internet.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickResult = async (item: OnlineLogoSearchResult) => {
    setDownloadingId(item.id);
    setErrorMsg(null);
    try {
      const cached = item.dataUrl?.startsWith('data:image/')
        ? item.dataUrl
        : await fetchAndCacheLogoUrl(item.imageUrl);
      if (cached) {
        onSelectLogo(cached, {
          primary: item.primaryColor,
          secondary: item.secondaryColor,
        });
        onClose();
      } else {
        setErrorMsg('Impossibile scaricare questa immagine. Prova un altro risultato.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customUrl.trim()) return;
    setDownloadingId('custom-url');
    setErrorMsg(null);
    try {
      const cached = await fetchAndCacheLogoUrl(customUrl.trim());
      if (cached) {
        onSelectLogo(cached);
        onClose();
      } else {
        setErrorMsg('Link immagine non valido o non raggiungibile.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUploadFromPc = async () => {
    const dataUrl = await pickLocalLogoFile();
    if (dataUrl) {
      onSelectLogo(dataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Stemma & Logo — {targetTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cerca su Internet (TheSportsDB & Wikipedia) o carica dal computer. Lo stemma viene salvato anche offline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Online Search Bar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Cerca Stemma Ufficiale su Internet
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(query);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Es. Inter, Juventus, Real Madrid, Serie A..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Cerca Online
              </button>
            </form>
          </div>

          {/* Search Results Grid */}
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-sm font-medium">
                Ricerca stemmi ufficiali su TheSportsDB e Wikipedia in corso...
              </span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Clicca su uno stemma per scaricarlo e salvarlo
                </span>
                <span className="text-xs text-slate-400">{results.length} risultati trovati</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePickResult(item)}
                    disabled={downloadingId === item.id}
                    className="group p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 flex flex-col items-center text-center gap-2 transition cursor-pointer relative"
                  >
                    <div className="w-16 h-16 rounded-lg bg-white dark:bg-slate-800 p-1.5 flex items-center justify-center shadow-xs border border-slate-100 dark:border-slate-700">
                      <img
                        src={item.dataUrl || item.imageUrl}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="w-full">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    {downloadingId === item.id && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Alternative Options: Upload from PC or Direct Image Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                2. Carica File dal Computer
              </label>
              <button
                type="button"
                onClick={handleUploadFromPc}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                Scegli Immagine dal PC (.png, .svg, .jpg)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                3. Oppure Incolla URL Immagine Web
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  disabled={!customUrl.trim() || downloadingId === 'custom-url'}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-emerald-600 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  Usa Link
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          {currentLogoUrl ? (
            <button
              type="button"
              onClick={() => {
                onSelectLogo('');
                onClose();
              }}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Ripristina Scudetto Vettoriale Predefinito
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Gli stemmi scaricati restano salvati anche senza internet.
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
