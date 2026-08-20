import { useState, useEffect, useCallback } from 'react';
import { Cycle, DailyEntry, LegacyCycleJSON, BbtMethod } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  calculateDateForDay,
  calculateDayFromDate,
  generateMonthStr,
  calculateShortestCycleFromHistory,
  isFirstDayOfPeriod,
  calculateNextCycleNumberWithGap,
  estimateCycleStartDateForLateEntry,
  getEstimatedCycleForDate,
} from '../utils/symptothermal';

export function useCycleData() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [dailyEntries, setDailyEntries] = useState<Record<number, DailyEntry>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [allEntriesByDate, setAllEntriesByDate] = useState<Record<string, DailyEntry>>({});
  const [allEntriesList, setAllEntriesList] = useState<DailyEntry[]>([]);

  const activeCycle = cycles.find(c => c.id === activeCycleId) || null;

  // 1. Fetch Cycles
  const fetchCycles = useCallback(async () => {
    if (!user) {
      setCycles([]);
      setActiveCycleId(null);
      setDailyEntries({});
      setAllEntriesByDate({});
      setAllEntriesList([]);
      setLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await client
        .from('cycles')
        .select('*')
        .order('year', { ascending: false })
        .order('cycle_number', { ascending: false });

      if (fetchErr) throw fetchErr;

      const cycleList: Cycle[] = data || [];
      setCycles(cycleList);

      if (cycleList.length > 0) {
        setActiveCycleId(prev => {
          if (prev && cycleList.some(c => c.id === prev)) return prev;
          const defaultActive = cycleList.find(c => c.is_active) || cycleList[0];
          return defaultActive.id;
        });
      } else {
        setActiveCycleId(null);
        setDailyEntries({});
      }
    } catch (err: any) {
      console.error('Error fetching cycles:', err);
      setError(err.message || 'Errore durante il caricamento dei cicli');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 2. Fetch All Daily Entries for User (for calendar & stats)
  const fetchAllDailyEntries = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !user) return;

    try {
      const { data, error: entriesErr } = await client
        .from('daily_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true });

      if (entriesErr) throw entriesErr;

      const list: DailyEntry[] = (data || []).map((entry: DailyEntry) => ({
        ...entry,
        bbt: entry.bbt !== null && entry.bbt !== undefined ? Number(entry.bbt) : null,
      }));

      const mapByDate: Record<string, DailyEntry> = {};
      list.forEach((e) => {
        if (e.entry_date) {
          mapByDate[e.entry_date] = e;
        }
      });

      setAllEntriesList(list);
      setAllEntriesByDate(mapByDate);
    } catch (err: any) {
      console.error('Error fetching all daily entries:', err);
    }
  }, [user]);

  // 3. Fetch Daily Entries for Active Cycle
  const fetchDailyEntries = useCallback(async (cycleId: string) => {
    const client = getSupabaseClient();
    if (!client || !user) return;

    try {
      setError(null);
      const { data, error: entriesErr } = await client
        .from('daily_entries')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('cycle_day', { ascending: true });

      if (entriesErr) throw entriesErr;

      const entriesMap: Record<number, DailyEntry> = {};
      (data || []).forEach((entry: DailyEntry) => {
        entriesMap[entry.cycle_day] = {
          ...entry,
          bbt: entry.bbt !== null ? Number(entry.bbt) : null,
        };
      });
      setDailyEntries(entriesMap);
    } catch (err: any) {
      console.error('Error fetching daily entries:', err);
      setError(err.message || 'Errore durante il caricamento dei dati giornalieri');
    }
  }, [user]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  useEffect(() => {
    if (user) {
      fetchAllDailyEntries();
    }
  }, [user, fetchAllDailyEntries]);

  useEffect(() => {
    if (activeCycleId) {
      fetchDailyEntries(activeCycleId);
    } else {
      setDailyEntries({});
    }
  }, [activeCycleId, fetchDailyEntries]);

  // Save / Update Daily Entry for active cycle
  const saveDailyEntry = async (
    entry: Partial<DailyEntry> & { cycle_day: number },
    options?: {
      forceNewCycle?: boolean;
      newCycleStartDate?: string;
      isContinuationOfLongCycle?: boolean;
    }
  ) => {
    if (!user) throw new Error('Utente non autenticato');

    const calculatedDay = activeCycle ? calculateDayFromDate(activeCycle.start_date, entry.entry_date || new Date().toISOString().split('T')[0]) : null;
    const isCycleStale = Boolean(calculatedDay !== null && (calculatedDay > 50 || calculatedDay < 1));

    // If activeCycle is stale or options indicate custom cycle creation, route through saveEntryForDate
    if (isCycleStale || options?.forceNewCycle || options?.newCycleStartDate || !activeCycle) {
      const entryDate = entry.entry_date || (activeCycle ? calculateDateForDay(activeCycle.start_date, entry.cycle_day) : new Date().toISOString().split('T')[0]);
      return saveEntryForDate(entryDate!, entry, options);
    }

    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const entryDate = entry.entry_date || calculateDateForDay(activeCycle.start_date, entry.cycle_day) || activeCycle.start_date;

    const payload = {
      cycle_id: activeCycle.id,
      user_id: user.id,
      cycle_day: entry.cycle_day,
      entry_date: entryDate,
      bbt: entry.bbt !== null && entry.bbt !== undefined ? Number(entry.bbt) : null,
      bbt_time: entry.bbt_time ?? null,
      menstruation: entry.menstruation ?? null,
      sensation: entry.sensation ?? null,
      mucus_qty_symbol: entry.mucus_qty_symbol ?? null,
      mucus_qty: entry.mucus_qty ?? null,
      mucus_char: entry.mucus_char ?? null,
      cervix_consistency: entry.cervix_consistency ?? null,
      cervix_opening: entry.cervix_opening ?? null,
      cervix_position: entry.cervix_position ?? null,
      intercourse: entry.intercourse ?? null,
      notes: entry.notes ?? null,
    };

    const updatedEntry = { ...payload, bbt: payload.bbt !== null ? Number(payload.bbt) : null } as DailyEntry;

    setDailyEntries(prev => ({
      ...prev,
      [entry.cycle_day]: updatedEntry,
    }));

    setAllEntriesByDate(prev => ({
      ...prev,
      [entryDate]: updatedEntry,
    }));

    const { error: upsertErr } = await client
      .from('daily_entries')
      .upsert(payload, { onConflict: 'cycle_id,cycle_day' });

    if (upsertErr) {
      console.error('Error saving entry:', upsertErr);
      await fetchDailyEntries(activeCycle.id);
      await fetchAllDailyEntries();
      throw new Error(upsertErr.message);
    }
  };

  // Save / Update Daily Entry for an arbitrary date (used in Calendar / Smart Dialog)
  const saveEntryForDate = async (
    entryDate: string,
    entryData: Partial<DailyEntry>,
    options?: {
      forceNewCycle?: boolean;
      newCycleStartDate?: string;
      isContinuationOfLongCycle?: boolean;
    }
  ) => {
    if (!user) throw new Error('Per salvare i dati, accedi prima con il tuo account.');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    // Find all valid cycles sorted by date
    const sortedCycles = [...cycles]
      .filter(c => Boolean(c.start_date))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // Check if this entry is the first day of a period flow
    const isFirstMenstDay = isFirstDayOfPeriod(entryDate, entryData.menstruation, allEntriesByDate);

    let targetCycle: Cycle | null = null;
    const targetDateObj = new Date(entryDate);

    // If it's the first day of a period (and not explicitly forced otherwise) or forceNewCycle is true,
    // we start a new cycle starting on this date (or custom start date).
    if ((isFirstMenstDay && !options?.isContinuationOfLongCycle) || options?.forceNewCycle) {
      const newStartDate = options?.newCycleStartDate || entryDate;
      const prevCycle = sortedCycles.filter(c => new Date(c.start_date) < new Date(newStartDate)).pop() || activeCycle || null;
      const calculatedCycleNum = calculateNextCycleNumberWithGap(prevCycle, newStartDate);

      targetCycle = await transitionToNewCycle(newStartDate, {
        customCycleNumber: calculatedCycleNum,
        initialMenstruation: entryData.menstruation || undefined,
      });
    } else {
      // Use estimated cycle placement for non-menstruation entries
      const est = getEstimatedCycleForDate(entryDate, sortedCycles, 28);

      if (est.isExistingCycle && est.existingCycleId) {
        targetCycle = sortedCycles.find(c => c.id === est.existingCycleId) || null;
      } else {
        // Check if a cycle with estimated start already exists
        const existingByDate = sortedCycles.find(c => c.start_date === est.startDate);
        if (existingByDate) {
          targetCycle = existingByDate;
        } else {
          // Auto-create estimated cycle container
          targetCycle = await transitionToNewCycle(est.startDate, {
            customCycleNumber: est.cycleNumber,
          });
        }
      }

      if (!targetCycle) {
        targetCycle = activeCycle || sortedCycles[0] || null;
      }

      // If no cycle exists at all, start first cycle
      if (!targetCycle) {
        targetCycle = await startFirstCycle(entryDate, {
          bbtMethod: 'Vaginale',
        });
      }
    }

    const calculatedCycleDay = calculateDayFromDate(targetCycle.start_date, entryDate) || 1;
    const cycleDay = entryData.cycle_day !== undefined && entryData.cycle_day > 0 
      ? entryData.cycle_day 
      : Math.max(1, calculatedCycleDay);

    const payload = {
      cycle_id: targetCycle.id,
      user_id: user.id,
      cycle_day: cycleDay,
      entry_date: entryDate,
      bbt: entryData.bbt !== null && entryData.bbt !== undefined ? Number(entryData.bbt) : null,
      bbt_time: entryData.bbt_time ?? null,
      menstruation: entryData.menstruation ?? null,
      sensation: entryData.sensation ?? null,
      mucus_qty_symbol: entryData.mucus_qty_symbol ?? null,
      mucus_qty: entryData.mucus_qty ?? null,
      mucus_char: entryData.mucus_char ?? null,
      cervix_consistency: entryData.cervix_consistency ?? null,
      cervix_opening: entryData.cervix_opening ?? null,
      cervix_position: entryData.cervix_position ?? null,
      intercourse: entryData.intercourse ?? null,
      notes: entryData.notes ?? null,
    };

    const updatedEntry = { ...payload, bbt: payload.bbt !== null ? Number(payload.bbt) : null } as DailyEntry;

    // Update in memory
    setAllEntriesByDate(prev => ({
      ...prev,
      [entryDate]: updatedEntry,
    }));

    if (activeCycle && targetCycle.id === activeCycle.id) {
      setDailyEntries(prev => ({
        ...prev,
        [cycleDay]: updatedEntry,
      }));
    }

    const { error: upsertErr } = await client
      .from('daily_entries')
      .upsert(payload, { onConflict: 'cycle_id,cycle_day' });

    if (upsertErr) {
      console.error('Error saving entry for date:', upsertErr);
      await fetchAllDailyEntries();
      if (activeCycle) await fetchDailyEntries(activeCycle.id);
      throw new Error(upsertErr.message);
    }
  };

  // Transition to New Cycle (Automatic archive & create next)
  const transitionToNewCycle = async (
    startDate: string,
    options?: {
      customCycleNumber?: number;
      customBbtMethod?: BbtMethod;
      customShortestCycle?: number | null;
      initialMenstruation?: DailyEntry['menstruation'];
    }
  ) => {
    if (!user) throw new Error('Per iniziare un nuovo ciclo, accedi prima con il tuo account.');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    // If the active cycle was started within the last 5 days and user is setting the real start date,
    // adjust the active cycle's start_date instead of creating an unwanted duplicate cycle
    const diffDaysFromActiveStart = activeCycle ? calculateDayFromDate(activeCycle.start_date, startDate) : null;
    const isAdjustingCurrentCycleStart = Boolean(
      activeCycle && 
      diffDaysFromActiveStart !== null && 
      diffDaysFromActiveStart >= 0 && 
      diffDaysFromActiveStart <= 5
    );

    if (isAdjustingCurrentCycleStart && activeCycle) {
      // 1. Update active cycle's start_date
      await client
        .from('cycles')
        .update({ start_date: startDate })
        .eq('id', activeCycle.id);

      // 2. Delete any old entry from previous start date if different
      if (activeCycle.start_date !== startDate) {
        await client
          .from('daily_entries')
          .delete()
          .eq('cycle_id', activeCycle.id)
          .eq('entry_date', activeCycle.start_date);
      }

      // 3. Upsert Day 1 entry on new start date
      await client.from('daily_entries').upsert({
        cycle_id: activeCycle.id,
        user_id: user.id,
        cycle_day: 1,
        entry_date: startDate,
        menstruation: options?.initialMenstruation || 'Flusso',
      }, { onConflict: 'cycle_id,cycle_day' });

      await fetchCycles();
      await fetchAllDailyEntries();
      await fetchDailyEntries(activeCycle.id);
      return activeCycle;
    }

    // 1. Deactivate current active cycle if creating a brand new cycle
    if (activeCycle) {
      await client
        .from('cycles')
        .update({ is_active: false })
        .eq('id', activeCycle.id);
    }

    // 2. Prepare computed properties
    const [y] = startDate.split('-').map(Number);
    const calculatedYear = !isNaN(y) ? y : new Date().getFullYear();
    const calculatedMonthStr = generateMonthStr(startDate);
    const calculatedShortest = options?.customShortestCycle !== undefined 
      ? options.customShortestCycle 
      : calculateShortestCycleFromHistory(cycles, startDate);

    // Calculate progression cycle number factoring in estimated gaps if not explicitly passed
    const sortedCycles = [...cycles]
      .filter(c => Boolean(c.start_date))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const prevCycle = sortedCycles.filter(c => new Date(c.start_date) < new Date(startDate)).pop() || activeCycle || null;

    // Check if a cycle with the exact same start_date already exists
    const existingCycleSameStart = cycles.find(c => c.start_date === startDate);
    if (existingCycleSameStart) {
      await client
        .from('cycles')
        .update({ is_active: true })
        .eq('id', existingCycleSameStart.id);

      await client.from('daily_entries').upsert({
        cycle_id: existingCycleSameStart.id,
        user_id: user.id,
        cycle_day: 1,
        entry_date: startDate,
        menstruation: options?.initialMenstruation || 'Flusso',
      }, { onConflict: 'cycle_id,cycle_day' });

      await fetchCycles();
      setActiveCycleId(existingCycleSameStart.id);
      return existingCycleSameStart;
    }

    // Calculate progression cycle number
    const nextNumber = options?.customCycleNumber || calculateNextCycleNumberWithGap(prevCycle, startDate);

    // Ensure cycle number is unique for this year
    const existingNumbersForYear = new Set(cycles.filter(c => c.year === calculatedYear).map(c => c.cycle_number));
    let safeNextNumber = Number(nextNumber);
    while (existingNumbersForYear.has(safeNextNumber)) {
      safeNextNumber++;
    }

    const bbtMethod = options?.customBbtMethod || activeCycle?.bbt_method || 'Vaginale';
    const name = activeCycle?.name || user.user_metadata?.full_name || 'Maria';

    const payload = {
      user_id: user.id,
      name,
      cycle_number: safeNextNumber,
      year: calculatedYear,
      month_str: calculatedMonthStr,
      start_date: startDate,
      bbt_method: bbtMethod,
      shortest_cycle: calculatedShortest,
      teacher_code: activeCycle?.teacher_code || '',
      protocol_number: activeCycle?.protocol_number || '',
      sigla: activeCycle?.sigla || '',
      is_active: true,
    };

    const { data: newCycle, error: insertErr } = await client
      .from('cycles')
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    if (newCycle) {
      // Day 1 entry with initial menstruation
      await client.from('daily_entries').upsert({
        cycle_id: newCycle.id,
        user_id: user.id,
        cycle_day: 1,
        entry_date: newCycle.start_date,
        menstruation: options?.initialMenstruation || 'Flusso',
      }, { onConflict: 'cycle_id,cycle_day' });

      await fetchCycles();
      setActiveCycleId(newCycle.id);
    }

    return newCycle;
  };

  // Start First Cycle for brand new user
  const startFirstCycle = async (
    startDate: string,
    options?: {
      name?: string;
      bbtMethod?: BbtMethod;
      shortestCycle?: number | null;
    }
  ) => {
    return transitionToNewCycle(startDate, {
      customCycleNumber: 1,
      customBbtMethod: options?.bbtMethod || 'Vaginale',
      customShortestCycle: options?.shortestCycle || null,
      initialMenstruation: 'Flusso',
    });
  };

  // Create New Cycle (Manual)
  const createCycle = async (cycleData: Omit<Cycle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Per creare un ciclo, accedi prima con il tuo account.');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    // Deactivate previous cycles if this new one is active
    if (cycleData.is_active) {
      await client
        .from('cycles')
        .update({ is_active: false })
        .eq('user_id', user.id);
    }

    const payload = {
      ...cycleData,
      user_id: user.id,
    };

    const { data, error: insertErr } = await client
      .from('cycles')
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    if (data) {
      await client.from('daily_entries').insert({
        cycle_id: data.id,
        user_id: user.id,
        cycle_day: 1,
        entry_date: data.start_date,
      });

      await fetchCycles();
      setActiveCycleId(data.id);
    }
    return data;
  };

  // Update Cycle
  const updateCycle = async (id: string, updates: Partial<Cycle>) => {
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    if (updates.is_active) {
      // Deactivate others
      await client
        .from('cycles')
        .update({ is_active: false })
        .eq('user_id', user.id);
    }

    const { error: updateErr } = await client
      .from('cycles')
      .update(updates)
      .eq('id', id);

    if (updateErr) throw new Error(updateErr.message);
    await fetchCycles();
  };

  // Delete Cycle
  const deleteCycle = async (id: string) => {
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const { error: delErr } = await client.from('cycles').delete().eq('id', id);
    if (delErr) throw new Error(delErr.message);
    await fetchCycles();
  };

  // Import Legacy Cycle JSON
  const importLegacyCycle = async (legacy: LegacyCycleJSON) => {
    if (!user) throw new Error("Effettua prima l'accesso con la tua email per salvare i dati sul tuo database!");
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const startDate = legacy.start_date || new Date().toISOString().split('T')[0];
    const cyclePayload = {
      user_id: user.id,
      name: legacy.name || 'Ciclo Storico',
      cycle_number: Number(legacy.cycle_number) || 1,
      year: Number(legacy.year) || new Date().getFullYear(),
      month_str: legacy.month_str || '',
      start_date: startDate,
      bbt_method: (legacy.bbt_method as any) || 'Vaginale',
      shortest_cycle: legacy.shortest_cycle ? Number(legacy.shortest_cycle) : null,
      teacher_code: legacy.teacher_code || '',
      protocol_number: legacy.protocol_number || '',
      sigla: legacy.sigla || '',
      is_active: false,
    };

    const { data: cycle, error: cycleErr } = await client
      .from('cycles')
      .upsert(cyclePayload, { onConflict: 'user_id,cycle_number,year' })
      .select()
      .single();

    if (cycleErr) throw new Error(`Errore creazione ciclo: ${cycleErr.message}`);

    if (cycle && legacy.daily_entries) {
      const dailyRows: any[] = [];

      for (const [key, raw] of Object.entries(legacy.daily_entries)) {
        const cycleDay = Number(raw.cycle_day || key);
        if (isNaN(cycleDay) || cycleDay < 1) continue;

        let bbtVal: number | null = null;
        if (raw.bbt !== undefined && raw.bbt !== null && raw.bbt !== '') {
          const parsed = parseFloat(String(raw.bbt).replace(',', '.'));
          if (!isNaN(parsed) && parsed >= 30 && parsed <= 45) {
            bbtVal = parsed;
          }
        }

        const dateStr = raw.date
          ? (typeof raw.date === 'string' ? raw.date.split('T')[0] : startDate)
          : (calculateDateForDay(startDate, cycleDay) || startDate);

        dailyRows.push({
          cycle_id: cycle.id,
          user_id: user.id,
          cycle_day: cycleDay,
          entry_date: dateStr,
          bbt: bbtVal,
          bbt_time: raw.time || null,
          menstruation: raw.menstruation || null,
          sensation: raw.sensation || null,
          mucus_qty_symbol: raw.mucus_qty_symbol || null,
          mucus_qty: raw.mucus_qty || null,
          mucus_char: raw.mucus_char || null,
          cervix_consistency: raw.cervix_consistency || null,
          cervix_opening: raw.cervix_opening || null,
          cervix_position: raw.cervix_position || null,
          intercourse: raw.intercourse || null,
          notes: raw.notes || null,
        });
      }

      if (dailyRows.length > 0) {
        const { error: entriesErr } = await client
          .from('daily_entries')
          .upsert(dailyRows, { onConflict: 'cycle_id,cycle_day' });
        if (entriesErr) throw new Error(`Errore importazione voci giornaliere: ${entriesErr.message}`);
      }
    }

    await fetchCycles();
    if (cycle) {
      setActiveCycleId(cycle.id);
    }
  };

  return {
    cycles,
    activeCycle,
    activeCycleId,
    setActiveCycleId,
    dailyEntries,
    allEntriesByDate,
    allEntriesList,
    loading,
    error,
    refreshCycles: fetchCycles,
    refreshAllDailyEntries: fetchAllDailyEntries,
    saveDailyEntry,
    saveEntryForDate,
    transitionToNewCycle,
    startFirstCycle,
    createCycle,
    updateCycle,
    deleteCycle,
    importLegacyCycle,
  };
}
