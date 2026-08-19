import React, { useState } from 'react';
import { Cycle, DailyEntry } from '../../types';
import { InteractiveBbtChart } from './InteractiveBbtChart';
import { SymptothermalMatrix } from './SymptothermalMatrix';
import { generateCamenPDF } from '../../pdf/CamenPdfGenerator';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ChartViewProps {
  activeCycle: Cycle | null;
  dailyEntries: Record<number, DailyEntry>;
  onSelectDayForEdit: (day: number) => void;
}

export const ChartView: React.FC<ChartViewProps> = ({
  activeCycle,
  dailyEntries,
  onSelectDayForEdit,
}) => {
  const [numDays] = useState<number>(40);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  if (!activeCycle) {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto fade-in">
        <div className="w-16 h-16 rounded-3xl bg-nature-100 text-nature-600 flex items-center justify-center mx-auto mb-4 shadow-soft">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Nessun ciclo selezionato</h2>
        <p className="text-xs text-stone-500">
          Crea o seleziona un ciclo per visualizzare il grafico della temperatura e la scheda sintotermica.
        </p>
      </div>
    );
  }

  const handleExportPDF = async () => {
    try {
      setGeneratingPdf(true);
      generateCamenPDF(activeCycle, dailyEntries);
    } catch (err: any) {
      alert(`Errore generazione PDF: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 fade-in">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              Ciclo {activeCycle.cycle_number} • {activeCycle.name || 'Senza nome'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-nature-100 text-nature-800 text-[11px] font-bold">
              {activeCycle.year}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Inizio: <strong className="text-stone-700">{activeCycle.start_date}</strong> • Metodo BBT:{' '}
            <strong className="text-stone-700">{activeCycle.bbt_method}</strong>
            {activeCycle.shortest_cycle && (
              <span> • Ciclo più breve: <strong className="text-stone-700">{activeCycle.shortest_cycle}gg</strong></span>
            )}
          </p>
        </div>

        {/* Action Button: Export PDF */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={generatingPdf}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-nature-600 to-nature-500 hover:from-nature-700 hover:to-nature-600 text-white font-bold text-xs shadow-soft transition-all active:scale-95 disabled:opacity-50"
          >
            {generatingPdf ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Esporta PDF Ufficiale CAMEN</span>
          </button>
        </div>
      </div>

      {/* BBT Interactive Chart Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-nature-500" />
            <h3 className="font-bold text-stone-900 text-sm">Curva Termica Basale (BBT)</h3>
          </div>
          <p className="text-[11px] text-stone-400">Tocca un punto per modificare il giorno</p>
        </div>

        <InteractiveBbtChart
          cycle={activeCycle}
          entries={dailyEntries}
          numDays={numDays}
          onSelectDay={onSelectDayForEdit}
        />
      </div>

      {/* Symptothermal Synchronized Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-stone-900 text-sm">Matrice Sintotermica Giornaliera</h3>
          <span className="text-[11px] text-stone-400">Scorri orizzontalmente per vedere tutti i giorni</span>
        </div>

        <SymptothermalMatrix
          cycle={activeCycle}
          entries={dailyEntries}
          numDays={numDays}
          onSelectDay={onSelectDayForEdit}
        />
      </div>

    </div>
  );
};
