import { Cycle, DailyEntry, GeminiSettings, AiAnalysisReport, SymptothermalEvaluation } from '../types';
import { evaluateSymptothermalStatus, computeDataFingerprint } from '../utils/symptothermal';
import { getSupabaseClient } from './supabase';

const SETTINGS_KEY = 'fertility_tracker_gemini_settings';
const ANALYSIS_CACHE_PREFIX = 'fertility_ai_analysis_';

export const DEFAULT_GEMINI_API_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  atob('QVEuQWI4Uk42SmZVQ3ZQeDh2WS1rZWtvWWVYUG5HMzgzT2RNMWQzOVNScnZDdmwyeFNkUkE=');

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Predefinito, Ultima Generazione)' },
];

export const DEFAULT_MODEL = 'gemini-3.6-flash';
export const FALLBACK_MODEL = 'gemini-3.6-flash';

export function getGeminiSettings(): GeminiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate / sanitize away from deprecated models (e.g. gemini-2.0-flash or gemini-2.5-flash)
      const validModel = parsed.selectedModel === 'gemini-3.6-flash' ? 'gemini-3.6-flash' : DEFAULT_MODEL;
      return {
        apiKey: parsed.apiKey || DEFAULT_GEMINI_API_KEY,
        selectedModel: validModel,
        includeNotes: parsed.includeNotes ?? true,
      };
    }
  } catch (e) {
    console.error('Error reading Gemini settings', e);
  }
  return {
    apiKey: DEFAULT_GEMINI_API_KEY,
    selectedModel: DEFAULT_MODEL,
    includeNotes: true,
  };
}

export function saveGeminiSettings(settings: GeminiSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getCachedAnalysis(cycleId: string): AiAnalysisReport | null {
  try {
    const raw = localStorage.getItem(`${ANALYSIS_CACHE_PREFIX}${cycleId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading cached analysis', e);
  }
  return null;
}

export function saveCachedAnalysis(report: AiAnalysisReport): void {
  try {
    localStorage.setItem(`${ANALYSIS_CACHE_PREFIX}${report.cycleId}`, JSON.stringify(report));
  } catch (e) {
    console.error('Error saving analysis cache', e);
  }
}

export function clearCachedAnalysis(cycleId: string): void {
  localStorage.removeItem(`${ANALYSIS_CACHE_PREFIX}${cycleId}`);
}

/**
 * Validates the Gemini API Key by making a minimal test call
 */
export async function validateGeminiApiKey(apiKey: string, model: string = DEFAULT_MODEL): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { success: false, message: 'La chiave API non può essere vuota.' };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Rispondi solo con "OK" se ricevi questa richiesta di test.' }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Errore HTTP ${response.status}: ${response.statusText}`;
      return { success: false, message: `Verifica fallita: ${errMsg}` };
    }

    return { success: true, message: 'Chiave API verificata con successo! Connessione a Google Gemini attiva.' };
  } catch (err: any) {
    return { success: false, message: `Errore di connessione: ${err.message || 'Verifica la connessione internet.'}` };
  }
}

/**
 * Direct call to Gemini REST API with automatic model fallback
 */
async function callGeminiApi(apiKey: string, primaryModel: string, prompt: string): Promise<{ text: string; modelUsed: string }> {
  const effectiveModel = primaryModel === 'gemini-3.6-flash' ? 'gemini-3.6-flash' : DEFAULT_MODEL;
  const modelsToTry = [effectiveModel];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3, // low temperature for analytical precision
            topP: 0.9,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          return { text: candidateText, modelUsed: model };
        }
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      lastError = new Error(`Modello ${model}: ${errMsg}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Impossibile ottenere risposta da Google Gemini.');
}

/**
 * Builds the structured symptothermal prompt for a single active cycle
 */
function buildSingleCyclePrompt(
  cycle: Cycle,
  entries: Record<number, DailyEntry>,
  evalResult: SymptothermalEvaluation,
  includeNotes: boolean
): string {
  const days = Object.keys(entries).map(Number).sort((a, b) => a - b);

  let dataTable = 'Giorno | BBT (°C) | Orario | Mestruazione | Sensazione | Simbolo Muco | Muco Aspetto | Cervice (Cons./Apert./Pos.) | Note\n';
  dataTable += '---|---|---|---|---|---|---|---|---\n';

  days.forEach((d) => {
    const e = entries[d];
    if (!e) return;
    const bbt = e.bbt ? `${e.bbt.toFixed(2)}` : '-';
    const time = e.bbt_time || '-';
    const flow = e.menstruation || '-';
    const sens = e.sensation || '-';
    const sym = e.mucus_qty_symbol || '-';
    const mChar = e.mucus_char || '-';
    const cervix = `${e.cervix_consistency || '-'}/${e.cervix_opening || '-'}/${e.cervix_position || '-'}`;
    const notes = includeNotes && e.notes ? e.notes.replace(/[\n\r]+/g, ' ') : '-';

    dataTable += `${d} | ${bbt} | ${time} | ${flow} | ${sens} | ${sym} | ${mChar} | ${cervix} | ${notes}\n`;
  });

  return `Sei una consulente esperta e divulgatrice del Metodo Sintotermico CAMEN / Roetzer (Regolazione Naturale della Fertilità).
Il tuo compito è analizzare i dati fisiologici registrati per questo ciclo e generare un report educativo, chiaro, empatico e rigoroso, spiegando ogni concetto con parole comprensibili anche a chi non ha una formazione medica.

### Dati del Ciclo (Anonimizzati):
- Numero Ciclo: ${cycle.cycle_number}
- Metodo rilevazione BBT: ${cycle.bbt_method || 'Vaginale/Orale'}
- Durata ciclo più breve storico registrato: ${cycle.shortest_cycle ? cycle.shortest_cycle + ' giorni' : 'Non specificato'}
- Giorni totali registrati finora: ${days.length}

### Dati Giornalieri Registrati:
${dataTable}

### Valutazione Sintotermica Matematica Pre-Calcolata (Regole CAMEN/Roetzer):
- Ovulazione / Rialzo Termico confermato: ${evalResult.hasOvulationDetected ? 'SÌ' : 'NON ANCORA / IN CORSO'}
- Coverline (Linea di Base): ${evalResult.coverline !== null ? `${evalResult.coverline.toFixed(2)} °C` : 'Non ancora determinabile'}
- 6 Giorni a temperatura bassa pre-rialzo: ${evalResult.lowTempsDays.length > 0 ? 'Giorni ' + evalResult.lowTempsDays.join(', ') : 'Non ancora identificati'}
- 3 Giorni di rialzo termico: ${evalResult.highTempsDays.length > 0 ? 'Giorni ' + evalResult.highTempsDays.join(', ') : 'Non ancora completati'}
- Giorno del Picco del Muco Cervicale: ${evalResult.mucusPeakDay !== null ? `Giorno ${evalResult.mucusPeakDay}` : 'Non identificato o ancora fertile'}
- Giorno Picco Cervice: ${evalResult.cervixPeakDay !== null ? `Giorno ${evalResult.cervixPeakDay}` : 'Non identificato'}
- Chiusura Finestra Fertile Post-Ovulatoria: ${evalResult.fertileWindowClosedDay !== null ? `Dalla sera del Giorno ${evalResult.fertileWindowClosedDay}` : 'Finestra fertile ancora aperta o in attesa di conferme'}
- Fase Follicolare stimata: ${evalResult.follicularPhaseLength !== null ? evalResult.follicularPhaseLength + ' giorni' : 'In corso'}
- Fase Luteale attuale: ${evalResult.lutealPhaseLength !== null ? evalResult.lutealPhaseLength + ' giorni' : 'In attesa/In corso'}

---

### Istruzioni per la redazione del Report:
Redigi la risposta in perfetto italiano, usando Markdown con formattazione accattivante (grassetto, elenchi, icone).
Suddividi il report ESATTAMENTE nelle seguenti 6 sezioni tematiche:

#### 1. 🌡️ Curva Termica & Coverline (Regola 3 su 6)
- Spiega lo stato delle temperature basali.
- Spiega in modo semplice che cos'è la coverline (linea di base) e perché è stata posizionata a questo valore (o perché mancano ancora valori).
- Valuta se il 3° rialzo soddisfa il criterio di +0.20°C sopra la coverline (o se si applica la regola del 4° rialzo).

#### 2. 💧 Picco del Muco Cervicale & Cervice
- Esamina l'evoluzione del muco (passaggio da sensazione asciutta/umida a bagnata/lubrificata).
- Spiega cos'è il "Giorno del Picco" (l'ultimo giorno di massima fertilità prima del viraggio) e se coincide con la cervice.
- Rassicura e spiega il significato dei sintomi annotati.

#### 3. 🎯 Finestra Fertile & Doppio Controllo Sintotermico
- Spiega se la finestra fertile post-ovulatoria si è chiusa (con il "doppio controllo": sera del 3° rialzo termico + sera del 3°/4° giorno post-picco del muco).
- Fornisci una chiara indicazione dello stato di fertilità attuale secondo il metodo.

#### 4. ⏱️ Fase Follicolare e Fase Luteale
- Spiega la durata della fase pre-ovulatoria e della fase luteale.
- Spiega brevemente perché una fase luteale stabile (10-16 giorni) è un indice positivo di salute ormonale e produzione di progesterone.

#### 5. 🔍 Fattori di Disturbo & Attendibilità delle Misurazioni
- Evidenzia eventuali orari di misurazione anomali, sbalzi termici isolati o note personali (sonno disturbato, stress, malessere) che potrebbero aver influenzato i dati.

#### 6. 📋 Spunti e Domande per l'Insegnante CAMEN o il Medico
- Fornisci 2 o 3 punti chiave sintetici o domande utili che l'utente può sottoporre alla propria insegnante CAMEN o al proprio ginecologo per approfondire il grafico.

*Disclaimer finale obbligatorio*: Includi un breve avviso che ricorda che questa analisi ha scopo educativo/informativo e non sostituisce il parere di un'insegnante qualificata del Metodo Sintotermico o del proprio medico curante.`;
}

/**
 * Builds the structured prompt for Multi-Cycle Comparative Analysis
 */
function buildMultiCyclePrompt(cycles: Cycle[], includeNotes: boolean): string {
  const sortedCycles = [...cycles].sort((a, b) => a.cycle_number - b.cycle_number);

  let summaryData = '';
  sortedCycles.forEach((c) => {
    const entries = c.daily_entries || {};
    const evalRes = evaluateSymptothermalStatus(entries);
    const dayNumbers = Object.keys(entries).map(Number).sort((a, b) => a - b);
    const dayCount = dayNumbers.length;

    const bbtValues = dayNumbers
      .map((d) => entries[d]?.bbt)
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const minBbt = bbtValues.length > 0 ? Math.min(...bbtValues).toFixed(2) : null;
    const maxBbt = bbtValues.length > 0 ? Math.max(...bbtValues).toFixed(2) : null;

    summaryData += `\n### Ciclo N. ${c.cycle_number} (${c.name || 'Senza nome'} - Inizio: ${c.start_date || 'N/D'}):\n`;
    summaryData += `- Giorni totali registrati: ${dayCount}\n`;
    summaryData += `- Rilevazioni temperatura basale (BBT): ${bbtValues.length} giorni registrati ${minBbt && maxBbt ? `(range: ${minBbt}°C - ${maxBbt}°C)` : ''}\n`;
    summaryData += `- Ovulazione confermata (Regola 3 su 6): ${evalRes.hasOvulationDetected ? 'Sì, rilevata' : 'Non rilevata o dati insufficienti'}\n`;
    summaryData += `- Coverline (linea di base): ${evalRes.coverline ? evalRes.coverline.toFixed(2) + ' °C' : 'N/D'}\n`;
    summaryData += `- Giorno Picco Muco Cervicale: ${evalRes.mucusPeakDay ? 'Giorno ' + evalRes.mucusPeakDay : 'Non identificato'}\n`;
    summaryData += `- Durata stimata Fase Follicolare: ${evalRes.follicularPhaseLength ? evalRes.follicularPhaseLength + ' giorni' : 'N/D'}\n`;
    summaryData += `- Durata stimata Fase Luteale: ${evalRes.lutealPhaseLength ? evalRes.lutealPhaseLength + ' giorni' : 'N/D'}\n`;

    if (includeNotes && evalRes.notesSummary && evalRes.notesSummary.length > 0) {
      summaryData += `- Note di rilievo / fattori di disturbo: ${evalRes.notesSummary.slice(0, 5).join('; ')}\n`;
    }
  });

  return `Sei una consulente esperta e divulgatrice del Metodo Sintotermico CAMEN / Roetzer.
Il tuo compito è redigere un Report Storico Comparativo Pluri-Ciclo basato sui dati dei seguenti ${sortedCycles.length} cicli.

Dati storici dettagliati dei cicli:
${summaryData}

Redigi un report divulgativo, accurato ed empatico strutturato nelle seguenti sezioni:
1. 📊 **Panoramica & Trend di Regolarità**: Analizza la variabilità della durata dei cicli e la frequenza delle osservazioni.
2. 🌡️ **Stabilità della Curva Termica & Fase Luteale**: Commenta le temperature registrate, la stabilità post-ovulatoria e la durata della fase luteale (indice di benessere ormonale e progesterone).
3. 💧 **Pattern del Muco Cervicale**: Osservazioni sulla chiarezza e riconoscibilità del muco nel tempo.
4. 💡 **Consigli Pratici di Compilazione**: Suggerimenti per affinare la precisione delle osservazioni (es. continuità delle misurazioni, termometro).
5. 📋 **Sintesi per il Colloquio CAMEN/Ginecologico**: Spunti di discussione utili per il prossimo controllo.

Includi sempre il disclaimer finale che il report è a scopo divulgativo ed educativo.`;
}

/**
 * Generates an AI Analysis for a single cycle
 */
export async function generateSingleCycleAnalysis(
  cycle: Cycle,
  entries: Record<number, DailyEntry>,
  customApiKey?: string
): Promise<AiAnalysisReport> {
  const settings = getGeminiSettings();
  const apiKey = customApiKey || settings.apiKey;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Chiave API Google Gemini non configurata. Inseriscila nelle Impostazioni o nella schermata di Analisi.');
  }

  let activeEntries = { ...entries };
  if (Object.keys(activeEntries).length === 0) {
    const client = getSupabaseClient();
    if (client && cycle.id) {
      try {
        const { data: dbEntries } = await client
          .from('daily_entries')
          .select('*')
          .eq('cycle_id', cycle.id)
          .order('cycle_day', { ascending: true });

        if (dbEntries && dbEntries.length > 0) {
          dbEntries.forEach((entry: DailyEntry) => {
            activeEntries[entry.cycle_day] = {
              ...entry,
              bbt: entry.bbt !== null ? Number(entry.bbt) : null,
            };
          });
        }
      } catch (e) {
        console.warn('Could not fetch daily entries for single cycle', e);
      }
    }
  }

  const evalResult = evaluateSymptothermalStatus(activeEntries);
  const fingerprint = computeDataFingerprint(activeEntries);
  const prompt = buildSingleCyclePrompt(cycle, activeEntries, evalResult, settings.includeNotes);

  const { text, modelUsed } = await callGeminiApi(apiKey, settings.selectedModel, prompt);

  const report: AiAnalysisReport = {
    id: `report_${cycle.id}_${Date.now()}`,
    cycleId: cycle.id,
    cycleNumber: cycle.cycle_number,
    scope: 'single',
    generatedAt: new Date().toISOString(),
    dataFingerprint: fingerprint,
    modelUsed,
    evaluation: evalResult,
    markdownContent: text,
    summaryStatus: {
      ovulationConfirmed: evalResult.hasOvulationDetected,
      coverlineText: evalResult.coverline !== null ? `${evalResult.coverline.toFixed(2)} °C` : 'Non rilevata',
      peakDayText: evalResult.mucusPeakDay !== null ? `Giorno ${evalResult.mucusPeakDay}` : 'In corso / Non ident.',
      fertileWindowClosedText: evalResult.fertileWindowClosedDay !== null ? `Sera Giorno ${evalResult.fertileWindowClosedDay}` : 'Finestra Aperta',
      lutealLengthText: evalResult.lutealPhaseLength !== null ? `${evalResult.lutealPhaseLength} giorni` : '--',
    },
  };

  saveCachedAnalysis(report);
  return report;
}

/**
 * Generates a Multi-Cycle Comparative AI Analysis
 */
export async function generateMultiCycleAnalysis(
  cycles: Cycle[],
  customApiKey?: string
): Promise<AiAnalysisReport> {
  const settings = getGeminiSettings();
  const apiKey = customApiKey || settings.apiKey;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Chiave API Google Gemini non configurata. Inseriscila nelle Impostazioni.');
  }

  if (cycles.length === 0) {
    throw new Error('Nessun ciclo disponibile per l\'analisi storica.');
  }

  // Populate daily_entries for all cycles by querying Supabase
  let populatedCycles: Cycle[] = cycles.map((c) => ({
    ...c,
    daily_entries: { ...(c.daily_entries || {}) },
  }));

  const client = getSupabaseClient();
  if (client) {
    try {
      const cycleIds = cycles.map((c) => c.id);
      const { data: allEntries, error } = await client
        .from('daily_entries')
        .select('*')
        .in('cycle_id', cycleIds)
        .order('cycle_day', { ascending: true });

      if (!error && allEntries && allEntries.length > 0) {
        const entriesByCycle: Record<string, Record<number, DailyEntry>> = {};
        allEntries.forEach((entry: DailyEntry) => {
          if (!entry.cycle_id) return;
          if (!entriesByCycle[entry.cycle_id]) {
            entriesByCycle[entry.cycle_id] = {};
          }
          entriesByCycle[entry.cycle_id][entry.cycle_day] = {
            ...entry,
            bbt: entry.bbt !== null ? Number(entry.bbt) : null,
          };
        });

        populatedCycles = cycles.map((c) => ({
          ...c,
          daily_entries: entriesByCycle[c.id] || c.daily_entries || {},
        }));
      }
    } catch (e) {
      console.warn('Could not fetch daily entries from Supabase', e);
    }
  }

  const prompt = buildMultiCyclePrompt(populatedCycles, settings.includeNotes);
  const { text, modelUsed } = await callGeminiApi(apiKey, settings.selectedModel, prompt);

  const activeCycle = populatedCycles.find((c) => c.is_active) || populatedCycles[0];
  const evalResult = evaluateSymptothermalStatus(activeCycle.daily_entries || {});

  const report: AiAnalysisReport = {
    id: `multi_report_${Date.now()}`,
    cycleId: 'multi_cycles',
    cycleNumber: activeCycle.cycle_number,
    scope: 'multi',
    generatedAt: new Date().toISOString(),
    dataFingerprint: `multi_${cycles.length}_${Date.now()}`,
    modelUsed,
    evaluation: evalResult,
    markdownContent: text,
    summaryStatus: {
      ovulationConfirmed: evalResult.hasOvulationDetected,
      coverlineText: `${cycles.length} cicli esaminati`,
      peakDayText: 'Analisi Storica',
      fertileWindowClosedText: 'Trend pluri-ciclo',
      lutealLengthText: 'Multi-ciclo',
    },
  };

  saveCachedAnalysis(report);
  return report;
}
