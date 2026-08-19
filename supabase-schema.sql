-- =====================================================================
-- SCHEMA SUPABASE: Fertility Tracker (Metodo Sintotermico CAMEN / Roetzer)
-- Compatibile al 100% con Supabase Free Tier (PostgreSQL + RLS)
-- =====================================================================

-- 1. Tabella dei Cicli
CREATE TABLE IF NOT EXISTS public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    month_str TEXT DEFAULT '',
    start_date DATE NOT NULL,
    bbt_method TEXT DEFAULT 'Vaginale', -- Vaginale, Orale, Rettale, Non specificato
    shortest_cycle INTEGER DEFAULT NULL,
    teacher_code TEXT DEFAULT '',
    protocol_number TEXT DEFAULT '',
    sigla TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, cycle_number, year)
);

-- 2. Tabella dei Dati Giornalieri
CREATE TABLE IF NOT EXISTS public.daily_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cycle_day INTEGER NOT NULL CHECK (cycle_day > 0),
    entry_date DATE NOT NULL,
    bbt NUMERIC(4,2) DEFAULT NULL, -- es. 36.75
    bbt_time TIME DEFAULT NULL,    -- es. 07:00
    menstruation TEXT DEFAULT NULL, -- 'M' (flusso abbondante/normale), 'm' (spotting/leggero)
    sensation TEXT DEFAULT NULL,    -- 'A' (Asciutto), 'U' (Umido), 'B' (Bagnato), 'L' (Lubrificato)
    mucus_qty_symbol TEXT DEFAULT NULL, -- '+', '-', '/', '*'
    mucus_qty TEXT DEFAULT NULL,    -- es. "x2"
    mucus_char TEXT DEFAULT NULL,   -- combinazione di 'O', 'T', 'A', 'F', 'D', 'E'
    cervix_consistency TEXT DEFAULT NULL, -- 'D' (Dura), 'S' (Soffice)
    cervix_opening TEXT DEFAULT NULL,     -- 'C' (Chiusa), 'S' (Socchiusa), 'A' (Aperta)
    cervix_position TEXT DEFAULT NULL,    -- 'B' (Basso), 'M' (Medio), 'A' (Alto)
    intercourse TEXT DEFAULT NULL,  -- 'X' (Completo), 'I' (Interrotto), 'O' (Senza Eiac.), 'P' (Protetto)
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(cycle_id, cycle_day)
);

-- Indici per prestazioni fulminee
CREATE INDEX IF NOT EXISTS idx_cycles_user_id ON public.cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_cycle_id ON public.daily_entries(cycle_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_id ON public.daily_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_entry_date ON public.daily_entries(entry_date);

-- =====================================================================
-- SICUREZZA: ROW LEVEL SECURITY (RLS)
-- Ciascun utente ha accesso ESCLUSIVO ai soli propri dati.
-- =====================================================================

ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- Policy per cycles
CREATE POLICY "Users can manage their own cycles"
    ON public.cycles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy per daily_entries
CREATE POLICY "Users can manage their own daily entries"
    ON public.daily_entries
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger automatico per updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cycles_updated_at ON public.cycles;
CREATE TRIGGER set_cycles_updated_at
    BEFORE UPDATE ON public.cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_daily_entries_updated_at ON public.daily_entries;
CREATE TRIGGER set_daily_entries_updated_at
    BEFORE UPDATE ON public.daily_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
