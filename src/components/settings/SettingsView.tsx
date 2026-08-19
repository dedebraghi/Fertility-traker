import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseCredentials } from '../../lib/supabase';
import { LegacyDataImporter } from './LegacyDataImporter';
import { LegacyCycleJSON } from '../../types';
import { Database, CheckCircle, ShieldCheck, LogOut } from 'lucide-react';

interface SettingsViewProps {
  onImportLegacy: (data: LegacyCycleJSON) => Promise<void>;
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onImportLegacy, onOpenAuth }) => {
  const { user, isConfigured, logout, updateCredentials } = useAuth();
  const creds = getSupabaseCredentials();

  const [url, setUrl] = useState(creds.url);
  const [anonKey, setAnonKey] = useState(creds.anonKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = updateCredentials(url, anonKey);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24 fade-in">
      
      <div>
        <h2 className="text-xl font-bold text-stone-900">Impostazioni & Database</h2>
        <p className="text-xs text-stone-500">Configurazione Supabase Free Tier e gestione account</p>
      </div>

      {/* 1. Account Status */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-nature-100 text-nature-700 flex items-center justify-center font-bold text-base">
              {user ? user.email?.[0].toUpperCase() : '?'}
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                {user ? 'Account Collegato' : 'Nessun utente collegato'}
              </h3>
              <p className="text-xs text-stone-500 font-mono truncate max-w-[200px]">
                {user ? user.email : 'Accedi per sincronizzare i tuoi dati'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              type="button"
              onClick={logout}
              className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors"
              title="Disconnetti"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs shadow-soft"
            >
              Accedi
            </button>
          )}
        </div>
      </div>

      {/* 2. Supabase Connection Configuration */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-nature-200/70 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Collegamento Supabase (Free)</h3>
              <p className="text-[11px] text-stone-400">URL Progetto e Anon Public Key</p>
            </div>
          </div>

          {isConfigured ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Connesso
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              Da configurare
            </span>
          )}
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-3 mt-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
              Project URL
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono text-stone-800 focus:outline-none focus:bg-white focus:border-nature-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
              Anon Public API Key
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono text-stone-800 focus:outline-none focus:bg-white focus:border-nature-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-stone-400">
              Disponibili nella dashboard di Supabase → Project Settings → API
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs shadow-soft transition-all"
            >
              {savedSuccess ? 'Salvato!' : 'Salva Chiavi'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. SQL Setup & Security Instructions */}
      <div className="bg-nature-50 rounded-3xl p-5 sm:p-6 border border-nature-200/80">
        <div className="flex items-center gap-2 mb-2 font-bold text-nature-900 text-sm">
          <ShieldCheck className="w-4 h-4 text-nature-600" />
          <span>Guida Inizializzazione Tabelle Supabase</span>
        </div>
        <p className="text-xs text-nature-800 leading-relaxed mb-3">
          Per creare le tabelle e attivare la sicurezza <strong>Row Level Security (RLS)</strong>, copia il file <code>supabase-schema.sql</code> fornito nel progetto e incollalo nell'<strong>SQL Editor</strong> del tuo pannello Supabase, poi clicca su <em>Run</em>.
        </p>
      </div>

      {/* 4. Legacy Data Importer */}
      {user && <LegacyDataImporter onImport={onImportLegacy} />}

    </div>
  );
};
