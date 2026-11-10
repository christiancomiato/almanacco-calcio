import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ListChecks,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { Competition, Team } from '../types';

interface CompetitionWizardModalProps {
  isOpen: boolean;
  editingCompetition?: Competition | null;
  allTeams: Team[];
  defaultSeason: string;
  onClose: () => void;
  onSaveCompetitionWithTeams: (
    competition: Competition,
    newlyCreatedTeams: Team[]
  ) => void;
}

const TEAM_COUNT_PRESETS = [20, 18, 16, 14, 12, 10, 8, 6, 4];

const PALETTE_COLORS = [
  { primary: '#0284c7', secondary: '#ffffff' },
  { primary: '#dc2626', secondary: '#111827' },
  { primary: '#16a34a', secondary: '#ffffff' },
  { primary: '#1e3a8a', secondary: '#facc15' },
  { primary: '#7c3aed', secondary: '#ffffff' },
  { primary: '#ea580c', secondary: '#111827' },
  { primary: '#be123c', secondary: '#1d4ed8' },
  { primary: '#0f172a', secondary: '#f8fafc' },
];

export const CompetitionWizardModal: React.FC<CompetitionWizardModalProps> = ({
  isOpen,
  editingCompetition,
  allTeams,
  defaultSeason,
  onClose,
  onSaveCompetitionWithTeams,
}) => {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('Italia');
  const [season, setSeason] = useState(defaultSeason || '2026/27');
  const [accentColor, setAccentColor] = useState('#0284c7');
  const [teamCount, setTeamCount] = useState(20);
  const [hasReturnLeg, setHasReturnLeg] = useState(true);
  const [teamNames, setTeamNames] = useState<string[]>(Array(20).fill(''));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (editingCompetition) {
      setName(editingCompetition.name);
      setCountry(editingCompetition.country || 'Italia');
      setSeason(editingCompetition.season || defaultSeason || '2026/27');
      setAccentColor(editingCompetition.accentColor || '#0284c7');
      const enrolledTeams = (editingCompetition.teamIds || [])
        .map((id) => allTeams.find((t) => t.id === id)?.name || '')
        .filter(Boolean);
      const count = Math.max(
        2,
        editingCompetition.teamCount || enrolledTeams.length || 20
      );
      const evenCount = count % 2 === 0 ? count : count + 1;
      setTeamCount(evenCount);
      setHasReturnLeg(
        editingCompetition.hasReturnLeg !== undefined
          ? editingCompetition.hasReturnLeg
          : true
      );
      const slots = Array.from(
        { length: evenCount },
        (_, idx) => enrolledTeams[idx] || ''
      );
      setTeamNames(slots);
    } else {
      setName('');
      setCountry('Italia');
      setSeason(defaultSeason || '2026/27');
      setAccentColor('#0284c7');
      setTeamCount(20);
      setHasReturnLeg(true);
      setTeamNames(Array(20).fill(''));
    }
  }, [isOpen, editingCompetition, allTeams, defaultSeason]);

  if (!isOpen) return null;

  const handleChangeTeamCount = (newCountRaw: number) => {
    const clamped = Math.max(2, Math.min(40, newCountRaw));
    const evenCount = clamped % 2 === 0 ? clamped : clamped + 1;
    setTeamCount(evenCount);
    setTeamNames((prev) =>
      Array.from({ length: evenCount }, (_, i) => prev[i] || '')
    );
  };

  const handleTeamSlotChange = (index: number, value: string) => {
    setTeamNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSlotKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index + 1 < teamCount) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const filledTeamsCount = teamNames.filter((n) => n.trim().length > 0).length;
  const matchesPerDay = Math.floor(teamCount / 2);
  const andataDays = Math.max(1, teamCount - 1);
  const totalDays = hasReturnLeg ? andataDays * 2 : andataDays;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Inserisci il nome del campionato o della competizione (es. Serie A, Serie B, Premier League).');
      return;
    }

    const cleanedNames = teamNames.map((n) => n.trim()).filter(Boolean);
    if (cleanedNames.length < 2) {
      setErrorMsg('Inserisci almeno 2 squadre partecipanti al campionato.');
      return;
    }

    // Check duplicate team names inside the same competition
    const seen = new Set<string>();
    for (const tName of cleanedNames) {
      const lower = tName.toLowerCase();
      if (seen.has(lower)) {
        setErrorMsg(`La squadra "${tName}" è stata inserita più di una volta nell'elenco.`);
        return;
      }
      seen.add(lower);
    }

    const compId = editingCompetition
      ? editingCompetition.id
      : `comp-${Date.now()}`;

    const newlyCreatedTeams: Team[] = [];
    const enrolledTeamIds: string[] = [];

    cleanedNames.forEach((tName, idx) => {
      // Check if a team with this name already exists in the database
      const existing = allTeams.find(
        (t) => t.name.trim().toLowerCase() === tName.toLowerCase()
      );
      if (existing) {
        enrolledTeamIds.push(existing.id);
      } else {
        const colors = PALETTE_COLORS[idx % PALETTE_COLORS.length];
        const newTeam: Team = {
          id: `team-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          name: tName,
          shortCode: tName
            .replace(/[^a-zA-Z]/g, '')
            .slice(0, 3)
            .toUpperCase() || 'CLB',
          cityOrCountry: country,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          defaultCompetitionId: compId,
          crestStyle: idx % 2 === 0 ? 'stripes' : 'solid',
        };
        newlyCreatedTeams.push(newTeam);
        enrolledTeamIds.push(newTeam.id);
      }
    });

    const finalTeamCount = teamCount % 2 === 0 ? teamCount : teamCount + 1;

    const savedComp: Competition = {
      id: compId,
      name: name.trim(),
      shortName: name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase(),
      country: country.trim() || 'Italia',
      accentColor,
      logoUrl: editingCompetition?.logoUrl,
      isFavorite: true,
      type: 'league',
      teamCount: finalTeamCount,
      hasReturnLeg,
      season: season.trim() || defaultSeason,
      teamIds: enrolledTeamIds,
      matchdayDateRanges: editingCompetition?.matchdayDateRanges,
    };

    onSaveCompetitionWithTeams(savedComp, newlyCreatedTeams);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {editingCompetition
                  ? `Configura Campionato & Squadre — ${editingCompetition.name}`
                  : 'Crea Nuovo Campionato / Competizione'}
              </h2>
              <p className="text-xs text-emerald-100">
                Imposta il numero di squadre e i loro nomi: il programma calcolerà automaticamente tutte le giornate d&apos;andata e ritorno.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <datalist id="wizard-existing-teams">
            {allTeams.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-sm font-bold">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Competition Info & Number of Teams */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80">
            <div className="md:col-span-5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                1. Nome del Campionato *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Serie A, Serie B, Premier League..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Nazione / Area
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Es. Italia"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Stagione
              </label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2026/27"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Colore Badge
              </label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full h-11 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-600 p-1 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Number of Teams Selector */}
            <div className="md:col-span-7 pt-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                2. Numero di Squadre nel Campionato
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {TEAM_COUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleChangeTeamCount(preset)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                      teamCount === preset
                        ? 'bg-emerald-600 text-white shadow-sm scale-105'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                    }`}
                  >
                    {preset} Squadre
                  </button>
                ))}
              </div>
            </div>

            {/* Return Leg Toggle */}
            <div className="md:col-span-5 pt-2 flex flex-col justify-end">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasReturnLeg}
                  onChange={(e) => setHasReturnLeg(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-emerald-600"
                />
                <div className="text-xs">
                  <div className="font-extrabold text-emerald-950 dark:text-emerald-200">
                    Genera Girone di Ritorno Automatico
                  </div>
                  <div className="text-emerald-800/80 dark:text-emerald-300/80 text-[11px]">
                    Inverte automaticamente Casa/Ospite per le giornate di ritorno
                  </div>
                </div>
              </label>
            </div>

            {/* Live Calendar Formula Summary */}
            <div className="md:col-span-12 pt-1">
              <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>
                    Struttura Calendario: <strong>{teamCount} Squadre</strong> ={' '}
                    <strong className="text-emerald-400">
                      {matchesPerDay} partite per ogni Giornata
                    </strong>
                  </span>
                </div>
                <div className="text-slate-300">
                  {hasReturnLeg ? (
                    <>
                      <strong>{andataDays} Giornate d&apos;Andata</strong> +{' '}
                      <strong>{andataDays} di Ritorno</strong> ={' '}
                      <strong className="text-amber-400">{totalDays} Giornate Totali</strong>
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-400">{totalDays} Giornate Totali</strong> (Solo Andata)
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Numbered Team Inputs */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-600" />
                  3. Elenco delle {teamCount} Squadre Iscritte ({filledTeamsCount}/{teamCount} inserite)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Scrivi i nomi delle squadre di questo campionato (premi <strong>Invio</strong> per passare alla casella successiva). Solo queste squadre compariranno quando compili le giornate di questo campionato!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTeamNames(Array(teamCount).fill(''))}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Svuota caselle
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {teamNames.map((val, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <input
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    list="wizard-existing-teams"
                    value={val}
                    onChange={(e) => handleTeamSlotChange(idx, e.target.value)}
                    onKeyDown={(e) => handleSlotKeyDown(e, idx)}
                    placeholder={`Squadra ${idx + 1}...`}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="submit"
              className="px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              {editingCompetition
                ? 'Salva Modifiche al Campionato'
                : 'Crea Campionato e Calendario Giornate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
