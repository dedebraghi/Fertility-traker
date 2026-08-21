import React, { useRef } from 'react';
import { Cycle, FullCycleItem, LegacyCycleJSON } from '../../types';
import { Plus, Check, Edit2, Trash2, Calendar, UploadCloud, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDateItalian } from '../../utils/symptothermal';

interface CyclesListViewProps {
  cycles: Cycle[];
  fullCycleSequence?: FullCycleItem[];
  activeCycleId: string | null;
  onSelectActiveCycle: (id: string) => void;
  onSelectEstimatedCycle?: (startDate: string) => void;
  onOpenNewCycleModal: () => void;
  onOpenEditCycleModal: (cycle: Cycle) => void;
  onDeleteCycle: (id: string) => Promise<void>;
  onImportLegacy: (data: LegacyCycleJSON) => Promise<void>;
  onReindexCycles?: () => Promise<void>;
  onOpenAuth: () => void;
}

export const CyclesListView: React.FC<CyclesListViewProps> = ({
  cycles,
  fullCycleSequence = [],
  activeCycleId,
  onSelectActiveCycle,
  onSelectEstimatedCycle,
  onOpenNewCycleModal,
  onOpenEditCycleModal,
  onDeleteCycle,
  onImportLegacy,
  onReindexCycles,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async (id: string, num: number) => {
    if (confirm(`Sei sicuro/a di voler eliminare il ciclo ${num} e tutti i suoi dati registrati?`)) {
      await onDeleteCycle(id);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      alert("Accedi prima con il tuo account per salvare i dati sul database.");
      onOpenAuth();
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Il file non contiene un formato JSON valido.');
        }
        await onImportLegacy(parsed);
        alert(`Ciclo "${parsed.name || ''}" (${parsed.year || ''}) importato con successo! I cicli sono stati riordinati e ricalcolati automaticamente.`);
      } catch (err: any) {
        alert(`Errore durante l'importazione: ${err.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Use fullCycleSequence if available, sorted descending for display (latest first)
  const displayCycles = fullCycleSequence.length > 0
    ? [...fullCycleSequence].reverse()
    : cycles.map(c => ({
        id: c.id,
        cycle_number: c.cycle_number,
        year: c.year,
        month_str: c.month_str,
        start_date: c.start_date,
        bbt_method: c.bbt_method,
        shortest_cycle: c.shortest_cycle,
        teacher_code: c.teacher_code,
        protocol_number: c.protocol_number,
        sigla: c.sigla,
        is_active: c.is_active,
        is_estimated: false,
        has_data: true,
      }));

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 fade-in">
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top action header with New Cycle and Import JSON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Archivio Storico Cicli</h2>
          <p className="text-xs text-stone-500">
            Cicli reali da checkpoint mestruale e cicli stimati intermedi
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Reindex Button */}
          {onReindexCycles && cycles.length > 1 && (
            <button
              type="button"
              onClick={() => onReindexCycles()}
              className="p-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all active:scale-95 border border-stone-200"
              title="Ricalcola e allinea tutti i cicli"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Import JSON Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-nature-100 hover:bg-nature-200/80 text-nature-800 font-bold text-xs transition-all active:scale-95 border border-nature-200/70"
            title="Importa file JSON storico"
          >
            <UploadCloud className="w-4 h-4 text-nature-700" />
            <span>Importa JSON</span>
          </button>

          {/* Secondary Manual Cycle Button */}
          <button
            type="button"
            onClick={onOpenNewCycleModal}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all active:scale-95 border border-stone-200"
            title="Aggiungi ciclo passato manualmente"
          >
            <Plus className="w-4 h-4 text-stone-600" />
            <span>+ Manuale</span>
          </button>
        </div>
      </div>

      {displayCycles.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-nature-200/70 shadow-card">
          <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-bold text-stone-700 text-sm">Nessun ciclo presente</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Puoi iniziare direttamente dalla schermata "Oggi" o importare un archivio JSON pregresso.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-nature-100 text-nature-800 font-bold text-xs"
            >
              📥 Importa JSON
            </button>
            <button
              onClick={onOpenNewCycleModal}
              className="px-4 py-2 rounded-xl bg-nature-600 text-white font-bold text-xs shadow-soft"
            >
              + Inserisci Ciclo Storico
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayCycles.map((cycle) => {
            const isReal = !cycle.is_estimated && Boolean(cycle.id);
            const realCycleObj = isReal ? cycles.find(c => c.id === cycle.id) : null;
            const isActive = isReal && cycle.id === activeCycleId;

            if (cycle.is_estimated) {
              return (
                <div
                  key={`est_${cycle.cycle_number}_${cycle.start_date}`}
                  className="bg-stone-50/80 rounded-3xl p-5 border border-dashed border-stone-300 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-stone-700 text-base">
                          Ciclo {cycle.cycle_number}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 text-[10px] font-bold border border-amber-200/60 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" /> Stimato • Senza dati
                        </span>
                      </div>

                      <div className="text-xs text-stone-500 mt-2 space-y-1">
                        <p>
                          Inizio stimato: <strong className="text-stone-700">{formatDateItalian(cycle.start_date)}</strong>
                          {cycle.month_str && <span> • Mesi: {cycle.month_str}</span>}
                          <span> • Anno: {cycle.year}</span>
                        </p>
                        {cycle.length_days && (
                          <p className="text-[11px] text-stone-400">
                            Durata intervallo: {cycle.length_days} giorni
                          </p>
                        )}
                      </div>
                    </div>

                    {onSelectEstimatedCycle && (
                      <button
                        type="button"
                        onClick={() => onSelectEstimatedCycle(cycle.start_date)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold text-xs transition-all shadow-none flex items-center gap-1 self-center"
                        title="Inserisci misurazioni in questo ciclo stimato"
                      >
                        <span>Inserisci dati</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cycle.id || `cycle_${cycle.cycle_number}`}
                className={`bg-white rounded-3xl p-5 border transition-all ${
                  isActive
                    ? 'border-nature-400 ring-2 ring-nature-400/20 shadow-md'
                    : 'border-nature-200/70 shadow-card hover:border-nature-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  <div
                    onClick={() => cycle.id && onSelectActiveCycle(cycle.id)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-stone-900 text-base">
                        Ciclo {cycle.cycle_number}
                      </h3>
                      {realCycleObj?.name && (
                        <span className="text-xs font-semibold text-stone-600">
                          • {realCycleObj.name}
                        </span>
                      )}
                      {isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                          <Check className="w-3 h-3" /> In Corso
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                          Archiviato
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 mt-2 space-y-1">
                      <p>
                        Inizio: <strong className="text-stone-700">{formatDateItalian(cycle.start_date)}</strong>
                        {cycle.month_str && <span> • Mesi: {cycle.month_str}</span>}
                        <span> • Anno: {cycle.year}</span>
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Metodo BBT: {cycle.bbt_method || 'Vaginale'}
                        {cycle.entries_count !== undefined && ` • ${cycle.entries_count} misurazioni`}
                        {cycle.length_days && ` • ${cycle.length_days} giorni`}
                      </p>
                    </div>
                  </div>

                  {realCycleObj && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenEditCycleModal(realCycleObj)}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        title="Modifica informazioni del ciclo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(realCycleObj.id, realCycleObj.cycle_number)}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Elimina ciclo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </div>

                {!isActive && cycle.id && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectActiveCycle(cycle.id!)}
                      className="text-xs font-bold text-nature-600 hover:text-nature-700"
                    >
                      Visualizza o imposta come attivo →
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
