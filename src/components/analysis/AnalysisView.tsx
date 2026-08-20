import React, { useState, useEffect, useMemo } from 'react';
import { Cycle, DailyEntry, AiAnalysisReport } from '../../types';
import {
  getGeminiSettings,
  saveGeminiSettings,
  validateGeminiApiKey,
  getCachedAnalysis,
  generateSingleCycleAnalysis,
  generateMultiCycleAnalysis,
} from '../../lib/geminiService';
import { evaluateSymptothermalStatus, computeDataFingerprint } from '../../utils/symptothermal';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Printer,
  Key,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Layers,
  Thermometer,
  Droplets,
  CalendarCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface AnalysisViewProps {
  activeCycle: Cycle | null;
  dailyEntries: Record<number, DailyEntry>;
  allCycles: Cycle[];
  onNavigateToSettings: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  activeCycle,
  dailyEntries,
  allCycles,
  onNavigateToSettings,
}) => {
  const [scope, setScope] = useState<'single' | 'multi'>('single');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [report, setReport] = useState<AiAnalysisReport | null>(null);

  // Local live evaluation
  const liveEval = useMemo(() => {
    return evaluateSymptothermalStatus(dailyEntries);
  }, [dailyEntries]);

  // Current fingerprint
  const currentFingerprint = useMemo(() => {
    return computeDataFingerprint(dailyEntries);
  }, [dailyEntries]);

  // Check API key and load cached report on mount or when active cycle changes
  useEffect(() => {
    const settings = getGeminiSettings();
    setHasApiKey(Boolean(settings.apiKey && settings.apiKey.trim().length > 0));
    setApiKeyInput(settings.apiKey || '');

    if (scope === 'single' && activeCycle) {
      const cached = getCachedAnalysis(activeCycle.id);
      setReport(cached);
    } else if (scope === 'multi') {
      const cached = getCachedAnalysis('multi_cycles');
      setReport(cached);
    }
  }, [activeCycle, scope]);

  const isOutOfDate = useMemo(() => {
    if (scope !== 'single' || !report || !activeCycle) return false;
    return report.dataFingerprint !== currentFingerprint;
  }, [scope, report, currentFingerprint, activeCycle]);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setKeyError('Inserisci una chiave API valida.');
      return;
    }
    setIsTestingKey(true);
    setKeyError(null);

    const testRes = await validateGeminiApiKey(apiKeyInput.trim());
    setIsTestingKey(false);

    if (testRes.success) {
      const settings = getGeminiSettings();
      saveGeminiSettings({ ...settings, apiKey: apiKeyInput.trim() });
      setHasApiKey(true);
    } else {
      setKeyError(testRes.message);
    }
  };

  const handleGenerateAnalysis = async () => {
    setError(null);
    setLoading(true);

    try {
      if (scope === 'single') {
        if (!activeCycle) {
          throw new Error('Nessun ciclo attivo selezionato.');
        }
        setLoadingStep('1/3 Calcolo parametri sintotermici CAMEN...');
        await new Promise((r) => setTimeout(r, 400));

        setLoadingStep('2/3 Elaborazione con Google Gemini...');
        const generated = await generateSingleCycleAnalysis(activeCycle, dailyEntries);

        setLoadingStep('3/3 Finalizzazione del referto...');
        await new Promise((r) => setTimeout(r, 300));
        setReport(generated);
      } else {
        if (allCycles.length === 0) {
          throw new Error('Nessun ciclo disponibile per l\'analisi storica.');
        }
        setLoadingStep('1/2 Raccolta trend storici...');
        await new Promise((r) => setTimeout(r, 400));

        setLoadingStep('2/2 Elaborazione comparativa Gemini...');
        const generated = await generateMultiCycleAnalysis(allCycles);
        setReport(generated);
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la generazione dell\'analisi.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!activeCycle && scope === 'single') {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto fade-in">
        <div className="w-16 h-16 rounded-3xl bg-nature-100 text-nature-600 flex items-center justify-center mx-auto mb-4 shadow-soft">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Nessun ciclo selezionato</h2>
        <p className="text-xs text-stone-500">
          Crea o seleziona un ciclo per visualizzare e generare l'analisi sintotermica intelligente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 fade-in">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-nature-100 text-nature-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              Analisi Sintotermica AI
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide">
              100% GRATUITO
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Interpretazione pedagogica e divulgativa dei dati sintotermici (CAMEN / Roetzer) con Google Gemini.
          </p>
        </div>

        {/* Scope Selector: Single vs Multi */}
        <div className="flex items-center bg-stone-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              scope === 'single'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ciclo Attivo</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('multi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              scope === 'multi'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Storico ({allCycles.length})</span>
          </button>
        </div>
      </div>


      {/* KPI Visual Cards (Quick Glance) */}
      {scope === 'single' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-3xl p-4 border border-nature-200/70 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Ovulazione</span>
              <CalendarCheck className="w-4 h-4 text-nature-600" />
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                  liveEval.hasOvulationDetected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {liveEval.hasOvulationDetected ? 'Confermata (3 su 6)' : 'In osservazione'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-nature-200/70 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Coverline</span>
              <Thermometer className="w-4 h-4 text-nature-600" />
            </div>
            <div className="mt-2">
              <span className="text-base font-extrabold text-stone-900">
                {liveEval.coverline !== null ? `${liveEval.coverline.toFixed(2)} °C` : '--'}
              </span>
              <span className="text-[10px] text-stone-400 ml-1">
                {liveEval.coverline !== null ? '(6 bassi)' : ''}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-nature-200/70 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Picco Muco</span>
              <Droplets className="w-4 h-4 text-nature-600" />
            </div>
            <div className="mt-2">
              <span className="text-base font-extrabold text-stone-900">
                {liveEval.mucusPeakDay !== null ? `Giorno ${liveEval.mucusPeakDay}` : '--'}
              </span>
              <span className="text-[10px] text-stone-400 block">
                {liveEval.mucusPostPeakDays.length > 0 ? `+${liveEval.mucusPostPeakDays.length} gg post-picco` : 'Fertile'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-nature-200/70 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Finestra Fertile</span>
              <ShieldAlert className="w-4 h-4 text-nature-600" />
            </div>
            <div className="mt-2">
              <span
                className={`text-xs font-bold block ${
                  liveEval.fertileWindowClosedDay !== null
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {liveEval.fertileWindowClosedDay !== null
                  ? `Chiusa (sera gg ${liveEval.fertileWindowClosedDay})`
                  : 'Aperta / Da confermare'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Out of Date Banner */}
      {isOutOfDate && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-sky-900 print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Sono stati inseriti o modificati nuovi dati dopo l'ultima analisi generata.</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateAnalysis}
            disabled={loading || !hasApiKey}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold whitespace-nowrap transition-all shadow-sm disabled:opacity-50"
          >
            Aggiorna Report
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-3xl p-4 border border-nature-200/70 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || !hasApiKey}
            onClick={handleGenerateAnalysis}
            className="px-4 py-2.5 rounded-2xl bg-nature-700 hover:bg-nature-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{loadingStep || 'Elaborazione...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{report ? 'Rigenera Analisi' : 'Genera Analisi con Gemini'}</span>
              </>
            )}
          </button>

          {report && (
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Generato: {new Date(report.generatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} • Modello: {report.modelUsed}
            </span>
          )}
        </div>

        {report && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Copia testo del report"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiato!' : 'Copia'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Stampa o salva in PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Stampa / PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 text-red-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Si è verificato un errore durante la generazione:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-3xl p-8 border border-nature-200/70 shadow-card space-y-6 animate-pulse">
          <div className="h-6 bg-nature-100 rounded-xl w-1/3" />
          <div className="space-y-3">
            <div className="h-4 bg-stone-100 rounded-lg w-full" />
            <div className="h-4 bg-stone-100 rounded-lg w-5/6" />
            <div className="h-4 bg-stone-100 rounded-lg w-4/6" />
          </div>
          <div className="h-6 bg-nature-100 rounded-xl w-1/4 pt-4" />
          <div className="space-y-3">
            <div className="h-4 bg-stone-100 rounded-lg w-full" />
            <div className="h-4 bg-stone-100 rounded-lg w-3/4" />
          </div>
        </div>
      )}

      {/* Report Markdown Display */}
      {!loading && report && (
        <div
          id="ai-printable-report"
          className="bg-white rounded-3xl p-6 sm:p-8 border border-nature-200/70 shadow-card text-stone-800 space-y-6 prose-sm max-w-none print:p-0 print:border-none print:shadow-none"
        >
          {/* Printable Header Info */}
          <div className="border-b border-nature-100 pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-stone-900">
                  {scope === 'single'
                    ? `Report Sintotermico • Ciclo ${report.cycleNumber}`
                    : 'Report Storico Comparativo Pluri-Ciclo'}
                </h1>
                <p className="text-xs text-stone-400 mt-0.5">
                  Generato il {new Date(report.generatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Modello: {report.modelUsed}
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-nature-700 bg-nature-50 px-2.5 py-1 rounded-xl border border-nature-200">
                  CAMEN / Roetzer
                </span>
              </div>
            </div>
          </div>

          {/* Formatted Markdown Content */}
          <div className="space-y-4 text-stone-700 text-sm leading-relaxed whitespace-pre-line">
            {report.markdownContent}
          </div>
        </div>
      )}

      {/* Empty State when no report has been generated yet */}
      {!loading && !report && !error && (
        <div className="bg-white rounded-3xl p-10 border border-nature-200/70 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-nature-100 text-nature-600 flex items-center justify-center mx-auto shadow-soft">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-stone-900">
              Nessun report generato per questo {scope === 'single' ? 'ciclo' : 'periodo'}
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Premi il pulsante <strong>"Genera Analisi con Gemini"</strong> per ottenere una disamina pedagogica e completa dei tuoi dati fisiologici, curva termica, muco e cervice.
            </p>
          </div>
          {hasApiKey && (
            <button
              type="button"
              onClick={handleGenerateAnalysis}
              className="px-6 py-2.5 rounded-2xl bg-nature-700 hover:bg-nature-800 text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Avvia Analisi Gratuita</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
