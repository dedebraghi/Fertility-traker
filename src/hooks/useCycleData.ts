import { useState, useEffect, useCallback, useMemo } from 'react';
import { Cycle, DailyEntry, LegacyCycleJSON, BbtMethod, FullCycleItem } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  calculateDateForDay,
  calculateDayFromDate,
  generateMonthStr,
  calculateShortestCycleFromHistory,
  isFirstDayOfPeriod,
  isMenstrualFlow,
  calculateNextCycleNumberWithGap,
  generateFullCycleSequence,
  getEstimatedCycleForDate,
} from '../utils/symptothermal';
import { computeCycleStatistics } from '../utils/cyclePredictions';

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
        .order('start_date', { ascending: false });

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

  // 4. Statistics & Full Cycle Sequence (Real + Estimated)
  const stats = useMemo(() => {
    return computeCycleStatistics(cycles, allEntriesList);
  }, [cycles, allEntriesList]);

  // Symptothermal cycles with active tracking or BBT measurements (for UI selector, charts, PDFs)
  const symptothermalCycles = useMemo(() => {
    return cycles.filter(c => {
      if (c.is_active) return true;
      const entries = allEntriesList.filter(e => e.cycle_id === c.id);
      // I cicli chiusi sintotermici devono avere misurazioni di temperatura basale (BBT)
      return entries.some(e => e.bbt !== null && typeof e.bbt === 'number');
    });
  }, [cycles, allEntriesList]);

  const todayIso = new Date().toISOString().split('T')[0];

  const fullCycleSequence: FullCycleItem[] = useMemo(() => {
    return generateFullCycleSequence(cycles, allEntriesByDate, stats.averageCycleLength, todayIso);
  }, [cycles, allEntriesByDate, stats, todayIso]);

  // 5. Reconcile and Reindex all cycles in database chronologically
  const reconcileAndReindexAllCycles = async () => {
    if (!user) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      // Fetch all cycles sorted chronologically ascending
      const { data: dbCycles } = await client
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (!dbCycles || dbCycles.length === 0) return;

      const totalCycles = dbCycles.length;

      // Update cycle metadata and is_active flag in DB, preserving explicit cycle numbers
      for (let i = 0; i < totalCycles; i++) {
        const c = dbCycles[i];
        const [y] = c.start_date.split('-').map(Number);
        const calculatedYear = !isNaN(y) ? y : new Date().getFullYear();
        const calculatedMonthStr = generateMonthStr(c.start_date);
        const isActive = i === totalCycles - 1;

        // Keep explicit cycle_number if valid; otherwise default to i + 1
        const targetCycleNumber = c.cycle_number > 0 ? c.cycle_number : (i + 1);

        if (
          c.cycle_number !== targetCycleNumber ||
          c.year !== calculatedYear ||
          c.month_str !== calculatedMonthStr ||
          c.is_active !== isActive
        ) {
          await client
            .from('cycles')
            .update({
              cycle_number: targetCycleNumber,
              year: calculatedYear,
              month_str: calculatedMonthStr,
              is_active: isActive,
            })
            .eq('id', c.id);
        }
      }

      // Reassign daily entries to proper cycle based on strict start_date boundaries
      const { data: dbEntries } = await client
        .from('daily_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true });

      if (dbEntries && dbEntries.length > 0) {
        for (const entry of dbEntries) {
          if (!entry.entry_date) continue;
          
          // Find matching cycle where start_date <= entry_date < next_cycle.start_date
          let targetC = dbCycles[0];
          for (let k = dbCycles.length - 1; k >= 0; k--) {
            if (dbCycles[k].start_date <= entry.entry_date) {
              targetC = dbCycles[k];
              break;
            }
          }

          const calculatedDay = Math.max(1, calculateDayFromDate(targetC.start_date, entry.entry_date) || 1);

          if (entry.cycle_id !== targetC.id || entry.cycle_day !== calculatedDay) {
            await client
              .from('daily_entries')
              .update({
                cycle_id: targetC.id,
                cycle_day: calculatedDay,
              })
              .eq('id', entry.id);
          }
        }
      }

      await fetchCycles();
      await fetchAllDailyEntries();
    } catch (err) {
      console.error('Error reconciling cycles:', err);
    }
  };

  // 6. Save Entry For Date (Unified Pipeline used by Calendar, Today, and DetailModal)
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

    const sortedCycles = [...cycles]
      .filter(c => Boolean(c.start_date))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const isFirstMenstDay = isFirstDayOfPeriod(entryDate, entryData.menstruation, allEntriesByDate);

    let targetCycle: Cycle | null = null;

    // Handle new cycle creation / checkpoint
    if (options?.forceNewCycle || (isFirstMenstDay && !options?.isContinuationOfLongCycle)) {
      const newStartDate = options?.newCycleStartDate || entryDate;

      // Check if a cycle on this start date already exists
      const existingCycleSameStart = sortedCycles.find(c => c.start_date === newStartDate);
      if (existingCycleSameStart) {
        targetCycle = existingCycleSameStart;
      } else {
        const [y] = newStartDate.split('-').map(Number);
        const calculatedYear = !isNaN(y) ? y : new Date().getFullYear();
        const calculatedMonthStr = generateMonthStr(newStartDate);
        const bbtMethod = activeCycle?.bbt_method || 'Vaginale';
        const name = activeCycle?.name || user.user_metadata?.full_name || 'Maria';

        const estInfo = getEstimatedCycleForDate(newStartDate, sortedCycles, stats.averageCycleLength || 28);
        const assignedCycleNumber = estInfo.cycleNumber > 0 ? estInfo.cycleNumber : (sortedCycles.length + 1);

        const { data: newCycle, error: insertErr } = await client
          .from('cycles')
          .insert({
            user_id: user.id,
            name,
            cycle_number: assignedCycleNumber,
            year: calculatedYear,
            month_str: calculatedMonthStr,
            start_date: newStartDate,
            bbt_method: bbtMethod,
            shortest_cycle: null,
            teacher_code: activeCycle?.teacher_code || '',
            protocol_number: activeCycle?.protocol_number || '',
            sigla: activeCycle?.sigla || '',
            is_active: true,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        targetCycle = newCycle;
      }
    } else {
      // Find matching cycle for this date
      if (sortedCycles.length > 0) {
        for (let i = sortedCycles.length - 1; i >= 0; i--) {
          if (sortedCycles[i].start_date <= entryDate) {
            targetCycle = sortedCycles[i];
            break;
          }
        }
        if (!targetCycle) {
          targetCycle = sortedCycles[0];
        }
      } else {
        // First cycle for brand new user
        targetCycle = await startFirstCycle(entryDate, {
          bbtMethod: 'Vaginale',
        });
      }
    }

    if (!targetCycle) {
      throw new Error('Impossibile determinare il ciclo di riferimento.');
    }

    const calculatedCycleDay = Math.max(1, calculateDayFromDate(targetCycle.start_date, entryDate) || 1);
    const cycleDay = entryData.cycle_day !== undefined && entryData.cycle_day > 0 
      ? entryData.cycle_day 
      : calculatedCycleDay;

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

    // Optimistic state update
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

    // Safely check if daily entry already exists for this cycle and day
    const { data: existingDailyEntry } = await client
      .from('daily_entries')
      .select('id')
      .eq('cycle_id', targetCycle.id)
      .eq('cycle_day', cycleDay)
      .maybeSingle();

    let saveErr = null;
    if (existingDailyEntry?.id) {
      const { error } = await client
        .from('daily_entries')
        .update(payload)
        .eq('id', existingDailyEntry.id);
      saveErr = error;
    } else {
      const { error } = await client
        .from('daily_entries')
        .insert(payload);
      saveErr = error;
    }

    if (saveErr) {
      console.error('Error saving entry for date:', saveErr);
      await fetchAllDailyEntries();
      if (activeCycle) await fetchDailyEntries(activeCycle.id);
      throw new Error(saveErr.message);
    }

    // If clearing menstruation on a cycle start_date and that was a checkpoint:
    const isClearingFlow = !isMenstrualFlow(entryData.menstruation);
    if (isClearingFlow && targetCycle.start_date === entryDate && cycles.length > 1) {
      const { data: cycleEntries } = await client
        .from('daily_entries')
        .select('menstruation')
        .eq('cycle_id', targetCycle.id);

      const hasOtherFlow = (cycleEntries || []).some(e => isMenstrualFlow(e.menstruation));

      if (!hasOtherFlow) {
        await client.from('cycles').delete().eq('id', targetCycle.id);
        await reconcileAndReindexAllCycles();
      }
    }

    if (options?.forceNewCycle || isFirstMenstDay) {
      await reconcileAndReindexAllCycles();
      setActiveCycleId(targetCycle.id);
    } else {
      await fetchAllDailyEntries();
      if (activeCycleId) await fetchDailyEntries(activeCycleId);
    }
  };

  // 7. Save Daily Entry wrapper
  const saveDailyEntry = async (
    entry: Partial<DailyEntry> & { cycle_day: number },
    options?: {
      forceNewCycle?: boolean;
      newCycleStartDate?: string;
      isContinuationOfLongCycle?: boolean;
    }
  ) => {
    const entryDate = entry.entry_date || (activeCycle ? calculateDateForDay(activeCycle.start_date, entry.cycle_day) : todayIso) || todayIso;
    return saveEntryForDate(entryDate, entry, options);
  };

  // 8. Transition to New Cycle
  const transitionToNewCycle = async (
    startDate: string,
    options?: {
      customCycleNumber?: number;
      customBbtMethod?: BbtMethod;
      customShortestCycle?: number | null;
      initialMenstruation?: DailyEntry['menstruation'];
    }
  ) => {
    await saveEntryForDate(
      startDate,
      { menstruation: options?.initialMenstruation || 'Flusso' },
      { forceNewCycle: true, newCycleStartDate: startDate }
    );
    await fetchCycles();
    const updatedCycles = await getSupabaseClient()?.from('cycles').select('*').eq('user_id', user?.id).order('start_date', { ascending: false });
    return (updatedCycles?.data && updatedCycles.data[0]) || null;
  };

  // 9. Start First Cycle
  const startFirstCycle = async (
    startDate: string,
    options?: {
      name?: string;
      bbtMethod?: BbtMethod;
      shortestCycle?: number | null;
    }
  ) => {
    if (!user) throw new Error('Per iniziare un nuovo ciclo, accedi prima con il tuo account.');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    // Safety guard against race conditions: verify if user already has cycles in DB
    const { data: existingCycles, error: checkErr } = await client
      .from('cycles')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (!checkErr && existingCycles && existingCycles.length > 0) {
      console.warn('Utente possiede già cicli nel database. Annullamento avvio Ciclo 1 duplicato.');
      await fetchCycles();
      await fetchAllDailyEntries();
      const activeOrLatest = existingCycles.find((c: Cycle) => c.is_active) || existingCycles[0];
      if (activeOrLatest) setActiveCycleId(activeOrLatest.id);
      return activeOrLatest as Cycle;
    }

    const [y] = startDate.split('-').map(Number);
    const calculatedYear = !isNaN(y) ? y : new Date().getFullYear();
    const calculatedMonthStr = generateMonthStr(startDate);

    const payload = {
      user_id: user.id,
      name: options?.name || user.user_metadata?.full_name || 'Maria',
      cycle_number: 1,
      year: calculatedYear,
      month_str: calculatedMonthStr,
      start_date: startDate,
      bbt_method: options?.bbtMethod || 'Vaginale',
      shortest_cycle: options?.shortestCycle || null,
      teacher_code: '',
      protocol_number: '',
      sigla: '',
      is_active: true,
    };

    const { data: newCycle, error: insertErr } = await client
      .from('cycles')
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;

    if (newCycle) {
      await client.from('daily_entries').insert({
        cycle_id: newCycle.id,
        user_id: user.id,
        cycle_day: 1,
        entry_date: newCycle.start_date,
        menstruation: 'Flusso',
      });

      await fetchCycles();
      setActiveCycleId(newCycle.id);
    }
    return newCycle;
  };

  // 10. Create Cycle (Manual)
  const createCycle = async (cycleData: Omit<Cycle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Per creare un ciclo, accedi prima con il tuo account.');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    // Ensure cycle number is never 1 or duplicated if cycles already exist
    let assignedNumber = Number(cycleData.cycle_number) || 1;
    const { data: userCycles } = await client
      .from('cycles')
      .select('cycle_number')
      .eq('user_id', user.id);

    if (userCycles && userCycles.length > 0) {
      const maxExistingNum = Math.max(...userCycles.map((c: any) => Number(c.cycle_number) || 0));
      if (assignedNumber <= 1 || userCycles.some((c: any) => Number(c.cycle_number) === assignedNumber)) {
        assignedNumber = maxExistingNum + 1;
      }
    }

    const payload = {
      ...cycleData,
      cycle_number: assignedNumber,
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

      await reconcileAndReindexAllCycles();
      setActiveCycleId(data.id);
    }
    return data;
  };

  // 11. Update Cycle
  const updateCycle = async (id: string, updates: Partial<Cycle>) => {
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const { error: updateErr } = await client
      .from('cycles')
      .update(updates)
      .eq('id', id);

    if (updateErr) throw new Error(updateErr.message);
    await reconcileAndReindexAllCycles();
  };

  // 12. Delete Cycle
  const deleteCycle = async (id: string) => {
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const { error: delErr } = await client.from('cycles').delete().eq('id', id);
    if (delErr) throw new Error(delErr.message);
    await reconcileAndReindexAllCycles();
  };

  // 13. Import Legacy Cycle JSON
  const importLegacyCycle = async (legacy: LegacyCycleJSON) => {
    if (!user) throw new Error("Effettua prima l'accesso con la tua email per salvare i dati sul tuo database!");
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    let startDate = legacy.start_date;
    if (!startDate && legacy.daily_entries) {
      const day1 = legacy.daily_entries['1'] || Object.values(legacy.daily_entries)[0];
      if (day1?.date) {
        startDate = typeof day1.date === 'string' ? day1.date.split('T')[0] : day1.date;
      }
    }
    if (!startDate) {
      startDate = new Date().toISOString().split('T')[0];
    }

    const [y] = startDate.split('-').map(Number);
    const calculatedYear = legacy.year || (!isNaN(y) ? y : new Date().getFullYear());
    const calculatedMonthStr = legacy.month_str || generateMonthStr(startDate);
    const cycleNum = Number(legacy.cycle_number) > 0 ? Number(legacy.cycle_number) : 1;

    const cyclePayload = {
      user_id: user.id,
      name: legacy.name || `Ciclo ${cycleNum}`,
      cycle_number: cycleNum,
      year: calculatedYear,
      month_str: calculatedMonthStr,
      start_date: startDate,
      bbt_method: (legacy.bbt_method as any) || 'Vaginale',
      shortest_cycle: legacy.shortest_cycle ? Number(legacy.shortest_cycle) : null,
      teacher_code: legacy.teacher_code || '',
      protocol_number: legacy.protocol_number || '',
      sigla: legacy.sigla || '',
      is_active: false,
    };

    // Safely check if a cycle with this start_date or cycle_number already exists
    const { data: existingCycles } = await client
      .from('cycles')
      .select('id, start_date, cycle_number')
      .eq('user_id', user.id);

    const existingCycle = (existingCycles || []).find(
      c => c.start_date === startDate || c.cycle_number === cycleNum
    );

    let cycleId = existingCycle?.id;

    if (cycleId) {
      const { error: updateErr } = await client
        .from('cycles')
        .update(cyclePayload)
        .eq('id', cycleId);
      if (updateErr) throw new Error(`Errore aggiornamento ciclo: ${updateErr.message}`);
    } else {
      const { data: inserted, error: insertErr } = await client
        .from('cycles')
        .insert(cyclePayload)
        .select()
        .single();
      if (insertErr) throw new Error(`Errore creazione ciclo: ${insertErr.message}`);
      cycleId = inserted?.id;
    }

    if (cycleId && legacy.daily_entries) {
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
          cycle_id: cycleId,
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
        // Clean existing daily entries for this cycle and insert the fresh set
        await client
          .from('daily_entries')
          .delete()
          .eq('cycle_id', cycleId);

        const { error: entriesErr } = await client
          .from('daily_entries')
          .insert(dailyRows);
        if (entriesErr) throw new Error(`Errore importazione voci giornaliere: ${entriesErr.message}`);
      }
    }

    // Reconcile and reindex all cycles automatically
    await reconcileAndReindexAllCycles();
    if (cycleId) {
      setActiveCycleId(cycleId);
    }
  };

  // 14. Reset all user data
  const resetAllUserData = async () => {
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    await client.from('daily_entries').delete().eq('user_id', user.id);
    await client.from('cycles').delete().eq('user_id', user.id);

    setCycles([]);
    setActiveCycleId(null);
    setDailyEntries({});
    setAllEntriesByDate({});
    setAllEntriesList([]);
  };

  return {
    cycles,
    symptothermalCycles,
    fullCycleSequence,
    activeCycle,
    activeCycleId,
    setActiveCycleId,
    dailyEntries,
    allEntriesByDate,
    allEntriesList,
    stats,
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
    resetAllUserData,
    reconcileAndReindexAllCycles,
  };
}
