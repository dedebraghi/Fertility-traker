import React, { useState, useRef } from 'react';
import { LegacyCycleJSON } from '../../types';
import { UploadCloud, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface LegacyDataImporterProps {
  onImport: (data: LegacyCycleJSON) => Promise<void>;
}

export const LegacyDataImporter: React.FC<LegacyDataImporterProps> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Il file non contiene un JSON valido.');
        }

        await onImport(parsed);
        setResult({
          type: 'success',
          message: `Ciclo ${parsed.cycle_number || ''} (${parsed.year || ''}) importato con successo!`,
        });
      } catch (err: any) {
        setResult({
          type: 'error',
          message: `Errore: ${err.message}`,
        });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setResult({ type: 'error', message: 'Impossibile leggere il file selezionato.' });
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-xl bg-nature-100 text-nature-700">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-stone-900 text-sm">Importa Cicli Precedenti (JSON)</h3>
          <p className="text-[11px] text-stone-400">Carica i file JSON esportati dall'app precedente</p>
        </div>
      </div>

      <p className="text-xs text-stone-600 mt-2 mb-4 leading-relaxed">
        Seleziona i tuoi file <code>.json</code> uno alla volta per salvarli nel tuo account Supabase.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-nature-300 hover:border-nature-500 bg-nature-50/40 hover:bg-nature-50/80 text-nature-800 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-nature-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileText className="w-4 h-4 text-nature-600" />
        )}
        <span>{loading ? 'Importazione in corso...' : 'Seleziona File JSON da importare'}</span>
      </button>

      {result && (
        <div
          className={`mt-3 p-3 rounded-2xl text-xs flex items-start gap-2 ${
            result.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
};
