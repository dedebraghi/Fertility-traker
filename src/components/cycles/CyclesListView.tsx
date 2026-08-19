import React, { useRef } from 'react';
import { Cycle, LegacyCycleJSON } from '../../types';
import { Plus, Check, Edit2, Trash2, Calendar, UploadCloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CyclesListViewProps {
  cycles: Cycle[];
  activeCycleId: string | null;
  onSelectActiveCycle: (id: string) => void;
  onOpenNewCycleModal: () => void;
  onOpenEditCycleModal: (cycle: Cycle) => void;
  onDeleteCycle: (id: string) => Promise<void>;
  onImportLegacy: (data: LegacyCycleJSON) => Promise<void>;
  onOpenAuth: () => void;
}

export const CyclesListView: React.FC<CyclesListViewProps> = ({
  cycles,
  activeCycleId,
  onSelectActiveCycle,
  onOpenNewCycleModal,
  onOpenEditCycleModal,
  onDeleteCycle,
  onImportLegacy,
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
        alert(`Ciclo "${parsed.name || ''}" (${parsed.year || ''}) importato con successo!`);
      } catch (err: any) {
        alert(`Errore durante l'importazione: ${err.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Storico Cicli</h2>
          <p className="text-xs text-stone-500">Tutti i cicli registrati sul tuo account</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import JSON Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-nature-100 hover:bg-nature-200/80 text-nature-800 font-bold text-xs transition-all active:scale-95 border border-nature-200/70"
            title="Importa file JSON"
          >
            <UploadCloud className="w-4 h-4 text-nature-700" />
            <span>Importa JSON</span>
          </button>

          {/* New Cycle Button */}
          <button
            type="button"
            onClick={onOpenNewCycleModal}
            className="flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs shadow-soft transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo</span>
          </button>
        </div>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-nature-200/70 shadow-card">
          <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-bold text-stone-700 text-sm">Nessun ciclo presente</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Crea il tuo primo ciclo o importa i tuoi vecchi file JSON per iniziare.
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
              + Crea Nuovo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const isActive = cycle.id === activeCycleId;

            return (
              <div
                key={cycle.id}
                className={`bg-white rounded-3xl p-5 border transition-all ${
                  isActive
                    ? 'border-nature-400 ring-2 ring-nature-400/20 shadow-md'
                    : 'border-nature-200/70 shadow-card hover:border-nature-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  <div
                    onClick={() => onSelectActiveCycle(cycle.id)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-base">
                        Ciclo {cycle.cycle_number}
                      </h3>
                      {cycle.name && (
                        <span className="text-xs font-semibold text-stone-600">
                          • {cycle.name}
                        </span>
                      )}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Attivo
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 mt-1.5 space-y-0.5">
                      <p>
                        Inizio: <strong className="text-stone-700">{cycle.start_date}</strong>
                        {cycle.month_str && <span> • Mesi: {cycle.month_str}</span>}
                        <span> • Anno: {cycle.year}</span>
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Metodo: {cycle.bbt_method}
                        {cycle.shortest_cycle && ` • Ciclo min: ${cycle.shortest_cycle}gg`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEditCycleModal(cycle)}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      title="Modifica informazioni"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cycle.id, cycle.cycle_number)}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Elimina ciclo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

                {!isActive && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectActiveCycle(cycle.id)}
                      className="text-xs font-bold text-nature-600 hover:text-nature-700"
                    >
                      Imposta come ciclo attivo →
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
