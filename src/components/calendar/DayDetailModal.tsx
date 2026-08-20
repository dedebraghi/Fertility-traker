import React, { useState, useEffect } from 'react';
import { DailyEntry, CalendarDayData, BbtMethod } from '../../types';
import { TemperaturePicker } from '../today/TemperaturePicker';
import { VisualChipsPicker } from '../today/VisualChipsPicker';
import {
  formatDateItalian,
  SENSATION_LABELS,
  INTERCOURSE_LABELS,
  CERVIX_CONSISTENCY_LABELS,
  CERVIX_OPENING_LABELS,
  CERVIX_POSITION_LABELS,
} from '../../utils/symptothermal';
import {
  X,
  Calendar as CalendarIcon,
  Sparkles,
  Thermometer,
  Droplet,
  Heart,
  FileText,
  Edit3,
  Check,
  Info,
  Clock,
} from 'lucide-react';

interface DayDetailModalProps {
  isOpen: boolean;
  dayData: CalendarDayData | null;
  bbtMethod?: BbtMethod;
  onClose: () => void;
  onSaveEntry: (entryDate: string, data: Partial<DailyEntry>) => Promise<void>;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  dayData,
  bbtMethod = 'Vaginale',
  onClose,
  onSaveEntry,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form State
  const [bbt, setBbt] = useState<number | null>(null);
  const [bbtTime, setBbtTime] = useState<string | null>(null);
  const [menstruation, setMenstruation] = useState<DailyEntry['menstruation']>(null);
  const [sensation, setSensation] = useState<DailyEntry['sensation']>(null);
  const [mucusQtySymbol, setMucusQtySymbol] = useState<DailyEntry['mucus_qty_symbol']>(null);
  const [mucusQty, setMucusQty] = useState<string | null>(null);
  const [mucusChar, setMucusChar] = useState<string | null>(null);
  const [cervixConsistency, setCervixConsistency] = useState<DailyEntry['cervix_consistency']>(null);
  const [cervixOpening, setCervixOpening] = useState<DailyEntry['cervix_opening']>(null);
  const [cervixPosition, setCervixPosition] = useState<DailyEntry['cervix_position']>(null);
  const [intercourse, setIntercourse] = useState<DailyEntry['intercourse']>(null);
  const [notes, setNotes] = useState<string | null>(null);

  // Sync state when dayData changes
  useEffect(() => {
    if (dayData?.entry) {
      const e = dayData.entry;
      setBbt(e.bbt !== null && e.bbt !== undefined ? Number(e.bbt) : null);
      setBbtTime(e.bbt_time || null);
      setMenstruation(e.menstruation || null);
      setSensation(e.sensation || null);
      setMucusQtySymbol(e.mucus_qty_symbol || null);
      setMucusQty(e.mucus_qty || null);
      setMucusChar(e.mucus_char || null);
      setCervixConsistency(e.cervix_consistency || null);
      setCervixOpening(e.cervix_opening || null);
      setCervixPosition(e.cervix_position || null);
      setIntercourse(e.intercourse || null);
      setNotes(e.notes || null);
      setIsEditing(false);
    } else {
      setBbt(null);
      setBbtTime(null);
      setMenstruation(null);
      setSensation(null);
      setMucusQtySymbol(null);
      setMucusQty(null);
      setMucusChar(null);
      setCervixConsistency(null);
      setCervixOpening(null);
      setCervixPosition(null);
      setIntercourse(null);
      setNotes(null);
      setIsEditing(false);
    }
  }, [dayData]);

  if (!isOpen || !dayData) return null;

  const entry = dayData.entry;
  const hasData = Boolean(
    entry &&
      (entry.bbt !== null ||
        entry.menstruation ||
        entry.sensation ||
        entry.mucus_char ||
        entry.cervix_opening ||
        entry.intercourse ||
        entry.notes)
  );

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveEntry(dayData.date, {
        cycle_day: dayData.cycleDay || 1,
        entry_date: dayData.date,
        bbt,
        bbt_time: bbtTime,
        menstruation,
        sensation,
        mucus_qty_symbol: mucusQtySymbol,
        mucus_qty: mucusQty,
        mucus_char: mucusChar,
        cervix_consistency: cervixConsistency,
        cervix_opening: cervixOpening,
        cervix_position: cervixPosition,
        intercourse,
        notes,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setIsEditing(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio dei dati');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-nature-50 w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col border border-nature-200 animate-slide-up">
        
        {/* Header */}
        <div className="p-5 border-b border-nature-200/80 flex items-center justify-between bg-white rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-nature-600" />
              <h2 className="text-xl font-serif font-bold text-stone-800 capitalize">
                {formatDateItalian(dayData.date)}
              </h2>
              {dayData.isToday && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-nature-100 text-nature-700">
                  Oggi
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {dayData.cycleDay
                ? `Giorno ${dayData.cycleDay}${dayData.cycleNumber ? ` • Ciclo N° ${dayData.cycleNumber}` : ''}`
                : 'Data fuori ciclo attivo'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Prediction Banners */}
          {dayData.isPredictedPeriod && (
            <div className="bg-blush-50 border border-blush-200 text-blush-800 rounded-2xl p-4 flex items-start gap-3">
              <Droplet className="w-5 h-5 text-blush-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Mestruazioni Previste</h4>
                <p className="text-xs text-blush-700 mt-0.5">
                  In base alla durata media dei tuoi cicli storici, in questo giorno è stimato l'arrivo del ciclo mestruale.
                </p>
              </div>
            </div>
          )}

          {dayData.isPredictedOvulation && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Ovulazione Presunta</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Giorno di massima probabilità ovulatoria calcolato in base alla durata standard della tua fase luteale.
                </p>
              </div>
            </div>
          )}

          {dayData.isPredictedFertileWindow && !dayData.isPredictedOvulation && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Finestra Fertile Stimata</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Intervallo teorico favorevole al concepimento (5 giorni pre-ovulazione e giorno ovulatorio).
                </p>
              </div>
            </div>
          )}

          {/* Mode Switcher / Action buttons */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              {isEditing ? 'Compilazione Misurazioni' : 'Riepilogo Giornaliero'}
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-nature-700 bg-white border border-nature-300 hover:bg-nature-100/50 px-3 py-1.5 rounded-xl transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditing ? 'Visualizza Scheda' : hasData ? 'Modifica Dati' : 'Inserisci Dati'}
            </button>
          </div>

          {!isEditing ? (
            /* Summary View */
            <div className="space-y-3">
              {hasData ? (
                <div className="bg-white rounded-3xl p-5 border border-nature-200/80 shadow-sm space-y-4">
                  
                  {/* BBT Section */}
                  {entry?.bbt !== null && entry?.bbt !== undefined ? (
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700">
                          <Thermometer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs text-stone-500 font-medium">Temperatura Basale</div>
                          <div className="text-lg font-bold text-stone-800">
                            {Number(entry.bbt).toFixed(2)} °C
                          </div>
                        </div>
                      </div>
                      {entry?.bbt_time && (
                        <div className="flex items-center gap-1 text-xs text-stone-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{entry.bbt_time}</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Menstruation Section */}
                  {entry?.menstruation && (
                    <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                      <div className="p-2.5 rounded-2xl bg-blush-50 text-blush-600">
                        <Droplet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 font-medium">Flusso Mestruale</div>
                        <div className="text-sm font-bold text-stone-800">
                          {entry.menstruation}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mucus / Sensation */}
                  {(entry?.sensation || entry?.mucus_char || entry?.mucus_qty_symbol) && (
                    <div className="flex items-start gap-3 pb-3 border-b border-stone-100">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 mt-0.5">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-stone-500 font-medium">Muco Cervicale & Sensazione</div>
                        <div className="text-sm font-semibold text-stone-800 mt-0.5">
                          {entry.sensation ? SENSATION_LABELS[entry.sensation]?.label || entry.sensation : 'N/D'}
                          {entry.mucus_qty_symbol && ` • Q.tà: ${entry.mucus_qty_symbol}`}
                        </div>
                        {entry.mucus_char && (
                          <div className="text-xs text-stone-600 mt-1 bg-stone-50 p-2 rounded-xl border border-stone-100">
                            Caratteristiche: <span className="font-medium">{entry.mucus_char}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cervix */}
                  {(entry?.cervix_consistency || entry?.cervix_opening || entry?.cervix_position) && (
                    <div className="flex items-start gap-3 pb-3 border-b border-stone-100">
                      <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 mt-0.5">
                        <Info className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 font-medium">Collo dell'Utero (Cervice)</div>
                        <div className="text-xs text-stone-700 space-y-0.5 mt-1 font-medium">
                          {entry.cervix_consistency && (
                            <div>Consistenza: {CERVIX_CONSISTENCY_LABELS[entry.cervix_consistency]?.label || entry.cervix_consistency}</div>
                          )}
                          {entry.cervix_opening && (
                            <div>Apertura: {CERVIX_OPENING_LABELS[entry.cervix_opening]?.label || entry.cervix_opening}</div>
                          )}
                          {entry.cervix_position && (
                            <div>Posizione: {CERVIX_POSITION_LABELS[entry.cervix_position]?.label || entry.cervix_position}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Intercourse */}
                  {entry?.intercourse && (
                    <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                      <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 font-medium">Rapporto di Coppia</div>
                        <div className="text-sm font-bold text-stone-800">
                          {INTERCOURSE_LABELS[entry.intercourse]?.label || entry.intercourse}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {entry?.notes && (
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-2xl bg-stone-100 text-stone-600 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-stone-500 font-medium">Note / Eventuali Disturbi</div>
                        <div className="text-xs text-stone-700 mt-1 bg-stone-50 p-2.5 rounded-xl border border-stone-100 whitespace-pre-wrap">
                          {entry.notes}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 border border-nature-200/80 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-stone-700 text-base">
                    Nessun dato registrato
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Non sono state registrate misurazioni di temperatura o sintomi per questa data.
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 bg-nature-600 hover:bg-nature-700 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-md transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                    Inserisci Dati Ora
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Edit View */
            <div className="space-y-4">
              <TemperaturePicker
                bbt={bbt}
                bbtTime={bbtTime}
                bbtMethod={bbtMethod}
                onChangeBbt={setBbt}
                onChangeTime={setBbtTime}
              />

              <VisualChipsPicker
                menstruation={menstruation}
                sensation={sensation}
                mucusQtySymbol={mucusQtySymbol}
                mucusQty={mucusQty}
                mucusChar={mucusChar}
                cervixConsistency={cervixConsistency}
                cervixOpening={cervixOpening}
                cervixPosition={cervixPosition}
                intercourse={intercourse}
                notes={notes}
                onChangeMenstruation={setMenstruation}
                onChangeSensation={setSensation}
                onChangeMucusQtySymbol={setMucusQtySymbol}
                onChangeMucusQty={setMucusQty}
                onChangeMucusChar={setMucusChar}
                onChangeCervixConsistency={setCervixConsistency}
                onChangeCervixOpening={setCervixOpening}
                onChangeCervixPosition={setCervixPosition}
                onChangeIntercourse={setIntercourse}
                onChangeNotes={setNotes}
              />

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                    savedSuccess
                      ? 'bg-emerald-600'
                      : saving
                      ? 'bg-nature-400 cursor-not-allowed'
                      : 'bg-nature-600 hover:bg-nature-700'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      Salvato!
                    </>
                  ) : saving ? (
                    'Salvataggio...'
                  ) : (
                    'Salva Modifiche'
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
