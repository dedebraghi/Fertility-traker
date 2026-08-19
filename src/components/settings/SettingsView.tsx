import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LegacyDataImporter } from './LegacyDataImporter';
import { LegacyCycleJSON } from '../../types';
import {
  User,
  LogOut,
  Sparkles,
  Heart,
  ShieldCheck,
  BookOpen,
  Info,
} from 'lucide-react';

interface SettingsViewProps {
  onImportLegacy: (data: LegacyCycleJSON) => Promise<void>;
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onImportLegacy, onOpenAuth }) => {
  const { user, logout } = useAuth();

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

      {/* 2. Privacy & Security Badge */}
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

      {/* 3. Legacy Data Importer (Only visible when user is logged in) */}
      {user && <LegacyDataImporter onImport={onImportLegacy} />}

      {/* 4. Guida Sintotermica Rapida CAMEN */}
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

      {/* 5. App Info */}
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
