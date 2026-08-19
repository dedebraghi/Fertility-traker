import React from 'react';
import { Cycle, DailyEntry } from '../../types';
import { calculateDateForDay, formatDateDisplay } from '../../utils/symptothermal';

interface SymptothermalMatrixProps {
  cycle: Cycle;
  entries: Record<number, DailyEntry>;
  numDays?: number;
  onSelectDay?: (day: number) => void;
}

export const SymptothermalMatrix: React.FC<SymptothermalMatrixProps> = ({
  cycle,
  entries,
  numDays = 40,
  onSelectDay,
}) => {
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto rounded-2xl border border-nature-200 bg-white shadow-card">
      <table className="w-full text-center border-collapse text-xs">
        
        {/* Header: Giorno del Ciclo & Data */}
        <thead>
          <tr className="bg-nature-100/70 border-b border-nature-200 text-stone-700">
            <th className="sticky left-0 z-10 bg-nature-100/95 backdrop-blur-sm px-3 py-2 text-left font-bold w-36 border-r border-nature-200">
              Parametro
            </th>
            {days.map((day) => {
              const dateStr = calculateDateForDay(cycle.start_date, day);
              return (
                <th
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className="min-w-[38px] max-w-[38px] px-1 py-1.5 font-bold cursor-pointer hover:bg-nature-200/60 border-r border-nature-100"
                >
                  <div className="text-[11px] text-stone-900">{day}</div>
                  <div className="text-[9px] font-medium text-stone-500 font-mono">
                    {dateStr ? formatDateDisplay(dateStr) : ''}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-nature-100 font-mono">
          
          {/* Row: Mestruazione (Abbondante, Flusso, Spotting) */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              🩸 Mestruazione
            </td>
            {days.map((day) => {
              const m = entries[day]?.menstruation;
              const isAbbondante = m === 'Abbondante' || m === 'M+';
              const isFlusso = m === 'Flusso' || m === 'M';
              const isSpotting = m === 'Spotting' || m === 'm';

              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className="px-1 py-2 cursor-pointer border-r border-nature-100"
                >
                  {isAbbondante && (
                    <span className="inline-block px-1 rounded bg-rose-700 text-white font-extrabold text-[9px] leading-4 text-center shadow-xs" title="Flusso Abbondante">
                      M+
                    </span>
                  )}
                  {isFlusso && (
                    <span className="inline-block w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] leading-4 text-center" title="Flusso Normale">
                      M
                    </span>
                  )}
                  {isSpotting && (
                    <span className="inline-block w-4 h-4 rounded-full bg-rose-200 text-rose-950 font-bold text-[9px] leading-4 text-center" title="Spotting">
                      m
                    </span>
                  )}
                </td>
              );
            })}
          </tr>

          {/* Row: BBT Temperatura */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              🌡️ Temp. (°C)
            </td>
            {days.map((day) => {
              const bbt = entries[day]?.bbt;
              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className={`px-0.5 py-2 font-bold text-[10px] cursor-pointer border-r border-nature-100 ${
                    bbt ? 'text-nature-800 bg-nature-50/30' : 'text-stone-300'
                  }`}
                >
                  {bbt ? bbt.toFixed(2) : '-'}
                </td>
              );
            })}
          </tr>

          {/* Row: Sensazione */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              ✨ Sensazione
            </td>
            {days.map((day) => {
              const s = entries[day]?.sensation;
              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className="px-1 py-2 font-bold text-[11px] cursor-pointer border-r border-nature-100"
                >
                  {s === 'L' && <span className="text-emerald-600 font-black">L</span>}
                  {s === 'B' && <span className="text-blue-600">B</span>}
                  {s === 'U' && <span className="text-sky-600">U</span>}
                  {s === 'A' && <span className="text-amber-700">A</span>}
                </td>
              );
            })}
          </tr>

          {/* Row: Muco Cervicale */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              💧 Muco Q./Car.
            </td>
            {days.map((day) => {
              const sym = entries[day]?.mucus_qty_symbol || '';
              const chars = entries[day]?.mucus_char || '';
              const display = `${sym} ${chars}`.trim();
              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className="px-0.5 py-2 text-[9px] font-semibold text-emerald-800 cursor-pointer border-r border-nature-100"
                >
                  {display || '-'}
                </td>
              );
            })}
          </tr>

          {/* Row: Cervice */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              🔘 Cervice (C-O-P)
            </td>
            {days.map((day) => {
              const c = entries[day];
              const combined = c
                ? `${c.cervix_consistency || '-'}${c.cervix_opening || '-'}${c.cervix_position || '-'}`
                : '---';
              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className="px-0.5 py-2 text-[9px] text-purple-700 cursor-pointer border-r border-nature-100"
                >
                  {combined === '---' ? '-' : combined}
                </td>
              );
            })}
          </tr>

          {/* Row: Coito */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              ❤️ Rapporti
            </td>
            {days.map((day) => {
              const coito = entries[day]?.intercourse;
              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  className="px-1 py-2 font-bold text-[10px] text-rose-600 cursor-pointer border-r border-nature-100"
                >
                  {coito || '-'}
                </td>
              );
            })}
          </tr>

          {/* Row: Note */}
          <tr className="hover:bg-nature-50/50">
            <td className="sticky left-0 z-10 bg-white font-sans font-semibold text-stone-700 px-3 py-2 text-left border-r border-nature-200">
              📝 Note
            </td>
            {days.map((day) => {
              const note = entries[day]?.notes;
              return (
                <td
                  key={day}
                  onClick={() => onSelectDay && onSelectDay(day)}
                  title={note || ''}
                  className="px-0.5 py-2 text-[8px] text-stone-500 truncate max-w-[38px] cursor-pointer border-r border-nature-100"
                >
                  {note ? '•' : ''}
                </td>
              );
            })}
          </tr>

        </tbody>
      </table>
    </div>
  );
};
