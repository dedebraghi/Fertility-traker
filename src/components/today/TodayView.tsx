import React, { useState, useEffect } from 'react';
import { Cycle, DailyEntry, BbtMethod } from '../../types';
import { TemperaturePicker } from './TemperaturePicker';
import { VisualChipsPicker } from './VisualChipsPicker';
import {
  calculateDateForDay,
  formatDateItalian,
  calculateDayFromDate,
  estimateInterruptedCycles,
} from '../../utils/symptothermal';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar as CalendarIcon,
  Sparkles,
  PlusCircle,
  AlertCircle,
  RotateCcw,
  Sparkle,
} from 'lucide-react';

interface TodayViewProps {
  activeCycle: Cycle | null;
  allCycles: Cycle[];
  dailyEntries: Record<number, DailyEntry>;
  onSaveEntry: (entry: Partial<DailyEntry> & { cycle_day: number }) => Promise<void>;
  onTransitionToNewCycle: (
    startDate: string,
    options?: {
      customCycleNumber?: number;
      customBbtMethod?: BbtMethod;
      customShortestCycle?: number | null;
      initialMenstruation?: DailyEntry['menstruation'];
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
  dailyEntries,
  onSaveEntry,
  onTransitionToNewCycle,
  onStartFirstCycle,
  onOpenNewCycleModal,
}) => {
  const todayISO = new Date().toISOString().split('T')[0];

  // Selected cycle day
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // First cycle onboarding state
  const [firstCycleStartDate, setFirstCycleStartDate] = useState<string>(todayISO);
  const [firstCycleBbtMethod, setFirstCycleBbtMethod] = useState<BbtMethod>('Vaginale');
  const [startingFirstCycle, setStartingFirstCycle] = useState<boolean>(false);

  // New cycle transition modal state
  const [showTransitionModal, setShowTransitionModal] = useState<boolean>(false);
  const [transitionDate, setTransitionDate] = useState<string>(todayISO);
  const [transitionCycleNumber, setTransitionCycleNumber] = useState<number>(1);
  const [transitionMenstruation, setTransitionMenstruation] = useState<DailyEntry['menstruation']>('Flusso');
  const [transitioning, setTransitioning] = useState<boolean>(false);

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

  // Calculate default day when activeCycle changes
  useEffect(() => {
    if (activeCycle) {
      const calculatedDay = calculateDayFromDate(activeCycle.start_date, todayISO);
      if (calculatedDay && calculatedDay >= 1 && calculatedDay <= 50) {
        setSelectedDay(calculatedDay);
      } else {
        const days = Object.keys(dailyEntries).map(Number);
        const maxDay = days.length > 0 ? Math.max(...days) : 1;
        setSelectedDay(maxDay);
      }
    }
  }, [activeCycle?.id]);

  // Load entry into form when selectedDay or dailyEntries changes
  useEffect(() => {
    const entry = dailyEntries[selectedDay];
    if (entry) {
      setBbt(entry.bbt ?? null);
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
  }, [selectedDay, dailyEntries]);

  // Handler for changing menstruation chip
  const handleMenstruationChange = (newMenst: DailyEntry['menstruation']) => {
    setMenstruation(newMenst);

    // If activeCycle exists and user selects true flow (Flusso or Abbondante) on day > 5
    if (activeCycle && (newMenst === 'Flusso' || newMenst === 'Abbondante') && selectedDay > 5) {
      const targetDate = calculateDateForDay(activeCycle.start_date, selectedDay) || todayISO;
      const nextNum = activeCycle.cycle_number + 1;
      setTransitionDate(targetDate);
      setTransitionCycleNumber(nextNum);
      setTransitionMenstruation(newMenst);
      setShowTransitionModal(true);
    }
  };

  // Confirm transition to new cycle
  const handleConfirmTransition = async () => {
    setTransitioning(true);
    try {
      await onTransitionToNewCycle(transitionDate, {
        customCycleNumber: Number(transitionCycleNumber),
        initialMenstruation: transitionMenstruation,
      });
      setShowTransitionModal(false);
    } catch (err: any) {
      alert(`Errore nella creazione del nuovo ciclo: ${err.message}`);
    } finally {
      setTransitioning(false);
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

  // If no active cycle exists -> Clean Onboarding Card
  if (!activeCycle) {
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

  const currentDateStr = calculateDateForDay(activeCycle.start_date, selectedDay) || '';
  const isToday = currentDateStr === todayISO;

  // Check for gap information if transition modal is active
  const gapInfo = activeCycle && transitionDate
    ? estimateInterruptedCycles(activeCycle.start_date, transitionDate)
    : null;

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveEntry({
        cycle_day: selectedDay,
        entry_date: currentDateStr,
        bbt,
        bbt_time: bbtTime,
        menstruation,
        sensation,
        mucus_qty_symbol: mucusQtySymbol,
        mucus_qty: mucusQty,
        mucusChar,
        cervixConsistency,
        cervixOpening,
        cervixPosition,
        intercourse,
        notes,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(`Errore nel salvataggio: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 fade-in">
      
      {/* Cycle Day Navigator Card */}
      <div className="bg-gradient-to-br from-nature-600 to-nature-700 text-white rounded-3xl p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={selectedDay <= 1}
            onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all active:scale-95"
            title="Giorno precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-nature-200">
                Ciclo #{activeCycle.cycle_number} • Giorno del Ciclo
              </span>
              {isToday && (
                <span className="px-2 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  Oggi
                </span>
              )}
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              Giorno {selectedDay}
            </div>
            <div className="text-xs text-nature-100 font-medium mt-0.5 capitalize">
              {formatDateItalian(currentDateStr)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDay((d) => d + 1)}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
            title="Giorno successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mini Day Dots Strip */}
        <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/15 overflow-x-auto py-1">
          {Array.from({ length: 7 }, (_, i) => {
            const dayNum = Math.max(1, selectedDay - 3) + i;
            const hasData = Boolean(
              dailyEntries[dayNum]?.bbt ||
              dailyEntries[dayNum]?.sensation ||
              dailyEntries[dayNum]?.menstruation
            );
            const isSel = dayNum === selectedDay;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDay(dayNum)}
                className={`min-w-[34px] h-[34px] rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-white text-nature-800 shadow-md scale-110'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{dayNum}</span>
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
          onClick={handleSave}
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
              <span>Dati Giorno {selectedDay} Salvati!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Salva Dati Giorno {selectedDay}</span>
            </>
          )}
        </button>
      </div>

      {/* Intelligent Cycle Transition Modal */}
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
              Hai registrato una mestruazione (<strong>{transitionMenstruation}</strong>) in data{' '}
              <strong>{formatDateItalian(transitionDate)}</strong>.<br />
              Vuoi archiviare il <strong>Ciclo {activeCycle.cycle_number}</strong> (durato {selectedDay} giorni) e avviare automaticamente il <strong>Ciclo {transitionCycleNumber}</strong>?
            </p>

            {/* Gap Warning & Customization if long absence */}
            {gapInfo && gapInfo.isSignificantGap && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Interruzione rilevata (~{gapInfo.monthsPassed} mesi)
                    </h4>
                    <p className="text-[11px] text-amber-700 mt-1 leading-snug">
                      È passato del tempo dall'ultimo ciclo. Proponiamo <strong>Ciclo {activeCycle.cycle_number + 1}</strong> (scheda progressiva registrata), ma puoi modificare il numero se desideri conteggiare i cicli stimati (~{activeCycle.cycle_number + gapInfo.estimatedCyclesPassed}).
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs font-bold text-stone-700">Numero Ciclo:</label>
                      <input
                        type="number"
                        min="1"
                        value={transitionCycleNumber}
                        onChange={(e) => setTransitionCycleNumber(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={transitioning}
                className="w-full py-3.5 px-6 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {transitioning ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkle className="w-4 h-4" />
                    <span>Conferma ed Inizia Ciclo {transitionCycleNumber}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowTransitionModal(false)}
                className="w-full py-3 px-6 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs transition-colors"
              >
                Continua nel ciclo attuale ({activeCycle.cycle_number})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

