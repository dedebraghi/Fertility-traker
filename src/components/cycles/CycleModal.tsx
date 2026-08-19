import React, { useState, useEffect } from 'react';
import { Cycle, BbtMethod } from '../../types';
import { X, Calendar } from 'lucide-react';

interface CycleModalProps {
  isOpen: boolean;
  cycleToEdit: Cycle | null;
  onClose: () => void;
  onSave: (data: Omit<Cycle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  nextCycleNumber: number;
}

export const CycleModal: React.FC<CycleModalProps> = ({
  isOpen,
  cycleToEdit,
  onClose,
  onSave,
  nextCycleNumber,
}) => {
  const [name, setName] = useState('');
  const [cycleNumber, setCycleNumber] = useState(nextCycleNumber);
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthStr, setMonthStr] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [bbtMethod, setBbtMethod] = useState<BbtMethod>('Vaginale');
  const [shortestCycle, setShortestCycle] = useState<string>('');
  const [teacherCode, setTeacherCode] = useState('');
  const [protocolNumber, setProtocolNumber] = useState('');
  const [sigla, setSigla] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cycleToEdit) {
      setName(cycleToEdit.name || '');
      setCycleNumber(cycleToEdit.cycle_number || 1);
      setYear(cycleToEdit.year || new Date().getFullYear());
      setMonthStr(cycleToEdit.month_str || '');
      setStartDate(cycleToEdit.start_date || new Date().toISOString().split('T')[0]);
      setBbtMethod(cycleToEdit.bbt_method || 'Vaginale');
      setShortestCycle(cycleToEdit.shortest_cycle ? String(cycleToEdit.shortest_cycle) : '');
      setTeacherCode(cycleToEdit.teacher_code || '');
      setProtocolNumber(cycleToEdit.protocol_number || '');
      setSigla(cycleToEdit.sigla || '');
    } else {
      setName('');
      setCycleNumber(nextCycleNumber);
      setYear(new Date().getFullYear());
      setMonthStr('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setBbtMethod('Vaginale');
      setShortestCycle('');
      setTeacherCode('');
      setProtocolNumber('');
      setSigla('');
    }
  }, [cycleToEdit, nextCycleNumber, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      alert('Inserisci la data di inizio del ciclo');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        cycle_number: Number(cycleNumber),
        year: Number(year),
        month_str: monthStr.trim(),
        start_date: startDate,
        bbt_method: bbtMethod,
        shortest_cycle: shortestCycle.trim() ? parseInt(shortestCycle, 10) : null,
        teacher_code: teacherCode.trim(),
        protocol_number: protocolNumber.trim(),
        sigla: sigla.trim(),
        is_active: true,
      });
      onClose();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-nature-100 max-h-[90vh] overflow-y-auto slide-up">
        
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-nature-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-nature-100 text-nature-700 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {cycleToEdit ? 'Modifica Ciclo' : 'Nuovo Ciclo Sintotermico'}
            </h2>
            <p className="text-xs text-stone-500">Parametri del ciclo e metodo CAMEN</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nome / Persona *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Maria"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Numero Ciclo *</label>
              <input
                type="number"
                min={1}
                required
                value={cycleNumber}
                onChange={(e) => setCycleNumber(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Data Inizio (1° Giorno) *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Anno *</label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mesi (es. FEB/MAR)</label>
              <input
                type="text"
                value={monthStr}
                onChange={(e) => setMonthStr(e.target.value)}
                placeholder="es. AGO/SET"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Metodo Temp. BBT</label>
              <select
                value={bbtMethod}
                onChange={(e) => setBbtMethod(e.target.value as BbtMethod)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
              >
                <option value="Vaginale">Vaginale</option>
                <option value="Orale">Orale</option>
                <option value="Rettale">Rettale</option>
                <option value="Non specificato">Non specificato</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ciclo più breve ultimi 12 mesi (giorni, opz.)
            </label>
            <input
              type="number"
              min={1}
              value={shortestCycle}
              onChange={(e) => setShortestCycle(e.target.value)}
              placeholder="es. 28"
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
            />
          </div>

          {/* CAMEN optional metadata */}
          <div className="pt-2 border-t border-stone-100">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              Dati CAMEN & Insegnante (Opzionali)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-stone-500 mb-0.5">Cod. Insegnante</label>
                <input
                  type="text"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500 mb-0.5">Protocollo</label>
                <input
                  type="text"
                  value={protocolNumber}
                  onChange={(e) => setProtocolNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500 mb-0.5">N° Sigla</label>
                <input
                  type="text"
                  value={sigla}
                  onChange={(e) => setSigla(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs shadow-soft disabled:opacity-50"
            >
              {loading ? 'Salvataggio...' : cycleToEdit ? 'Salva Modifiche' : 'Crea Ciclo'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
