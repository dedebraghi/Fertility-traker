import { Cycle, DailyEntry, CalendarDayData, CycleStatistics, FullCycleItem } from '../types';
import {
  evaluateSymptothermalStatus,
  calculateDayFromDate,
  calculateDateForDay,
  generateFullCycleSequence,
  isMenstrualFlow,
} from './symptothermal';

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
      if (days !== null && days >= 18 && days <= 55) {
        cycleLengths.push(days - 1);
      }
    } else if (curr.shortest_cycle && curr.shortest_cycle >= 18 && curr.shortest_cycle <= 55) {
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
      if (e.cycle_day <= 10 && isMenstrualFlow(e.menstruation)) {
        count++;
      }
    }
    if (count >= 2 && count <= 9) {
      periodLengths.push(count);
    }
  }

  // Calculate average luteal phase and average ovulation day from symptothermal evaluations
  const lutealPhases: number[] = [];
  const ovulationDays: number[] = [];
  for (const cycleId of Object.keys(entriesByCycle)) {
    const entriesMap: Record<number, DailyEntry> = {};
    for (const e of entriesByCycle[cycleId]) {
      entriesMap[e.cycle_day] = e;
    }
    const evalResult = evaluateSymptothermalStatus(entriesMap);
    if (evalResult.hasOvulationDetected && evalResult.ovulationDay && evalResult.ovulationDay >= 8 && evalResult.ovulationDay <= 35) {
      ovulationDays.push(evalResult.ovulationDay);
    }
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

  const avgOvulationDay =
    ovulationDays.length > 0
      ? Math.round(ovulationDays.reduce((a, b) => a + b, 0) / ovulationDays.length)
      : (avgCycleLength >= 20 ? Math.max(9, avgCycleLength - avgLutealPhase) : 14);

  return {
    averageCycleLength: avgCycleLength >= 20 && avgCycleLength <= 45 ? avgCycleLength : 28,
    averagePeriodLength: avgPeriodLength >= 2 && avgPeriodLength <= 8 ? avgPeriodLength : 5,
    averageLutealPhase: avgLutealPhase >= 9 && avgLutealPhase <= 17 ? avgLutealPhase : 14,
    averageOvulationDay: avgOvulationDay >= 8 && avgOvulationDay <= 35 ? avgOvulationDay : 14,
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
 * based on the full sequence of cycles (including backward and forward projections).
 */
export function generatePredictions(
  rangeStartStr: string,
  rangeEndStr: string,
  cycles: Cycle[],
  stats: CycleStatistics,
  fullCycleSequence?: FullCycleItem[],
  entriesByDate?: Record<string, DailyEntry>
): PredictedDateMap {
  const result: PredictedDateMap = {};
  const sequence = fullCycleSequence && fullCycleSequence.length > 0
    ? fullCycleSequence
    : generateFullCycleSequence(cycles, entriesByDate || {}, stats.averageCycleLength || 28);

  if (sequence.length === 0) return result;

  const firstRecordedStart = sequence[0].start_date;
  const cycleLen = stats.averageCycleLength || 28;
  const periodLen = stats.averagePeriodLength || 5;

  // Build map of actual confirmed ovulation date per cycle start date from symptothermal entries
  const realOvulationDateByCycleStart: Record<string, string> = {};
  if (entriesByDate) {
    for (const c of cycles) {
      if (!c.start_date) continue;
      const cycleEntries: Record<number, DailyEntry> = {};
      Object.values(entriesByDate).forEach((e) => {
        if (e.cycle_id === c.id) {
          cycleEntries[e.cycle_day] = e;
        }
      });
      const evalRes = evaluateSymptothermalStatus(cycleEntries);
      if (evalRes.hasOvulationDetected && evalRes.ovulationDay) {
        const ovDate = calculateDateForDay(c.start_date, evalRes.ovulationDay);
        if (ovDate) {
          realOvulationDateByCycleStart[c.start_date] = ovDate;
        }
      }
    }
  }

  // Helper to mark a single predicted/actual cycle given its start date
  const markPredictedCycle = (cycleStart: string, nextCycleStart?: string) => {
    if (cycleStart < firstRecordedStart) return;

    // 1. Period days
    for (let p = 0; p < periodLen; p++) {
      const d = addDaysIso(cycleStart, p);
      if (d >= firstRecordedStart) {
        if (!result[d]) result[d] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
        result[d].isPeriod = true;
      }
    }

    // 2. Ovulation calculation: prefer actual symptothermal ovulation day if confirmed, else statistical average
    let ovulationDate: string | null = realOvulationDateByCycleStart[cycleStart] || null;
    if (!ovulationDate) {
      const targetOvDay = stats.averageOvulationDay || (stats.averageCycleLength ? stats.averageCycleLength - (stats.averageLutealPhase || 14) : 14);
      ovulationDate = addDaysIso(cycleStart, targetOvDay - 1);
    }

    if (ovulationDate && ovulationDate >= firstRecordedStart) {
      if (!result[ovulationDate]) {
        result[ovulationDate] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
      }
      result[ovulationDate].isOvulation = true;

      // 3. Fertile window: 5 days before ovulation + ovulation + 1 day after (the 1st thermal rise day)
      for (let f = -5; f <= 1; f++) {
        const fertileDay = addDaysIso(ovulationDate, f);
        if (fertileDay >= firstRecordedStart) {
          if (!result[fertileDay]) {
            result[fertileDay] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
          }
          result[fertileDay].isFertileWindow = true;
        }
      }
    }
  };

  // Predictions across the full cycle sequence
  for (let i = 0; i < sequence.length; i++) {
    const curr = sequence[i];
    const next = i < sequence.length - 1 ? sequence[i + 1] : null;
    markPredictedCycle(curr.start_date, next?.start_date);
  }

  // Project future cycles from latest sequence item up to rangeEndStr and 18 months ahead
  const latestItem = sequence[sequence.length - 1];
  // For an active/ongoing cycle, future projection must be based on expected cycleLen (average length),
  // NOT on elapsed partial days to today (which was mistakenly setting next cycle to tomorrow).
  const latestDuration = latestItem.is_active ? cycleLen : (latestItem.length_days || cycleLen);
  let projectedStart = addDaysIso(latestItem.start_date, latestDuration);
  const rangeEndDate = new Date(rangeEndStr);
  const maxLimit = new Date();
  maxLimit.setFullYear(maxLimit.getFullYear() + 2);

  while (new Date(projectedStart) <= rangeEndDate && new Date(projectedStart) <= maxLimit) {
    const nextEst = addDaysIso(projectedStart, cycleLen);
    markPredictedCycle(projectedStart, nextEst);
    projectedStart = nextEst;
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
  const lastDay = new Date(year, month, 0);

  // Month starts on day of week (0 = Sunday, 1 = Monday, ...)
  let startDayOfWeek = firstDay.getDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday is 7th day

  const prevMonthDaysCount = startDayOfWeek - 1;
  const startDate = new Date(year, month - 1, 1 - prevMonthDaysCount);
  const totalDays = prevMonthDaysCount + lastDay.getDate() > 35 ? 42 : 35;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);

  const startIso = formatDateIso(startDate);
  const endIso = formatDateIso(endDate);
  const todayIso = formatDateIso(new Date());

  // Generate full sequence of real + estimated cycles
  const fullCycleSequence = generateFullCycleSequence(
    cycles,
    entriesByDate,
    stats?.averageCycleLength || 28,
    todayIso
  );

  const predictions = generatePredictions(startIso, endIso, cycles, stats, fullCycleSequence, entriesByDate);

  const firstSequenceStartDate = fullCycleSequence.length > 0 ? fullCycleSequence[0].start_date : null;

  const days: CalendarDayData[] = [];

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateIso = formatDateIso(current);

    const isCurrentMonth = current.getMonth() === month - 1;
    const isToday = dateIso === todayIso;

    // Find if there is an existing daily entry for this date
    const entry = entriesByDate[dateIso];

    let cycleId: string | undefined = entry?.cycle_id;
    let cycleNumber: number | undefined;
    let cycleDay: number | undefined = entry?.cycle_day;

    // Resolve cycle number and cycle day from fullCycleSequence if at or after first sequence date
    if (firstSequenceStartDate && dateIso >= firstSequenceStartDate && fullCycleSequence.length > 0) {
      // Find matching cycle in sequence
      let matchedCycle = fullCycleSequence[0];
      for (let s = fullCycleSequence.length - 1; s >= 0; s--) {
        if (fullCycleSequence[s].start_date <= dateIso) {
          matchedCycle = fullCycleSequence[s];
          break;
        }
      }

      if (matchedCycle) {
        cycleNumber = matchedCycle.cycle_number;
        cycleDay = (calculateDayFromDate(matchedCycle.start_date, dateIso) || 1);
        cycleId = matchedCycle.id || cycleId;
      }
    }

    const prediction = predictions[dateIso];
    const hasActualPeriod = Boolean(entry?.menstruation && isMenstrualFlow(entry.menstruation));

    days.push({
      date: dateIso,
      dayNumber: current.getDate(),
      isCurrentMonth,
      isToday,
      cycleId,
      cycleNumber,
      cycleDay,
      entry,
      isPredictedPeriod: !hasActualPeriod && Boolean(prediction?.isPeriod),
      isPredictedOvulation: Boolean(prediction?.isOvulation),
      isPredictedFertileWindow: Boolean(prediction?.isFertileWindow),
      predictionConfidence: stats.completedCyclesCount >= 3 ? 'high' : stats.completedCyclesCount >= 1 ? 'medium' : 'low',
    });
  }

  return { days, stats };
}
