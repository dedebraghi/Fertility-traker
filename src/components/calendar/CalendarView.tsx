import React, { useState, useMemo } from 'react';
import { Cycle, DailyEntry, CalendarDayData } from '../../types';
import { computeCycleStatistics, buildMonthCalendar } from '../../utils/cyclePredictions';
import { DayDetailModal } from './DayDetailModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  Thermometer,
  Droplet,
  Heart,
  FileText,
  Info,
  Layers,
} from 'lucide-react';

interface CalendarViewProps {
  cycles: Cycle[];
  activeCycle: Cycle | null;
  allEntriesByDate: Record<string, DailyEntry>;
  allEntriesList: DailyEntry[];
  onSaveEntryForDate: (
    entryDate: string,
    data: Partial<DailyEntry>,
    options?: {
      forceNewCycle?: boolean;
      newCycleStartDate?: string;
      isContinuationOfLongCycle?: boolean;
    }
  ) => Promise<void>;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  cycles,
  activeCycle,
  allEntriesByDate,
  allEntriesList,
  onSaveEntryForDate,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedDayData, setSelectedDayData] = useState<CalendarDayData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // 1. Calculate overall statistics
  const stats = useMemo(() => {
    return computeCycleStatistics(cycles, allEntriesList);
  }, [cycles, allEntriesList]);

  // 2. Build current month calendar matrix
  const { days: calendarDays } = useMemo(() => {
    return buildMonthCalendar(currentYear, currentMonth, cycles, allEntriesByDate, stats);
  }, [currentYear, currentMonth, cycles, allEntriesByDate, stats]);

  // Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const handleSelectDay = (day: CalendarDayData) => {
    setSelectedDayData(day);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in max-w-4xl mx-auto">
      
      {/* Month & Navigation Header */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Month Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-nature-100 text-nature-700">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-800 capitalize">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Storico misurazioni e previsioni ciclo sintotermico
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleGoToToday}
            className="px-3.5 py-2 text-xs font-semibold rounded-2xl border border-nature-300 text-nature-700 bg-nature-50/60 hover:bg-nature-100 transition-colors"
          >
            Oggi
          </button>

          <div className="flex items-center bg-stone-100 rounded-2xl p-1 border border-stone-200">
            <button
              onClick={handlePrevMonth}
              aria-label="Mese precedente"
              className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white transition-all shadow-none hover:shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Mese successivo"
              className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white transition-all shadow-none hover:shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cycle Statistical Prediction Card */}
      <div className="bg-gradient-to-r from-nature-50 via-blush-50 to-sand-50 rounded-3xl p-4 sm:p-5 border border-nature-200/70 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-700">
          <Sparkles className="w-4 h-4 text-nature-600 flex-shrink-0" />
          <span>
            <strong className="font-semibold text-stone-800">Parametri Previsionali:</strong>{' '}
            Media ciclo: <span className="font-bold text-nature-700">{stats.averageCycleLength} gg</span> • Mestruo:{' '}
            <span className="font-bold text-blush-700">{stats.averagePeriodLength} gg</span> • Fase luteale:{' '}
            <span className="font-bold text-purple-700">{stats.averageLutealPhase} gg</span>
          </span>
        </div>

        <button
          onClick={() => setShowLegend(!showLegend)}
          className="text-[11px] font-semibold text-nature-700 hover:text-nature-900 underline flex items-center gap-1 self-end md:self-auto"
        >
          <Info className="w-3.5 h-3.5" />
          {showLegend ? 'Nascondi Legenda' : 'Mostra Legenda'}
        </button>
      </div>

      {/* Interactive Legend Box (Collapsible) */}
      {showLegend && (
        <div className="bg-white rounded-2xl p-4 border border-nature-200/70 shadow-sm text-xs space-y-2 animate-slide-down">
          <h4 className="font-bold text-stone-700 mb-2">Guida Simboli & Colori</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-stone-600">Mestruo Registrato</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-rose-400 bg-rose-100 inline-block"></span>
              <span className="text-stone-600">Mestruo Previsto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 border border-emerald-300 inline-block"></span>
              <span className="text-stone-600">Finestra Fertile Prevista</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block"></span>
              <span className="text-stone-600">Ovulazione Stimata</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
              <span className="text-stone-600">Temperatura (BBT)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              <span className="text-stone-600">Muco Fertile</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
              <span className="text-stone-600">Rapporto (X/I/P)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-500 inline-block"></span>
              <span className="text-stone-600">Note registrate</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-3xl p-3 sm:p-5 border border-nature-200/80 shadow-card">
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
          {WEEKDAYS.map((wd, idx) => (
            <div
              key={wd}
              className={`py-2 text-xs font-bold uppercase tracking-wider ${
                idx >= 5 ? 'text-stone-400' : 'text-stone-600'
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day) => {
            const hasEntry = Boolean(day.entry);
            const entry = day.entry;
            const isAbbondante = entry?.menstruation === 'Abbondante' || entry?.menstruation === 'M+';
            const isFlusso = entry?.menstruation === 'Flusso' || entry?.menstruation === 'M';
            const isSpotting = entry?.menstruation === 'Spotting' || entry?.menstruation === 'm';
            const hasActualPeriod = isAbbondante || isFlusso || isSpotting;

            const isPredictedPeriod = day.isPredictedPeriod && !hasActualPeriod;
            const isPredictedFertile = day.isPredictedFertileWindow && !hasActualPeriod;
            const isPredictedOvulation = day.isPredictedOvulation && !hasActualPeriod;

            // Background & Border Classes
            let cellBgClass = 'bg-stone-50/60 hover:bg-stone-100/80 border-transparent';
            if (!day.isCurrentMonth) {
              cellBgClass = 'bg-stone-50/20 text-stone-300 hover:bg-stone-50/50 border-transparent opacity-40';
            } else if (hasActualPeriod) {
              cellBgClass = isSpotting
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-500 text-white shadow-sm font-semibold';
            } else if (isPredictedPeriod) {
              cellBgClass = 'bg-rose-50/80 border-2 border-dashed border-rose-300 text-rose-900';
            } else if (isPredictedOvulation) {
              cellBgClass = 'bg-amber-50 border-2 border-amber-300 text-amber-950 font-medium';
            } else if (isPredictedFertile) {
              cellBgClass = 'bg-emerald-50/70 border border-emerald-200 text-emerald-950';
            }

            return (
              <button
                key={day.date}
                onClick={() => handleSelectDay(day)}
                className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between text-left relative group ${cellBgClass}`}
              >
                {/* Day Header: Number + Cycle Day Badge */}
                <div className="flex items-start justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                      day.isToday
                        ? 'bg-nature-700 text-white font-bold ring-2 ring-nature-300'
                        : ''
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {day.cycleDay && day.isCurrentMonth && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                        hasActualPeriod && !isSpotting
                          ? 'bg-rose-600/70 text-white'
                          : 'bg-stone-200/60 text-stone-600'
                      }`}
                    >
                      g{day.cycleDay}
                    </span>
                  )}
                </div>

                {/* Day Body: Predictions / Measurements Indicators */}
                <div className="mt-1 space-y-1 w-full">
                  
                  {/* Temperature Pill (if logged) */}
                  {entry?.bbt !== null && entry?.bbt !== undefined && (
                    <div
                      className={`text-[10px] font-bold px-1 rounded truncate flex items-center gap-0.5 ${
                        hasActualPeriod && !isSpotting
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      <Thermometer className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{Number(entry.bbt).toFixed(1)}°</span>
                    </div>
                  )}

                  {/* Predicted Period Label */}
                  {isPredictedPeriod && (
                    <div className="text-[9px] font-bold text-rose-700 uppercase tracking-tight truncate flex items-center gap-0.5">
                      <Droplet className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Mestruo</span>
                    </div>
                  )}

                  {/* Predicted Ovulation Label */}
                  {isPredictedOvulation && (
                    <div className="text-[9px] font-bold text-amber-700 uppercase tracking-tight truncate flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="hidden sm:inline">Ovulazione</span>
                    </div>
                  )}

                  {/* Fertile window indicator */}
                  {isPredictedFertile && !isPredictedOvulation && !isPredictedPeriod && (
                    <div className="text-[9px] font-semibold text-emerald-700 uppercase tracking-tight truncate hidden sm:flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2 flex-shrink-0" />
                      <span>Fertile</span>
                    </div>
                  )}

                  {/* Indicators dot bar */}
                  <div className="flex items-center gap-1 pt-0.5">
                    {/* Mucus */}
                    {(entry?.sensation === 'L' || entry?.sensation === 'B' || entry?.mucus_qty_symbol === '*') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Muco fertile" />
                    )}
                    {/* Intercourse */}
                    {entry?.intercourse && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hasActualPeriod && !isSpotting ? 'bg-white' : 'bg-rose-500'
                        }`}
                        title={`Rapporto (${entry.intercourse})`}
                      />
                    )}
                    {/* Notes */}
                    {entry?.notes && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hasActualPeriod && !isSpotting ? 'bg-rose-200' : 'bg-stone-400'
                        }`}
                        title="Note presenti"
                      />
                    )}
                  </div>
                </div>

              </button>
            );
          })}
        </div>
      </div>

      {/* Day Details & Editor Modal */}
      <DayDetailModal
        isOpen={isDetailModalOpen}
        dayData={selectedDayData}
        bbtMethod={activeCycle?.bbt_method || 'Vaginale'}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDayData(null);
        }}
        onSaveEntry={async (date, data, options) => {
          await onSaveEntryForDate(date, data, options);
          // refresh selected day state
          setSelectedDayData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              entry: {
                ...prev.entry,
                ...data,
                entry_date: date,
                bbt: data.bbt !== null && data.bbt !== undefined ? Number(data.bbt) : null,
              } as DailyEntry,
            };
          });
        }}
      />

    </div>
  );
};
