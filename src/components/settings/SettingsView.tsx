import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LegacyDataImporter } from './LegacyDataImporter';
import { LegacyCycleJSON } from '../../types';
import {
  getGeminiSettings,
  saveGeminiSettings,
  validateGeminiApiKey,
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
} from '../../lib/geminiService';
import {
  User,
  LogOut,
  Sparkles,
  Heart,
  ShieldCheck,
  BookOpen,
  Info,
  Smartphone,
  Download,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface SettingsViewProps {
  onImportLegacy: (data: LegacyCycleJSON) => Promise<void>;
  onResetAllUserData?: () => Promise<void>;
  onOpenAuth: () => void;
  onOpenInstall: () => void;
  isStandalone?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onImportLegacy,
  onResetAllUserData,
  onOpenAuth,
  onOpenInstall,
  isStandalone,
}) => {
  const { user, logout } = useAuth();

  const [geminiKey, setGeminiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyStatusMessage, setKeyStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account Reset State
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const settings = getGeminiSettings();
    setGeminiKey(settings.apiKey);
    setSelectedModel(settings.selectedModel);
    setIncludeNotes(settings.includeNotes);
  }, []);

  const handleResetAccount = async () => {
    if (!onResetAllUserData) return;
    const firstConfirm = window.confirm(
      "⚠️ ATTENZIONE: Sei sicuro di voler eliminare TUTTI i dati registrati su questo account?\n\nVerranno cancellati definitivamente tutti i cicli, le temperature, i sintomi e le note dal database."
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "Conferma finale: Vuoi davvero ripristinare l'account a vergine? Questa operazione è IRREVERSIBILE."
    );
    if (!secondConfirm) return;

    setIsResetting(true);
    setResetError(null);
    setResetSuccess(false);

    try {
      await onResetAllUserData();
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
      }, 6000);
    } catch (err: any) {
      console.error('Error resetting account:', err);
      setResetError(err.message || 'Errore durante l\'eliminazione dei dati');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveAndTestGemini = async () => {
    if (!geminiKey.trim()) {
      setKeyStatusMessage({ type: 'error', text: 'Inserisci una chiave API prima di testare.' });
      return;
    }
    setIsTestingKey(true);
    setKeyStatusMessage(null);

    const testRes = await validateGeminiApiKey(geminiKey.trim(), selectedModel);
    setIsTestingKey(false);

    if (testRes.success) {
      saveGeminiSettings({
        apiKey: geminiKey.trim(),
        selectedModel,
        includeNotes,
      });
      setKeyStatusMessage({ type: 'success', text: testRes.message });
    } else {
      setKeyStatusMessage({ type: 'error', text: testRes.message });
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    saveGeminiSettings({
      apiKey: geminiKey.trim(),
      selectedModel: modelId,
      includeNotes,
    });
  };

  const handleToggleNotes = () => {
    const newVal = !includeNotes;
    setIncludeNotes(newVal);
    saveGeminiSettings({
      apiKey: geminiKey.trim(),
      selectedModel,
      includeNotes: newVal,
    });
  };


  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24 fade-in">
      
      <div>
        <h2 className="text-xl font-bold text-stone-900">Profilo & Preferenze</h2>
        <p className="text-xs text-stone-500">Gestisci il tuo account e le preferenze del tracker</p>
      </div>

      {/* 1. Account Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-nature-500 to-nature-400 text-white flex items-center justify-center font-bold text-lg shadow-soft">
                {user.email?.[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-stone-900 text-sm">Il tuo Account</h3>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Sincronizzato
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-mono truncate max-w-[200px] mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-100 text-xs font-semibold transition-colors"
              title="Disconnetti"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Esci</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-nature-100 text-nature-600 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base mb-1">Proteggi i tuoi Dati</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
              Crea un account gratuito o accedi per sincronizzare i tuoi cicli sul cloud sicuro e consultarli da qualsiasi dispositivo.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-6 py-2.5 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs shadow-soft transition-all"
            >
              Accedi o Registrati
            </button>
          </div>
        )}
      </div>

      {/* 2. Install PWA Section */}
      {!isStandalone && (
        <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-nature-100 text-nature-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Installa come App</h3>
              <p className="text-[11px] text-stone-400">Aggiungi l'icona alla schermata Home</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInstall}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs shadow-soft transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installa</span>
          </button>
        </div>
      )}

      {/* 3. Privacy & Security Badge */}
      <div className="bg-nature-50 rounded-3xl p-5 border border-nature-200/80 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-nature-100 text-nature-700 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-nature-900 space-y-1">
          <h4 className="font-bold">Privacy e Riservatezza Totale</h4>
          <p className="text-nature-700 leading-relaxed">
            I tuoi dati intimi, le misurazioni e le annotazioni sono crittografati e accessibili esclusivamente a te. Nessun dato viene condiviso con terzi.
          </p>
        </div>
      </div>

      {/* 4. Assistente AI (Google Gemini) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Assistente AI Sintotermico</h3>
              <p className="text-[11px] text-stone-400">Google Gemini API integrata (100% Gratuito)</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            🟢 Attivo
          </span>
        </div>

        {/* Test Connection Button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-stone-500">Stato del servizio:</span>
          <button
            type="button"
            disabled={isTestingKey}
            onClick={handleSaveAndTestGemini}
            className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isTestingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-600" />}
            <span>Testa Connessione</span>
          </button>
        </div>

        {keyStatusMessage && (
          <p
            className={`text-xs p-2.5 rounded-xl border flex items-center gap-1.5 ${
              keyStatusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {keyStatusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{keyStatusMessage.text}</span>
          </p>
        )}

        {/* Model Selector */}
        <div className="space-y-1.5 pt-2 border-t border-stone-100">
          <label className="text-xs font-semibold text-stone-700 block">
            Modello AI Utilizzato
          </label>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-stone-400">
            L'app impiega automaticamente Gemini 3.6 Flash di ultima generazione con fallback automatico.
          </p>
        </div>

        {/* Toggle Include Notes */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div>
            <span className="text-xs font-semibold text-stone-700 block">
              Includi note personali di disturbo
            </span>
            <span className="text-[10px] text-stone-400">
              Permette all'AI di considerare fattori come febbre, sonno o stress.
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleNotes}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              includeNotes ? 'bg-nature-600' : 'bg-stone-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                includeNotes ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>


      {/* 5. Legacy Data Importer (Only visible when user is logged in) */}
      {user && <LegacyDataImporter onImport={onImportLegacy} />}

      {/* 6. Danger Zone: Ripristino Account a Vergine (Only visible when user is logged in) */}
      {user && onResetAllUserData && (
        <div className="bg-rose-50/70 rounded-3xl p-5 sm:p-6 border border-rose-200/90 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 text-rose-800">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-rose-950 text-sm">Zona Pericolo: Ripristino Account</h3>
              <p className="text-[11px] text-rose-700">Cancella tutti i dati salvati e ricomincia da zero</p>
            </div>
          </div>

          <p className="text-xs text-rose-900 leading-relaxed bg-white/60 p-3.5 rounded-2xl border border-rose-100">
            Questa operazione eliminerà permanentemente tutti i <strong>cicli mestruali</strong>, le <strong>misurazioni giornaliere (BBT, muco, cervice, rapporti)</strong> e le <strong>note</strong> associate a questo account su Supabase, riportando l'applicazione allo stato iniziale pulito (account vergine).
          </p>

          {resetError && (
            <div className="p-3 rounded-xl bg-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Tutti i dati sono stati cancellati con successo. Il tuo account è ora pulito e vergine!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetAccount}
            disabled={isResetting}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResetting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Cancellazione in corso...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Elimina Tutti i Dati & Ripristina Account a Vergine</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 7. Guida Sintotermica Rapida CAMEN */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sage-100 text-sage-700">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Metodo Sintotermico CAMEN</h3>
            <p className="text-[11px] text-stone-400">Promemoria scientifico per l'osservazione</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-stone-600 pt-2 border-t border-stone-100 leading-relaxed">
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <p className="font-bold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-nature-600" />
              <span>Temperatura Basale (BBT)</span>
            </p>
            <p className="text-[11px] text-stone-500">
              Misura la temperatura ogni mattina subito al risveglio, prima di alzarti dal letto, con lo stesso metodo (es. vaginale) e approssimativamente alla stessa ora.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <p className="font-bold text-stone-800 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Sensazione & Muco Cervicale</span>
            </p>
            <p className="text-[11px] text-stone-500">
              Registra la sensazione vulvare più fertile percepita durante la giornata (Asciutto ➔ Umido ➔ Bagnato ➔ Lubrificato) e l'aspetto del muco (Trasparente, Filante, ecc.).
            </p>
          </div>
        </div>
      </div>

      {/* 6. App Info */}
      <div className="text-center text-[11px] text-stone-400 space-y-1">
        <div className="flex items-center justify-center gap-1">
          <Info className="w-3 h-3" />
          <span>Fertility Tracker • Versione 2.0</span>
        </div>
        <p>Conforme allo standard CAMEN / Roetzer</p>
      </div>

    </div>
  );
};
