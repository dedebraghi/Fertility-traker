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

import { DailyEntry, SymptothermalEvaluation } from '../types';

/**
 * Computes a simple hash / fingerprint of daily entries to detect when data has changed.
 */
export function computeDataFingerprint(entries: Record<number, DailyEntry>): string {
  const sortedDays = Object.keys(entries).map(Number).sort((a, b) => a - b);
  const representation = sortedDays.map((d) => {
    const e = entries[d];
    if (!e) return '';
    return `${d}:${e.bbt ?? ''}:${e.bbt_time ?? ''}:${e.menstruation ?? ''}:${e.sensation ?? ''}:${e.mucus_qty_symbol ?? ''}:${e.mucus_char ?? ''}:${e.cervix_consistency ?? ''}:${e.cervix_opening ?? ''}:${e.cervix_position ?? ''}:${e.notes ?? ''}`;
  }).join('|');

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < representation.length; i++) {
    const chr = representation.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return `${hash}_${sortedDays.length}`;
}

/**
 * Checks if a daily entry has fertile mucus characteristics (CAMEN / Roetzer).
 */
export function isFertileMucusEntry(entry?: DailyEntry | null): boolean {
  if (!entry) return false;
  if (entry.sensation === 'L' || entry.sensation === 'B') return true;
  if (entry.mucus_qty_symbol === '*') return true;
  if (entry.mucus_char && /filante|trasparente|chiara|uovo|elastico/i.test(entry.mucus_char)) return true;
  return false;
}

/**
 * Evaluates CAMEN / Roetzer symptothermal status deterministically:
 * - 6 low temperature days
 * - Coverline (highest of the 6 low days)
 * - 3 consecutive high temperatures (+0.20°C on 3rd or 4th day exception)
 * - Mucus peak day + 3 post-peak days
 * - Closure of fertile window
 */
export function evaluateSymptothermalStatus(entries: Record<number, DailyEntry>): SymptothermalEvaluation {
  const result: SymptothermalEvaluation = {
    hasOvulationDetected: false,
    coverline: null,
    lowTempsDays: [],
    highTempsDays: [],
    thirdHighDay: null,
    mucusPeakDay: null,
    mucusPostPeakDays: [],
    cervixPeakDay: null,
    fertileWindowClosedDay: null,
    follicularPhaseLength: null,
    lutealPhaseLength: null,
    notesSummary: [],
  };

  const days = Object.keys(entries).map(Number).sort((a, b) => a - b);
  if (days.length === 0) return result;

  const maxDay = Math.max(...days);

  // 1. Find Mucus Peak (ultimo giorno con caratteristiche fertili seguito da viraggio)
  let bestMucusPeak: number | null = null;
  for (let d = 1; d <= maxDay; d++) {
    const entry = entries[d];
    if (isFertileMucusEntry(entry)) {
      // Check if subsequent days are dry/infertile
      const next1 = entries[d + 1];
      const next2 = entries[d + 2];
      const next3 = entries[d + 3];

      const isFollowedByDrying =
        (!next1 || !isFertileMucusEntry(next1)) &&
        (!next2 || !isFertileMucusEntry(next2)) &&
        (!next3 || !isFertileMucusEntry(next3));

      if (isFollowedByDrying || d === maxDay) {
        bestMucusPeak = d;
      }
    }
  }

  if (bestMucusPeak !== null) {
    result.mucusPeakDay = bestMucusPeak;
    result.mucusPostPeakDays = [bestMucusPeak + 1, bestMucusPeak + 2, bestMucusPeak + 3].filter((d) => d <= maxDay);
  }

  // 2. Find Cervix Peak (Soft, Open, High)
  let bestCervixPeak: number | null = null;
  for (let d = 1; d <= maxDay; d++) {
    const entry = entries[d];
    if (entry && (entry.cervix_consistency === 'S' || entry.cervix_opening === 'A' || entry.cervix_position === 'A')) {
      bestCervixPeak = d;
    }
  }
  result.cervixPeakDay = bestCervixPeak;

  // 3. Find Thermal Shift (Regola 3 su 6 di Roetzer/CAMEN)
  // We look for a 1st high temp day 'h1' where previous 6 valid temps are lower
  const validTempDays = days.filter((d) => entries[d]?.bbt !== null && typeof entries[d]?.bbt === 'number');

  for (let i = 6; i < validTempDays.length; i++) {
    const h1Day = validTempDays[i];
    const prev6Days = validTempDays.slice(i - 6, i);
    const prev6Temps = prev6Days.map((d) => entries[d].bbt as number);
    const coverlineVal = Math.round(Math.max(...prev6Temps) * 100) / 100;

    const t1 = entries[h1Day]?.bbt as number;
    if (t1 <= coverlineVal) continue;

    // Check next consecutive high days
    const h2Day = validTempDays[i + 1];
    const h3Day = validTempDays[i + 2];
    const h4Day = validTempDays[i + 3];

    if (h2Day && h3Day) {
      const t2 = entries[h2Day]?.bbt as number;
      const t3 = entries[h3Day]?.bbt as number;

      // Standard Roetzer Rule: t1 > coverline, t2 > coverline, t3 >= coverline + 0.20
      const isStandardConfirmed = t1 > coverlineVal && t2 > coverlineVal && t3 >= Math.round((coverlineVal + 0.20) * 100) / 100;

      // Exception 1: t1, t2, t3 > coverline, but t3 < coverline + 0.20 -> 4th day t4 > coverline confirms
      const isException1Confirmed = t1 > coverlineVal && t2 > coverlineVal && t3 > coverlineVal && h4Day && (entries[h4Day]?.bbt as number) > coverlineVal;

      // Exception 2: one of t1,t2,t3 falls on or below coverline, but 4th day t4 >= coverline + 0.20
      const isException2Confirmed = h4Day && (entries[h4Day]?.bbt as number) >= Math.round((coverlineVal + 0.20) * 100) / 100;

      if (isStandardConfirmed || isException1Confirmed || isException2Confirmed) {
        result.hasOvulationDetected = true;
        result.coverline = coverlineVal;
        result.lowTempsDays = prev6Days;
        result.highTempsDays = isException1Confirmed || isException2Confirmed ? [h1Day, h2Day, h3Day, h4Day!] : [h1Day, h2Day, h3Day];
        result.thirdHighDay = isException1Confirmed || isException2Confirmed ? h4Day! : h3Day;

        // Double check: Fertile window closes the evening of 3rd high temp (or 4th if exception)
        // OR 3rd full day after mucus peak (which is evening of Peak+3 = start of post-fertile)
        const thermalEndDay = result.thirdHighDay;
        const mucusEndDay = result.mucusPeakDay !== null ? result.mucusPeakDay + 3 : null;

        if (mucusEndDay !== null) {
          result.fertileWindowClosedDay = Math.max(thermalEndDay, mucusEndDay);
        } else {
          result.fertileWindowClosedDay = thermalEndDay;
        }

        result.follicularPhaseLength = h1Day - 1;
        if (maxDay >= thermalEndDay) {
          result.lutealPhaseLength = maxDay - (h1Day - 1);
        }
        break;
      }
    }
  }

  // 4. Summarize notes & potential disturbances
  const disturbanceNotes: string[] = [];
  days.forEach((d) => {
    const e = entries[d];
    if (e?.notes && e.notes.trim().length > 0) {
      disturbanceNotes.push(`Giorno ${d}: ${e.notes.trim()}`);
    }
  });
  result.notesSummary = disturbanceNotes;

  return result;
}

const MONTH_NAMES_IT = [
  'GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU',
  'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'
];

/**
 * Generates month string representation (e.g. "AGO/SET") based on cycle start date.
 */
export function generateMonthStr(startDateStr: string): string {
  if (!startDateStr) return '';
  try {
    const [y, m] = startDateStr.split('-').map(Number);
    const mIdx = m - 1;
    const nextMIdx = (mIdx + 1) % 12;
    return `${MONTH_NAMES_IT[mIdx]}/${MONTH_NAMES_IT[nextMIdx]}`;
  } catch {
    return '';
  }
}

/**
 * Calculates the shortest cycle (in days) from completed cycles in the last 12 months.
 */
export function calculateShortestCycleFromHistory(cycles: { start_date: string; is_active: boolean; shortest_cycle?: number | null }[], currentStartDateStr?: string): number | null {
  if (!cycles || cycles.length === 0) return null;

  const now = currentStartDateStr ? new Date(currentStartDateStr) : new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  // Filter cycles from the last 12 months that are closed / have a duration
  const sortedCycles = [...cycles]
    .filter(c => Boolean(c.start_date))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const lengths: number[] = [];

  for (let i = 0; i < sortedCycles.length; i++) {
    const curr = sortedCycles[i];
    const currDate = new Date(curr.start_date);
    if (currDate < oneYearAgo && i < sortedCycles.length - 1) continue;

    // If next cycle exists, duration is difference in days
    if (i < sortedCycles.length - 1) {
      const nextDate = new Date(sortedCycles[i + 1].start_date);
      const diffDays = Math.round((nextDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 18 && diffDays <= 60) {
        lengths.push(diffDays);
      }
    } else if (curr.shortest_cycle && curr.shortest_cycle > 0) {
      lengths.push(curr.shortest_cycle);
    }
  }

  if (lengths.length === 0) return null;
  return Math.min(...lengths);
}

/**
 * Checks if there was a significant gap between the last cycle and a new cycle,
 * and calculates approximate months and estimated cycles.
 */
export function estimateInterruptedCycles(
  lastCycleStartDateStr: string,
  newStartDateStr: string,
  avgCycleLength = 28
): { daysPassed: number; monthsPassed: number; estimatedCyclesPassed: number; isSignificantGap: boolean } {
  if (!lastCycleStartDateStr || !newStartDateStr) {
    return { daysPassed: 0, monthsPassed: 0, estimatedCyclesPassed: 1, isSignificantGap: false };
  }

  try {
    const start = new Date(lastCycleStartDateStr);
    const target = new Date(newStartDateStr);
    const diffTime = target.getTime() - start.getTime();
    const daysPassed = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const monthsPassed = Math.max(0, Math.round(daysPassed / 30.4));
    const estimatedCyclesPassed = Math.max(1, Math.round(daysPassed / avgCycleLength));
    const isSignificantGap = daysPassed > 45; // More than 45 days is a gap

    return {
      daysPassed,
      monthsPassed,
      estimatedCyclesPassed,
      isSignificantGap,
    };
  } catch {
    return { daysPassed: 0, monthsPassed: 0, estimatedCyclesPassed: 1, isSignificantGap: false };
  }
}

/**
 * Checks if a given date with menstruation is the FIRST day of the period flow
 * (i.e. not immediately preceded by menstruation on the previous day).
 */
export function isFirstDayOfPeriod(
  entryDateStr: string,
  menstruation: DailyEntry['menstruation'] | null | undefined,
  entriesByDate: Record<string, DailyEntry>
): boolean {
  if (!menstruation || !['Flusso', 'Abbondante', 'Spotting', 'M', 'M+', 'm'].includes(menstruation)) {
    return false;
  }
  if (!entryDateStr) return false;

  const [y, m, d] = entryDateStr.split('-').map(Number);
  const prevDate = new Date(y, m - 1, d);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevDay = String(prevDate.getDate()).padStart(2, '0');
  const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`;

  const prevEntry = entriesByDate[prevDateStr];
  const prevHadMenstruation = Boolean(
    prevEntry?.menstruation &&
    ['Flusso', 'Abbondante', 'Spotting', 'M', 'M+', 'm'].includes(prevEntry.menstruation)
  );

  return !prevHadMenstruation;
}

/**
 * Calculates the appropriate next cycle number by factoring in estimated skipped cycles across a gap.
 */
export function calculateNextCycleNumberWithGap(
  lastCycle: { cycle_number: number; start_date: string } | null,
  newStartDateStr: string,
  avgCycleLength = 28
): number {
  if (!lastCycle) return 1;
  if (!newStartDateStr || !lastCycle.start_date) return lastCycle.cycle_number + 1;

  try {
    const start = new Date(lastCycle.start_date);
    const target = new Date(newStartDateStr);
    const diffTime = target.getTime() - start.getTime();
    const daysPassed = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysPassed <= 0) return lastCycle.cycle_number;
    if (daysPassed <= 45) return lastCycle.cycle_number + 1;

    const estimatedCyclesPassed = Math.max(1, Math.round(daysPassed / (avgCycleLength || 28)));
    return lastCycle.cycle_number + estimatedCyclesPassed;
  } catch {
    return lastCycle.cycle_number + 1;
  }
}

/**
 * Estimates the plausible start date of the current cycle when user logs data late without recording menstruation.
 */
export function estimateCycleStartDateForLateEntry(
  lastCycleStartDateStr: string,
  entryDateStr: string,
  avgCycleLength = 28
): string {
  if (!lastCycleStartDateStr || !entryDateStr) return entryDateStr;

  try {
    const start = new Date(lastCycleStartDateStr);
    const target = new Date(entryDateStr);
    const diffTime = target.getTime() - start.getTime();
    const daysPassed = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysPassed <= (avgCycleLength || 28)) {
      return lastCycleStartDateStr;
    }

    // Step forward by avgCycleLength until the last cycle start on or before target
    const cycleDuration = avgCycleLength || 28;
    const cyclesCount = Math.floor(daysPassed / cycleDuration);
    const estimatedStartDate = new Date(start);
    estimatedStartDate.setDate(estimatedStartDate.getDate() + (cyclesCount * cycleDuration));

    const y = estimatedStartDate.getFullYear();
    const m = String(estimatedStartDate.getMonth() + 1).padStart(2, '0');
    const d = String(estimatedStartDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return entryDateStr;
  }
}



