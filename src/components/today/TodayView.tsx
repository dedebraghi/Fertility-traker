import React, { useState, useEffect, useMemo } from 'react';
import { Cycle, DailyEntry, BbtMethod, FullCycleItem, CycleStatistics } from '../../types';
import { TemperaturePicker } from './TemperaturePicker';
import { VisualChipsPicker } from './VisualChipsPicker';
import {
  calculateDateForDay,
  formatDateItalian,
  calculateDayFromDate,
  isMenstrualFlow,
  getEstimatedCycleForDate,
} from '../../utils/symptothermal';
import { addDaysIso } from '../../utils/cyclePredictions';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar as CalendarIcon,
  Sparkles,
  Droplet,
  RotateCcw,
} from 'lucide-react';

interface TodayViewProps {
  activeCycle: Cycle | null;
  allCycles: Cycle[];
  fullCycleSequence?: FullCycleItem[];
  stats?: CycleStatistics;
  dailyEntries: Record<number, DailyEntry>;
  allEntriesByDate?: Record<string, DailyEntry>;
  onSaveEntryForDate: (
    entryDate: string,
    entry: Partial<DailyEntry>,
    options?: {
      forceNewCycle?: boolean;
      newCycleStartDate?: string;
      isContinuationOfLongCycle?: boolean;
    }
  ) => Promise<void>;
  onStartFirstCycle: (
    startDate: string,
    options?: {
      name?: string;
      bbtMethod?: BbtMethod;
      shortestCycle?: number | null;
    }
  ) => Promise<void>;
  onOpenNewCycleModal: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  activeCycle,
  allCycles,
  fullCycleSequence = [],
  stats,
  allEntriesByDate = {},
  onSaveEntryForDate,
  onStartFirstCycle,
  onOpenNewCycleModal,
}) => {
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);

  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // First cycle onboarding state
  const [firstCycleStartDate, setFirstCycleStartDate] = useState<string>(todayISO);
  const [firstCycleBbtMethod, setFirstCycleBbtMethod] = useState<BbtMethod>('Vaginale');
  const [startingFirstCycle, setStartingFirstCycle] = useState<boolean>(false);

  // New cycle transition modal state
  const [showTransitionModal, setShowTransitionModal] = useState<boolean>(false);
  const [pendingMenstruation, setPendingMenstruation] = useState<DailyEntry['menstruation']>('Flusso');

  // Form State
  const [bbt, setBbt] = useState<number | null>(null);
  const [bbtTime, setBbtTime] = useState<string | null>(null);
  const [menstruation, setMenstruation] = useState<DailyEntry['menstruation']>(null);
  const [sensation, setSensation] = useState<DailyEntry['sensation']>(null);
  const [mucusQtySymbol, setMucusQtySymbol] = useState<DailyEntry['mucus_qty_symbol']>(null);
  const [mucusQty, setMucusQty] = useState<string | null>(null);
  const [mucusChar, setMucusChar] = useState<string | null>(null);
  const [cervixConsistency, setCervixConsistency] = useState<DailyEntry['cervix_consistency']>(null);
  const [cervixOpening, setCervixOpening] = useState<DailyEntry['cervix_opening']>(null);
  const [cervixPosition, setCervixPosition] = useState<DailyEntry['cervix_position']>(null);
  const [intercourse, setIntercourse] = useState<DailyEntry['intercourse']>(null);
  const [notes, setNotes] = useState<string | null>(null);

  // Current cycle projection for selectedDate directly from fullCycleSequence or getEstimatedCycleForDate
  const cycleInfo = useMemo(() => {
    if (fullCycleSequence && fullCycleSequence.length > 0) {
      let matched = fullCycleSequence[0];
      for (let s = fullCycleSequence.length - 1; s >= 0; s--) {
        if (fullCycleSequence[s].start_date <= selectedDate) {
          matched = fullCycleSequence[s];
          break;
        }
      }
      if (matched) {
        const day = calculateDayFromDate(matched.start_date, selectedDate) || 1;
        return {
          cycleNumber: matched.cycle_number,
          startDate: matched.start_date,
          cycleDay: Math.max(1, day),
          isExistingCycle: !matched.is_estimated && Boolean(matched.id),
          existingCycleId: matched.id,
          isEstimated: Boolean(matched.is_estimated),
        };
      }
    }
    return getEstimatedCycleForDate(selectedDate, allCycles || [], stats?.averageCycleLength || 28);
  }, [selectedDate, fullCycleSequence, allCycles, stats]);

  const isToday = selectedDate === todayISO;

  // Load entry into form when selectedDate or allEntriesByDate changes
  useEffect(() => {
    const entry = allEntriesByDate[selectedDate];
    if (entry) {
      setBbt(entry.bbt !== null && entry.bbt !== undefined ? Number(entry.bbt) : null);
      setBbtTime(entry.bbt_time ?? null);
      setMenstruation(entry.menstruation ?? null);
      setSensation(entry.sensation ?? null);
      setMucusQtySymbol(entry.mucus_qty_symbol ?? null);
      setMucusQty(entry.mucus_qty ?? null);
      setMucusChar(entry.mucus_char ?? null);
      setCervixConsistency(entry.cervix_consistency ?? null);
      setCervixOpening(entry.cervix_opening ?? null);
      setCervixPosition(entry.cervix_position ?? null);
      setIntercourse(entry.intercourse ?? null);
      setNotes(entry.notes ?? null);
    } else {
      setBbt(null);
      setBbtTime(null);
      setMenstruation(null);
      setSensation(null);
      setMucusQtySymbol(null);
      setMucusQty(null);
      setMucusChar(null);
      setCervixConsistency(null);
      setCervixOpening(null);
      setCervixPosition(null);
      setIntercourse(null);
      setNotes(null);
    }
  }, [selectedDate, allEntriesByDate]);

  // Handler for changing menstruation chip
  const handleMenstruationChange = (newMenst: DailyEntry['menstruation']) => {
    setMenstruation(newMenst);

    if (isMenstrualFlow(newMenst)) {
      const prevDate = addDaysIso(selectedDate, -1);
      const prevEntry = allEntriesByDate[prevDate];
      const prevHadFlow = Boolean(prevEntry && isMenstrualFlow(prevEntry.menstruation));

      if (!prevHadFlow) {
        setPendingMenstruation(newMenst);
        setShowTransitionModal(true);
      }
    }
  };

  // Handle first cycle start
  const handleStartFirstCycleSubmit = async () => {
    if (!firstCycleStartDate) {
      alert('Inserisci la data di inizio del ciclo');
      return;
    }
    setStartingFirstCycle(true);
    try {
      await onStartFirstCycle(firstCycleStartDate, {
        bbtMethod: firstCycleBbtMethod,
      });
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setStartingFirstCycle(false);
    }
  };

  const handleSave = async (options?: {
    forceNewCycle?: boolean;
    newCycleStartDate?: string;
    isContinuationOfLongCycle?: boolean;
  }) => {
    // If user has chosen flow but not yet answered modal
    if (isMenstrualFlow(menstruation) && !options) {
      const prevDate = addDaysIso(selectedDate, -1);
      const prevEntry = allEntriesByDate[prevDate];
      const prevHadFlow = Boolean(prevEntry && isMenstrualFlow(prevEntry.menstruation));

      if (!prevHadFlow) {
        setPendingMenstruation(menstruation);
        setShowTransitionModal(true);
        return;
      }
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveEntryForDate(
        selectedDate,
        {
          cycle_day: cycleInfo.cycleDay,
          entry_date: selectedDate,
          bbt,
          bbt_time: bbtTime,
          menstruation,
          sensation,
          mucus_qty_symbol: mucusQtySymbol,
          mucus_qty: mucusQty,
          mucus_char: mucusChar,
          cervix_consistency: cervixConsistency,
          cervix_opening: cervixOpening,
          cervix_position: cervixPosition,
          intercourse,
          notes,
        },
        options
      );

      setSavedSuccess(true);
      setShowTransitionModal(false);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(`Errore nel salvataggio: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // If no cycle exists at all -> Clean Onboarding Card
  if (!allCycles || allCycles.length === 0) {
    return (
      <div className="max-w-md mx-auto py-8 px-4 fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-soft border border-nature-100 text-center">
          <div className="w-16 h-16 rounded-3xl bg-nature-100 text-nature-600 flex items-center justify-center mx-auto mb-4 shadow-soft">
            <CalendarIcon className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-stone-900 mb-2">
            Benvenuta nel tuo Fertility Tracker
          </h2>
          <p className="text-xs text-stone-500 mb-6 leading-relaxed">
            Inizia a monitorare i tuoi cicli con il Metodo Sintotermico. Inserisci la data della tua ultima mestruazione per avviare il primo ciclo con 1 solo click.
          </p>

          <div className="space-y-4 text-left mb-6">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Data inizio (1° giorno di mestruazione)
              </label>
              <input
                type="date"
                value={firstCycleStartDate}
                onChange={(e) => setFirstCycleStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-medium text-stone-800 focus:ring-2 focus:ring-nature-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Metodo Misurazione BBT preferito
              </label>
              <select
                value={firstCycleBbtMethod}
                onChange={(e) => setFirstCycleBbtMethod(e.target.value as BbtMethod)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-medium text-stone-800 focus:ring-2 focus:ring-nature-500 focus:outline-none"
              >
                <option value="Vaginale">Vaginale (Raccomandato)</option>
                <option value="Orale">Orale</option>
                <option value="Rettale">Rettale</option>
                <option value="Non specificato">Non specificato</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartFirstCycleSubmit}
            disabled={startingFirstCycle}
            className="w-full py-4 px-6 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {startingFirstCycle ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Inizia Ciclo 1</span>
              </>
            )}
          </button>

          <div className="mt-4 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onOpenNewCycleModal}
              className="text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors"
            >
              Oppure importa dati storici o crea ciclo avanzato
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 fade-in">
      
      {/* Standard Cycle Day Navigator Card */}
      <div className="bg-gradient-to-br from-nature-600 to-nature-700 text-white rounded-3xl p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDaysIso(d, -1))}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
            title="Giorno precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-xs uppercase font-extrabold tracking-widest text-nature-200">
                Ciclo #{cycleInfo.cycleNumber} {cycleInfo.isEstimated ? '(Stimato)' : ''} • Giorno del Ciclo
              </span>
              {isToday && (
                <span className="px-2 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  Oggi
                </span>
              )}
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              Giorno {cycleInfo.cycleDay}
            </div>
            <div className="text-xs text-nature-100 font-medium mt-0.5 capitalize">
              {formatDateItalian(selectedDate)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDaysIso(d, 1))}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
            title="Giorno successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mini Day Dots Strip */}
        <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/15 overflow-x-auto py-1">
          {Array.from({ length: 7 }, (_, i) => {
            const offset = i - 3;
            const targetD = addDaysIso(selectedDate, offset);
            const isSel = offset === 0;
            const entryForD = allEntriesByDate[targetD];
            const hasData = Boolean(
              entryForD?.bbt ||
              entryForD?.sensation ||
              entryForD?.menstruation
            );
            const [, , dNum] = targetD.split('-');

            return (
              <button
                key={targetD}
                type="button"
                onClick={() => setSelectedDate(targetD)}
                className={`min-w-[34px] h-[34px] rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-white text-nature-800 shadow-md scale-110'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{Number(dNum)}</span>
                {hasData && (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSel ? 'bg-nature-600' : 'bg-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Temperature Section */}
      <TemperaturePicker
        bbt={bbt}
        time={bbtTime}
        onChangeBbt={setBbt}
        onChangeTime={setBbtTime}
      />

      {/* Visual Chips: Menstruation, Sensation, Mucus, Intercourse, Cervix, Notes */}
      <VisualChipsPicker
        menstruation={menstruation}
        sensation={sensation}
        mucusQtySymbol={mucusQtySymbol}
        mucusQty={mucusQty}
        mucusChar={mucusChar}
        cervixConsistency={cervixConsistency}
        cervixOpening={cervixOpening}
        cervixPosition={cervixPosition}
        intercourse={intercourse}
        notes={notes}
        onChangeMenstruation={handleMenstruationChange}
        onChangeSensation={setSensation}
        onChangeMucusQtySymbol={setMucusQtySymbol}
        onChangeMucusQty={setMucusQty}
        onChangeMucusChar={setMucusChar}
        onChangeCervixConsistency={setCervixConsistency}
        onChangeCervixOpening={setCervixOpening}
        onChangeCervixPosition={setCervixPosition}
        onChangeIntercourse={setIntercourse}
        onChangeNotes={setNotes}
      />

      {/* Save Floating Button */}
      <div className="sticky bottom-20 z-30 pt-2">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className={`w-full py-4 px-6 rounded-3xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 ${
            savedSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-nature-600 to-nature-500 hover:from-nature-700 hover:to-nature-600 text-white'
          }`}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : savedSuccess ? (
            <>
              <Check className="w-5 h-5 animate-bounce" />
              <span>Dati Salvati!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Salva Misurazioni ({formatDateItalian(selectedDate)})</span>
            </>
          )}
        </button>
      </div>

      {/* Intelligent Cycle Transition Modal (Checkpoint Confirmation) */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-nature-100 slide-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-stone-900 text-center mb-2">
              Inizio Nuovo Ciclo Mestruale
            </h3>
            
            <p className="text-xs text-stone-600 text-center mb-6 leading-relaxed">
              Hai registrato una mestruazione (<strong>{pendingMenstruation}</strong>) in data{' '}
              <strong>{formatDateItalian(selectedDate)}</strong> senza mestruo registrato il giorno precedente.<br />
              Vuoi che questa data diventi il <strong>Giorno 1</strong> di un nuovo ciclo?
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  handleSave({
                    forceNewCycle: true,
                    newCycleStartDate: selectedDate,
                  });
                }}
                disabled={saving}
                className="w-full py-3.5 px-6 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sì, Inizia Nuovo Ciclo (Giorno 1)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSave({
                    isContinuationOfLongCycle: true,
                  });
                }}
                disabled={saving}
                className="w-full py-3 px-6 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
              >
                No, registra come perdita nel ciclo attuale
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


