import React, { useState, useEffect } from 'react';
import { Cycle, DailyEntry } from '../../types';
import { TemperaturePicker } from './TemperaturePicker';
import { VisualChipsPicker } from './VisualChipsPicker';
import { calculateDateForDay, formatDateItalian, calculateDayFromDate } from '../../utils/symptothermal';
import { ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, Sparkles, PlusCircle } from 'lucide-react';

interface TodayViewProps {
  activeCycle: Cycle | null;
  dailyEntries: Record<number, DailyEntry>;
  onSaveEntry: (entry: Partial<DailyEntry> & { cycle_day: number }) => Promise<void>;
  onOpenNewCycleModal: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  activeCycle,
  dailyEntries,
  onSaveEntry,
  onOpenNewCycleModal,
}) => {
  const todayISO = new Date().toISOString().split('T')[0];

  // Selected cycle day (default to calculated today's cycle day, or maxDay + 1, or 1)
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

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
      // Reset form
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

  if (!activeCycle) {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto fade-in">
        <div className="w-16 h-16 rounded-3xl bg-nature-100 text-nature-600 flex items-center justify-center mx-auto mb-4 shadow-soft">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Nessun ciclo attivo</h2>
        <p className="text-xs text-stone-500 mb-6">
          Inizia creando il tuo primo ciclo con la data di inizio per monitorare le temperature e i parametri sintotermici.
        </p>
        <button
          onClick={onOpenNewCycleModal}
          className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm shadow-soft transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crea Nuovo Ciclo</span>
        </button>
      </div>
    );
  }

  const currentDateStr = calculateDateForDay(activeCycle.start_date, selectedDay) || '';
  const isToday = currentDateStr === todayISO;

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
        mucus_char: mucusChar,
        cervix_consistency: cervixConsistency,
        cervix_opening: cervixOpening,
        cervix_position: cervixPosition,
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
                Giorno del Ciclo
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
            const hasData = Boolean(dailyEntries[dayNum]?.bbt || dailyEntries[dayNum]?.sensation || dailyEntries[dayNum]?.menstruation);
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
        onChangeMenstruation={setMenstruation}
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

    </div>
  );
};
