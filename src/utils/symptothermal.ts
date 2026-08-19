export function calculateDateForDay(startDateStr: string, cycleDay: number): string | null {
  if (!startDateStr || cycleDay < 1) return null;
  try {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (cycleDay - 1));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

export function calculateDayFromDate(startDateStr: string, targetDateStr: string): number | null {
  if (!startDateStr || !targetDateStr) return null;
  try {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ty, tm, td] = targetDateStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const target = new Date(ty, tm - 1, td);
    const diffDays = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  } catch {
    return null;
  }
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '--/--';
  try {
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  } catch {
    return dateStr;
  }
}

export function formatDateItalian(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return dateStr;
  }
}

export const SENSATION_LABELS: Record<string, { label: string; desc: string; color: string; icon: string }> = {
  A: { label: 'Asciutto', desc: 'Nessuna sensazione di bagnato', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: '🌵' },
  U: { label: 'Umido', desc: 'Lieve umidità percepita', color: 'bg-sky-50 text-sky-800 border-sky-200', icon: '💧' },
  B: { label: 'Bagnato', desc: 'Sensazione evidente di bagnato', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: '🌊' },
  L: { label: 'Lubrificato', desc: 'Sensazione molto scivolosa / fertile', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold', icon: '✨' },
};

export const MUCUS_SYMBOL_LABELS: Record<string, { label: string; desc: string }> = {
  '+': { label: '+', desc: 'Presente in quantità' },
  '-': { label: '-', desc: 'Scarsa quantità' },
  '/': { label: '/', desc: 'Inizio / transizione' },
  '*': { label: '*', desc: 'Caratteristiche fertili spiccate' },
};

export const INTERCOURSE_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  X: { label: 'Completo (X)', desc: 'Rapporto completo', icon: '❤️' },
  I: { label: 'Interrotto (I)', desc: 'Coito interrotto', icon: '⚡' },
  O: { label: 'Senza Eiac. (O)', desc: 'Nessuna eiaculazione', icon: '⚪' },
  P: { label: 'Protetto (P)', desc: 'Con profilattico/barriera', icon: '🛡️' },
};

export const CERVIX_CONSISTENCY_LABELS: Record<string, { label: string; desc: string }> = {
  D: { label: 'Dura (D)', desc: 'Consistenza simile alla punta del naso' },
  S: { label: 'Soffice (S)', desc: 'Consistenza morbida come il labbro' },
};

export const CERVIX_OPENING_LABELS: Record<string, { label: string; desc: string }> = {
  C: { label: 'Chiusa (C)', desc: 'Orifizio chiuso' },
  S: { label: 'Socchiusa (S)', desc: 'Inizio apertura' },
  A: { label: 'Aperta (A)', desc: 'Orifizio aperto' },
};

export const CERVIX_POSITION_LABELS: Record<string, { label: string; desc: string }> = {
  B: { label: 'Bassa (B)', desc: 'Facilmente raggiungibile' },
  M: { label: 'Media (M)', desc: 'Posizione intermedia' },
  A: { label: 'Alta (A)', desc: 'Profonda / difficile da raggiungere' },
};
