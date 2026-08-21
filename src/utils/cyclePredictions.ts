import { Cycle, DailyEntry, CalendarDayData, CycleStatistics } from '../types';
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
 * starting exclusively from the first recorded checkpoint onward.
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

  const firstRecordedStart = validCycles[0].start_date;
  const cycleLen = stats.averageCycleLength || 28;
  const periodLen = stats.averagePeriodLength || 5;
  const lutealLen = stats.averageLutealPhase || 14;

  // Helper to mark a single predicted cycle given its start date
  const markPredictedCycle = (cycleStart: string, nextCycleStart?: string) => {
    if (cycleStart < firstRecordedStart) return;

    // 1. Period days (only predicted if not past real flow)
    for (let p = 0; p < periodLen; p++) {
      const d = addDaysIso(cycleStart, p);
      if (d >= firstRecordedStart) {
        if (!result[d]) result[d] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
        result[d].isPeriod = true;
      }
    }

    // 2. Ovulation calculation
    const effectiveNextStart = nextCycleStart || addDaysIso(cycleStart, cycleLen);
    const ovulationDate = addDaysIso(effectiveNextStart, -lutealLen);

    if (ovulationDate >= firstRecordedStart) {
      if (!result[ovulationDate]) {
        result[ovulationDate] = { isPeriod: false, isOvulation: false, isFertileWindow: false, cycleStart };
      }
      result[ovulationDate].isOvulation = true;

      // 3. Fertile window: 5 days before ovulation + ovulation + 1 day after
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

  // A. Predictions for recorded cycles and gaps between them
  for (let i = 0; i < validCycles.length; i++) {
    const curr = validCycles[i];
    const c1Start = curr.start_date;

    if (i < validCycles.length - 1) {
      const next = validCycles[i + 1];
      const c2Start = next.start_date;
      const daysBetween = calculateDayFromDate(c1Start, c2Start);

      if (daysBetween !== null && daysBetween <= (cycleLen + 5)) {
        // Normal cycle duration between checkpoints
        markPredictedCycle(c1Start, c2Start);
      } else {
        // Gap > cycleLen: mark cycle 1 prediction based on cycleLen
        markPredictedCycle(c1Start, addDaysIso(c1Start, cycleLen));

        // Step through intermediate estimated cycles
        let stepStart = addDaysIso(c1Start, cycleLen);
        while (stepStart) {
          const daysToNext = calculateDayFromDate(stepStart, c2Start);
          if (daysToNext === null || daysToNext <= (cycleLen * 0.7)) break;
          const nextEst = addDaysIso(stepStart, cycleLen);
          markPredictedCycle(stepStart, nextEst < c2Start ? nextEst : c2Start);
          stepStart = nextEst;
        }
      }
    } else {
      // Latest recorded cycle
      markPredictedCycle(c1Start, addDaysIso(c1Start, cycleLen));

      // Project future cycles from latest cycle up to rangeEndStr and 18 months ahead
      let projectedStart = addDaysIso(c1Start, cycleLen);
      const rangeEndDate = new Date(rangeEndStr);
      const maxLimit = new Date();
      maxLimit.setFullYear(maxLimit.getFullYear() + 2);

      while (new Date(projectedStart) <= rangeEndDate && new Date(projectedStart) <= maxLimit) {
        markPredictedCycle(projectedStart, addDaysIso(projectedStart, cycleLen));
        projectedStart = addDaysIso(projectedStart, cycleLen);
      }
    }
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

  const predictions = generatePredictions(startIso, endIso, cycles, stats);

  // Generate full sequence of real + estimated cycles
  const fullCycleSequence = generateFullCycleSequence(
    cycles,
    entriesByDate,
    stats?.averageCycleLength || 28,
    todayIso
  );

  const validCycles = [...cycles]
    .filter((c) => Boolean(c.start_date))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const firstCheckpointDate = validCycles.length > 0 ? validCycles[0].start_date : null;

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

    // Resolve cycle number and cycle day from fullCycleSequence if at or after first checkpoint
    if (firstCheckpointDate && dateIso >= firstCheckpointDate && fullCycleSequence.length > 0) {
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
