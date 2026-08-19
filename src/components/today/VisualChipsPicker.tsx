import React, { useState } from 'react';
import {
  MenstruationType,
  SensationType,
  MucusQtySymbol,
  CervixConsistency,
  CervixOpening,
  CervixPosition,
  IntercourseType,
} from '../../types';
import {
  SENSATION_LABELS,
  MUCUS_SYMBOL_LABELS,
  INTERCOURSE_LABELS,
  CERVIX_CONSISTENCY_LABELS,
  CERVIX_OPENING_LABELS,
  CERVIX_POSITION_LABELS,
} from '../../utils/symptothermal';
import { Droplet, Sparkles, Heart, FileText, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface VisualChipsPickerProps {
  menstruation: MenstruationType;
  sensation: SensationType;
  mucusQtySymbol: MucusQtySymbol;
  mucusQty: string | null;
  mucusChar: string | null;
  cervixConsistency: CervixConsistency;
  cervixOpening: CervixOpening;
  cervixPosition: CervixPosition;
  intercourse: IntercourseType;
  notes: string | null;
  onChangeMenstruation: (val: MenstruationType) => void;
  onChangeSensation: (val: SensationType) => void;
  onChangeMucusQtySymbol: (val: MucusQtySymbol) => void;
  onChangeMucusQty: (val: string | null) => void;
  onChangeMucusChar: (val: string | null) => void;
  onChangeCervixConsistency: (val: CervixConsistency) => void;
  onChangeCervixOpening: (val: CervixOpening) => void;
  onChangeCervixPosition: (val: CervixPosition) => void;
  onChangeIntercourse: (val: IntercourseType) => void;
  onChangeNotes: (val: string | null) => void;
}

const MUCUS_CHAR_OPTIONS = [
  { code: 'O', label: 'Opaco (O)', desc: 'Biancastro / non trasparente' },
  { code: 'T', label: 'Trasparente (T)', desc: 'Chiaro come albume d’uovo' },
  { code: 'A', label: 'Acquoso (A)', desc: 'Molto liquido' },
  { code: 'F', label: 'Filante (F)', desc: 'Si allunga tra le dita' },
  { code: 'D', label: 'Denso (D)', desc: 'Grumoso o compatto' },
  { code: 'E', label: 'Elastico (E)', desc: 'Estensibile' },
];

export const VisualChipsPicker: React.FC<VisualChipsPickerProps> = ({
  menstruation,
  sensation,
  mucusQtySymbol,
  mucusQty,
  mucusChar,
  cervixConsistency,
  cervixOpening,
  cervixPosition,
  intercourse,
  notes,
  onChangeMenstruation,
  onChangeSensation,
  onChangeMucusQtySymbol,
  onChangeMucusQty,
  onChangeMucusChar,
  onChangeCervixConsistency,
  onChangeCervixOpening,
  onChangeCervixPosition,
  onChangeIntercourse,
  onChangeNotes,
}) => {
  const [showCervix, setShowCervix] = useState<boolean>(
    Boolean(cervixConsistency || cervixOpening || cervixPosition)
  );

  // Toggle single mucus characteristic letter (e.g. "TF" -> toggle "T")
  const handleToggleMucusChar = (char: string) => {
    const current = (mucusChar || '').toUpperCase();
    let updated = '';
    if (current.includes(char)) {
      updated = current.replace(new RegExp(char, 'g'), '');
    } else {
      updated = current + char;
    }
    onChangeMucusChar(updated || null);
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Mestruazione / Perdite */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-blush-100 text-blush-600">
            <Droplet className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Mestruazione / Perdite</h3>
            <p className="text-[11px] text-stone-400">Flusso o spotting</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChangeMenstruation(menstruation === 'M' ? null : 'M')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border ${
              menstruation === 'M'
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm scale-[1.02]'
                : 'bg-nature-50/60 text-stone-700 border-nature-200/60 hover:bg-rose-50/50'
            }`}
          >
            🩸 M (Flusso)
          </button>
          <button
            type="button"
            onClick={() => onChangeMenstruation(menstruation === 'm' ? null : 'm')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border ${
              menstruation === 'm'
                ? 'bg-rose-300 text-rose-950 border-rose-400 shadow-sm scale-[1.02]'
                : 'bg-nature-50/60 text-stone-700 border-nature-200/60 hover:bg-rose-50/50'
            }`}
          >
            🌸 m (Spotting)
          </button>
          <button
            type="button"
            onClick={() => onChangeMenstruation(null)}
            className={`py-2.5 px-3 rounded-2xl text-xs font-medium transition-all border ${
              menstruation === null
                ? 'bg-stone-100 text-stone-800 border-stone-300 font-semibold'
                : 'bg-nature-50/60 text-stone-400 border-nature-200/60'
            }`}
          >
            Nessuna
          </button>
        </div>
      </div>

      {/* 2. Sensazione Vulvare (Sintotermico) */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-nature-100 text-nature-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Sensazione Vulvare</h3>
            <p className="text-[11px] text-stone-400">Cosa percepisci durante la giornata</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(SENSATION_LABELS) as SensationType[]).map((key) => {
            if (!key) return null;
            const item = SENSATION_LABELS[key];
            const isSelected = sensation === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeSensation(isSelected ? null : key)}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  isSelected
                    ? `${item.color} border-current ring-2 ring-current/20 shadow-sm scale-[1.02]`
                    : 'bg-nature-50/60 border-nature-200/60 hover:bg-white text-stone-700'
                }`}
              >
                <div className="text-lg mb-1">{item.icon}</div>
                <div className="font-bold text-xs">{item.label}</div>
                <div className="text-[10px] opacity-75 line-clamp-1 leading-tight">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Muco Cervicale (Simbolo + Caratteristiche) */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-sage-100 text-sage-600">
            <Droplet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Muco Cervicale</h3>
            <p className="text-[11px] text-stone-400">Quantità e aspetto</p>
          </div>
        </div>

        {/* Muco Quantità Simbolo */}
        <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
          Simbolo Quantità
        </label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {(['+', '-', '/', '*'] as MucusQtySymbol[]).map((sym) => {
            if (!sym) return null;
            const info = MUCUS_SYMBOL_LABELS[sym];
            const isSelected = mucusQtySymbol === sym;

            return (
              <button
                key={sym}
                type="button"
                onClick={() => onChangeMucusQtySymbol(isSelected ? null : sym)}
                className={`py-2 px-2 rounded-xl text-center border font-bold text-sm transition-all ${
                  isSelected
                    ? 'bg-sage-600 text-white border-sage-600 shadow-sm scale-[1.03]'
                    : 'bg-nature-50/60 text-stone-700 border-nature-200/60 hover:bg-sage-50'
                }`}
                title={info.desc}
              >
                {sym}
              </button>
            );
          })}
        </div>

        {/* Caratteristiche del Muco (O T A F D E) */}
        <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
          Caratteristiche Visive / Tattili
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {MUCUS_CHAR_OPTIONS.map((opt) => {
            const isSelected = (mucusChar || '').toUpperCase().includes(opt.code);

            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleToggleMucusChar(opt.code)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400 shadow-xs font-semibold'
                    : 'bg-nature-50/50 border-nature-200/60 text-stone-600 hover:bg-nature-100/60'
                }`}
              >
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[10px] text-stone-400 line-clamp-1">{opt.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Quantità Dettaglio Opzionale */}
        <div className="flex items-center gap-2 pt-2 border-t border-nature-100">
          <span className="text-xs text-stone-500">Dettaglio Q.tà (es. x2):</span>
          <input
            type="text"
            maxLength={10}
            placeholder="es. x2 o poco"
            value={mucusQty || ''}
            onChange={(e) => onChangeMucusQty(e.target.value || null)}
            className="flex-1 px-3 py-1.5 rounded-xl border border-nature-200 bg-nature-50/40 text-xs text-stone-800 focus:outline-none focus:bg-white focus:border-nature-500"
          />
        </div>
      </div>

      {/* 4. Coito / Rapporti */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Rapporti di Coppia</h3>
            <p className="text-[11px] text-stone-400">Monitoraggio sintotermico</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(INTERCOURSE_LABELS) as IntercourseType[]).map((key) => {
            if (!key) return null;
            const item = INTERCOURSE_LABELS[key];
            const isSelected = intercourse === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeIntercourse(isSelected ? null : key)}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  isSelected
                    ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-200 shadow-sm scale-[1.02] font-semibold'
                    : 'bg-nature-50/60 border-nature-200/60 text-stone-700 hover:bg-rose-50/30'
                }`}
              >
                <div className="text-base mb-1">{item.icon}</div>
                <div className="font-bold text-xs">{item.label}</div>
                <div className="text-[10px] text-stone-400 line-clamp-1">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Cervice Uterina (Opzionale / Espandibile) */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
        <div
          onClick={() => setShowCervix(!showCervix)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Cervice Uterina (Opzionale)</h3>
              <p className="text-[11px] text-stone-400">Consistenza, apertura e posizione</p>
            </div>
          </div>
          <button type="button" className="text-stone-400 hover:text-stone-600">
            {showCervix ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showCervix && (
          <div className="mt-4 pt-4 border-t border-nature-100 space-y-3.5 fade-in">
            {/* Consistenza */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Consistenza
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['D', 'S'] as CervixConsistency[]).map((c) => {
                  if (!c) return null;
                  const isSel = cervixConsistency === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChangeCervixConsistency(isSel ? null : c)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                        isSel
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-nature-50/60 border-nature-200/60 text-stone-700'
                      }`}
                    >
                      {CERVIX_CONSISTENCY_LABELS[c].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Apertura */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Apertura
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['C', 'S', 'A'] as CervixOpening[]).map((o) => {
                  if (!o) return null;
                  const isSel = cervixOpening === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => onChangeCervixOpening(isSel ? null : o)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                        isSel
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-nature-50/60 border-nature-200/60 text-stone-700'
                      }`}
                    >
                      {CERVIX_OPENING_LABELS[o].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posizione */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Posizione
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['B', 'M', 'A'] as CervixPosition[]).map((p) => {
                  if (!p) return null;
                  const isSel = cervixPosition === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onChangeCervixPosition(isSel ? null : p)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                        isSel
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-nature-50/60 border-nature-200/60 text-stone-700'
                      }`}
                    >
                      {CERVIX_POSITION_LABELS[p].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Note del Giorno */}
      <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Note & Disturbi</h3>
            <p className="text-[11px] text-stone-400">Febbre, viaggi, orario inconsueto, farmaci</p>
          </div>
        </div>

        <textarea
          rows={3}
          value={notes || ''}
          onChange={(e) => onChangeNotes(e.target.value || null)}
          placeholder="Scrivi qui eventuali note sintotermiche..."
          className="w-full p-3.5 rounded-2xl border border-nature-200 bg-nature-50/30 text-xs text-stone-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 resize-none transition-all"
        />
      </div>

    </div>
  );
};
