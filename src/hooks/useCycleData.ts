import { useState, useEffect, useCallback } from 'react';
import { Cycle, DailyEntry, LegacyCycleJSON } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { calculateDateForDay } from '../utils/symptothermal';

export function useCycleData() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [dailyEntries, setDailyEntries] = useState<Record<number, DailyEntry>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeCycle = cycles.find(c => c.id === activeCycleId) || null;

  // 1. Fetch Cycles
  const fetchCycles = useCallback(async () => {
    if (!user) {
      setCycles([]);
      setActiveCycleId(null);
      setDailyEntries({});
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
        // Keep activeCycleId if still in list, otherwise pick the newest/active one
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

  // 2. Fetch Daily Entries for Active Cycle
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

  // Run on mount or user change
  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Run when active cycle changes
  useEffect(() => {
    if (activeCycleId) {
      fetchDailyEntries(activeCycleId);
    } else {
      setDailyEntries({});
    }
  }, [activeCycleId, fetchDailyEntries]);

  // Save / Update Daily Entry
  const saveDailyEntry = async (entry: Partial<DailyEntry> & { cycle_day: number }) => {
    if (!user || !activeCycle) throw new Error('Nessun ciclo attivo o utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const entryDate = entry.entry_date || calculateDateForDay(activeCycle.start_date, entry.cycle_day) || activeCycle.start_date;

    const payload = {
      cycle_id: activeCycle.id,
      user_id: user.id,
      cycle_day: entry.cycle_day,
      entry_date: entryDate,
      bbt: entry.bbt ?? null,
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

    // Optimistic UI Update
    setDailyEntries(prev => ({
      ...prev,
      [entry.cycle_day]: { ...payload, bbt: payload.bbt !== null ? Number(payload.bbt) : null } as DailyEntry,
    }));

    const { error: upsertErr } = await client
      .from('daily_entries')
      .upsert(payload, { onConflict: 'cycle_id,cycle_day' });

    if (upsertErr) {
      console.error('Error saving entry:', upsertErr);
      await fetchDailyEntries(activeCycle.id); // Rollback
      throw new Error(upsertErr.message);
    }
  };

  // Create New Cycle
  const createCycle = async (cycleData: Omit<Cycle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

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

    // Create day 1 entry
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
    if (!user) throw new Error('Utente non autenticato');
    const client = getSupabaseClient();
    if (!client) throw new Error('Database Supabase non connesso');

    const startDate = legacy.start_date || new Date().toISOString().split('T')[0];
    const cyclePayload = {
      user_id: user.id,
      name: legacy.name || 'Ciclo Storico',
      cycle_number: legacy.cycle_number || 1,
      year: legacy.year || new Date().getFullYear(),
      month_str: legacy.month_str || '',
      start_date: startDate,
      bbt_method: legacy.bbt_method || 'Vaginale',
      shortest_cycle: legacy.shortest_cycle || null,
      teacher_code: legacy.teacher_code || '',
      protocol_number: legacy.protocol_number || '',
      sigla: legacy.sigla || '',
      is_active: false,
    };

    // Upsert cycle
    const { data: cycle, error: cycleErr } = await client
      .from('cycles')
      .upsert(cyclePayload, { onConflict: 'user_id,cycle_number,year' })
      .select()
      .single();

    if (cycleErr) throw new Error(`Errore creazione ciclo: ${cycleErr.message}`);

    if (cycle && legacy.daily_entries) {
      const dailyRows = Object.values(legacy.daily_entries).map(raw => {
        let bbtVal: number | null = null;
        if (raw.bbt !== undefined && raw.bbt !== null && raw.bbt !== '') {
          const parsed = parseFloat(String(raw.bbt).replace(',', '.'));
          if (!isNaN(parsed) && parsed >= 30 && parsed <= 45) {
            bbtVal = parsed;
          }
        }

        const dateStr = raw.date ? (typeof raw.date === 'string' ? raw.date.split('T')[0] : startDate) : (calculateDateForDay(startDate, raw.cycle_day) || startDate);

        return {
          cycle_id: cycle.id,
          user_id: user.id,
          cycle_day: Number(raw.cycle_day),
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
        };
      });

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
    loading,
    error,
    refreshCycles: fetchCycles,
    saveDailyEntry,
    createCycle,
    updateCycle,
    deleteCycle,
    importLegacyCycle,
  };
}
