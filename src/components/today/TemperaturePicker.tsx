import React from 'react';
import { Thermometer, Clock, Plus, Minus } from 'lucide-react';

interface TemperaturePickerProps {
  bbt: number | null;
  time: string | null;
  onChangeBbt: (val: number | null) => void;
  onChangeTime: (val: string | null) => void;
}

export const TemperaturePicker: React.FC<TemperaturePickerProps> = ({
  bbt,
  time,
  onChangeBbt,
  onChangeTime,
}) => {
  const currentTemp = bbt ?? 36.50;

  const handleStep = (delta: number) => {
    const next = Math.round((currentTemp + delta) * 100) / 100;
    if (next >= 35.0 && next <= 40.0) {
      onChangeBbt(next);
    }
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.').trim();
    if (raw === '') {
      onChangeBbt(null);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChangeBbt(parsed);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-nature-200/70 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-nature-100 text-nature-600">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Temperatura Basale (BBT)</h3>
            <p className="text-[11px] text-stone-400">Misurazione al risveglio</p>
          </div>
        </div>

        {/* Time input */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nature-50/80 border border-nature-100 text-xs text-stone-600">
          <Clock className="w-3.5 h-3.5 text-nature-500" />
          <input
            type="time"
            value={time || ''}
            onChange={(e) => onChangeTime(e.target.value || null)}
            className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Big Temperature Display & Stepper */}
      <div className="flex items-center justify-between gap-3 bg-nature-50/50 rounded-2xl p-3 border border-nature-100">
        
        {/* Decrease Steppers */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleStep(-0.10)}
            className="w-9 h-9 rounded-xl bg-white border border-nature-200/80 text-stone-600 hover:bg-nature-100 font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title="Diminuisci 0.10 °C"
          >
            -0.1
          </button>
          <button
            type="button"
            onClick={() => handleStep(-0.05)}
            className="w-10 h-10 rounded-xl bg-white border border-nature-200/80 text-nature-700 hover:bg-nature-100 font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title="Diminuisci 0.05 °C"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Main Display & Input */}
        <div className="flex-1 text-center">
          <div className="inline-flex items-baseline gap-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder="36.50"
              value={bbt !== null ? bbt.toFixed(2) : ''}
              onChange={handleManualInput}
              className="w-24 text-center font-extrabold text-2xl text-stone-900 bg-transparent focus:outline-none focus:bg-white rounded-lg border-b-2 border-transparent focus:border-nature-500 transition-all font-mono tracking-tight"
            />
            <span className="text-sm font-semibold text-stone-400">°C</span>
          </div>
          {bbt === null && (
            <p className="text-[10px] text-stone-400 mt-0.5">Nessun valore registrato</p>
          )}
        </div>

        {/* Increase Steppers */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleStep(0.05)}
            className="w-10 h-10 rounded-xl bg-white border border-nature-200/80 text-nature-700 hover:bg-nature-100 font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title="Aumenta 0.05 °C"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleStep(0.10)}
            className="w-9 h-9 rounded-xl bg-white border border-nature-200/80 text-stone-600 hover:bg-nature-100 font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title="Aumenta 0.10 °C"
          >
            +0.1
          </button>
        </div>

      </div>

      {bbt !== null && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => onChangeBbt(null)}
            className="text-[11px] text-rose-500 hover:underline font-medium"
          >
            Rimuovi temperatura
          </button>
        </div>
      )}
    </div>
  );
};
