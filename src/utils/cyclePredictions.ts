import { Cycle, DailyEntry, CalendarDayData, CycleStatistics } from '../types';
import { evaluateSymptothermalStatus, calculateDayFromDate } from './symptothermal';

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a YYYY-MM-DD string
 */
export function addDaysIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDateIso(date);
}

/**
 * Computes overall cycle statistics from user history
 */
export function computeCycleStatistics(
  cycles: Cycle[],
  allEntries: DailyEntry[] = []
): CycleStatistics {
  // Sort cycles by start date ascending
  const validCycles = [...cycles]
    .filter((c) => Boolean(c.start_date))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const cycleLengths: number[] = [];

  for (let i = 0; i < validCycles.length; i++) {
    const curr = validCycles[i];
    if (i < validCycles.length - 1) {
      const next = validCycles[i + 1];
      const days = calculateDayFromDate(curr.start_date, next.start_date);
      if (days !== null && days >= 18 && days <= 65) {
        cycleLengths.push(days - 1);
      }
    } else if (curr.shortest_cycle && curr.shortest_cycle >= 18 && curr.shortest_cycle <= 65) {
      cycleLengths.push(curr.shortest_cycle);
    }
  }

  // Calculate average period length from entries
  const periodLengths: number[] = [];
  const entriesByCycle: Record<string, DailyEntry[]> = {};
  for (const entry of allEntries) {
    if (entry.cycle_id) {
      if (!entriesByCycle[entry.cycle_id]) entriesByCycle[entry.cycle_id] = [];
      entriesByCycle[entry.cycle_id].push(entry);
    }
  }

  for (const cycleId of Object.keys(entriesByCycle)) {
    const entries = entriesByCycle[cycleId].sort((a, b) => a.cycle_day - b.cycle_day);
    let count = 0;
    for (const e of entries) {
      if (e.cycle_day <= 10 && (e.menstruation === 'Flusso' || e.menstruation === 'Abbondante' || e.menstruation === 'M')) {
        count++;
      }
    }
    if (count >= 2 && count <= 9) {
      periodLengths.push(count);
    }
  }

  // Calculate average luteal phase
  const lutealPhases: number[] = [];
  for (const cycleId of Object.keys(entriesByCycle)) {
    const entriesMap: Record<number, DailyEntry> = {};
    for (const e of entriesByCycle[cycleId]) {
      entriesMap[e.cycle_day] = e;
    }
    const evalResult = evaluateSymptothermalStatus(entriesMap);
    if (evalResult.lutealPhaseLength && evalResult.lutealPhaseLength >= 8 && evalResult.lutealPhaseLength <= 18) {
      lutealPhases.push(evalResult.lutealPhaseLength);
    }
  }

  const avgCycleLength =
    cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
      : 28;

  const avgPeriodLength =
    periodLengths.length > 0
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : 5;

  const avgLutealPhase =
    lutealPhases.length > 0
      ? Math.round(lutealPhases.reduce((a, b) => a + b, 0) / lutealPhases.length)
      : 14;

  return {
    averageCycleLength: avgCycleLength >= 20 && avgCycleLength <= 45 ? avgCycleLength : 28,
    averagePeriodLength: avgPeriodLength >= 2 && avgPeriodLength <= 8 ? avgPeriodLength : 5,
    averageLutealPhase: avgLutealPhase >= 9 && avgLutealPhase <= 17 ? avgLutealPhase : 14,
    completedCyclesCount: cycleLengths.length,
    minCycleLength: cycleLengths.length > 0 ? Math.min(...cycleLengths) : null,
    maxCycleLength: cycleLengths.length > 0 ? Math.max(...cycleLengths) : null,
  };
}

export interface PredictedDateMap {
  [dateStr: string]: {
    isPeriod: boolean;
    isOvulation: boolean;
    isFertileWindow: boolean;
    cycleStart: string;
  };
}

/**
 * Generates predictions for a range of dates [rangeStart, rangeEnd]
 */
export function generatePredictions(
  rangeStartStr: string,
  rangeEndStr: string,
  cycles: Cycle[],
  stats: CycleStatistics
): PredictedDateMap {
  const result: PredictedDateMap = {};
  const validCycles = [...cycles]
    .filter((c) => Boolean(c.start_date))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  if (validCycles.length === 0) return result;

  const cycleLen = stats.averageCycleLength || 28;
  const periodLen = stats.averagePeriodLength || 5;
  const lutealLen = stats.averageLutealPhase || 14;

  // Helper to mark a single predicted cycle given its start date
  const markPredictedCycle = (cycleStart: string) => {
    // 1. Period days
    for (let p = 0; p < periodLen; p++) {
      const d = addDaysIso(cycleStart, p);
      if (!result[d]) result[d] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
      result[d].isPeriod = true;
    }

    // 2. Next cycle start & ovulation
    const nextStart = addDaysIso(cycleStart, cycleLen);
    const ovulationDate = addDaysIso(nextStart, -lutealLen);

    if (!result[ovulationDate]) {
      result[ovulationDate] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
    }
    result[ovulationDate].isOvulation = true;

    // 3. Fertile window: 5 days before ovulation + ovulation + 1 day after
    for (let f = -5; f <= 1; f++) {
      const fertileDay = addDaysIso(ovulationDate, f);
      if (!result[fertileDay]) {
        result[fertileDay] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
      }
      result[fertileDay].isFertileWindow = true;
    }
  };

  // A. Interpolate missing gaps between known cycles
  for (let i = 0; i < validCycles.length - 1; i++) {
    const c1Start = validCycles[i].start_date;
    const c2Start = validCycles[i + 1].start_date;
    const daysBetween = calculateDayFromDate(c1Start, c2Start);

    // If gap > 42 days (more than ~1.5 standard cycles)
    if (daysBetween !== null && daysBetween > 42) {
      let currentEstimate = addDaysIso(c1Start, cycleLen);
      while (new Date(currentEstimate).getTime() + (cycleLen * 0.7 * 86400000) < new Date(c2Start).getTime()) {
        markPredictedCycle(currentEstimate);
        currentEstimate = addDaysIso(currentEstimate, cycleLen);
      }
    }
  }

  // B. Project future cycles from the latest known cycle
  const latestCycle = validCycles[validCycles.length - 1];
  let projectedStart = addDaysIso(latestCycle.start_date, cycleLen);

  const rangeEndDate = new Date(rangeEndStr);
  // Project up to 18 months ahead
  const maxProjectLimit = new Date();
  maxProjectLimit.setFullYear(maxProjectLimit.getFullYear() + 2);

  while (new Date(projectedStart) <= rangeEndDate && new Date(projectedStart) <= maxProjectLimit) {
    markPredictedCycle(projectedStart);
    projectedStart = addDaysIso(projectedStart, cycleLen);
  }

  return result;
}

/**
 * Builds the month calendar matrix (typically 35 or 42 cells)
 */
export function buildMonthCalendar(
  year: number,
  month: number, // 1 to 12
  cycles: Cycle[],
  entriesByDate: Record<string, DailyEntry>,
  stats: CycleStatistics
): { days: CalendarDayData[]; stats: CycleStatistics } {
  // First day of month
  const firstDay = new Date(year, month - 1, 1);
  // Last day of month
  const lastDay = new Date(year, month, 0);

  // Month starts on day of week (0 = Sunday, 1 = Monday, ...)
  // In Italy/Europe, week starts on Monday (1). Sunday becomes 7.
  let startDayOfWeek = firstDay.getDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday is 7th day

  // Preceding days from previous month
  const prevMonthDaysCount = startDayOfWeek - 1;

  const startDate = new Date(year, month - 1, 1 - prevMonthDaysCount);
  // Total cells to display: usually 35 (5 rows) or 42 (6 rows)
  const totalDays = prevMonthDaysCount + lastDay.getDate() > 35 ? 42 : 35;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);

  const startIso = formatDateIso(startDate);
  const endIso = formatDateIso(endDate);

  const predictions = generatePredictions(startIso, endIso, cycles, stats);

  const todayIso = formatDateIso(new Date());

  // Map cycles by start_date to easily find which cycle a date belongs to
  const sortedCycles = [...cycles]
    .filter((c) => Boolean(c.start_date))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const days: CalendarDayData[] = [];

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateIso = formatDateIso(current);

    const isCurrentMonth = current.getMonth() === month - 1;
    const isToday = dateIso === todayIso;

    // Find if there is an existing daily entry for this date
    const entry = entriesByDate[dateIso];

    // Find cycle info for this date if it falls within a cycle
    let cycleId: string | undefined = entry?.cycle_id;
    let cycleNumber: number | undefined;
    let cycleDay: number | undefined = entry?.cycle_day;

    if (!cycleId && sortedCycles.length > 0) {
      // Find the most recent cycle started on or before this date
      const currentDateObj = new Date(dateIso);
      let candidateCycle: Cycle | null = null;

      for (let cIdx = sortedCycles.length - 1; cIdx >= 0; cIdx--) {
        const c = sortedCycles[cIdx];
        if (new Date(c.start_date) <= currentDateObj) {
          candidateCycle = c;
          break;
        }
      }

      if (candidateCycle) {
        const dayCalc = calculateDayFromDate(candidateCycle.start_date, dateIso);
        // Only assign if within reasonable length (e.g. up to 60 days) or active cycle
        if (dayCalc !== null && dayCalc >= 1 && (dayCalc <= 60 || candidateCycle.is_active)) {
          cycleId = candidateCycle.id;
          cycleNumber = candidateCycle.cycle_number;
          cycleDay = dayCalc;
        }
      }
    } else if (cycleId) {
      const parentCycle = cycles.find((c) => c.id === cycleId);
      if (parentCycle) {
        cycleNumber = parentCycle.cycle_number;
      }
    }

    const prediction = predictions[dateIso];
    const hasActualPeriod = entry?.menstruation && ['Flusso', 'Abbondante', 'M', 'm', 'Spotting'].includes(entry.menstruation);

    days.push({
      date: dateIso,
      dayNumber: current.getDate(),
      isCurrentMonth,
      isToday,
      cycleId,
      cycleNumber,
      cycleDay,
      entry,
      isPredictedPeriod: !hasActualPeriod && prediction?.isPeriod,
      isPredictedOvulation: prediction?.isOvulation,
      isPredictedFertileWindow: prediction?.isFertileWindow,
      predictionConfidence: stats.completedCyclesCount >= 3 ? 'high' : stats.completedCyclesCount >= 1 ? 'medium' : 'low',
    });
  }

  return { days, stats };
}
