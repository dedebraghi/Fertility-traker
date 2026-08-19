export type BbtMethod = 'Vaginale' | 'Orale' | 'Rettale' | 'Non specificato';

export type MenstruationType = 'Abbondante' | 'Flusso' | 'Spotting' | 'M' | 'm' | null;

export type SensationType = 'A' | 'U' | 'B' | 'L' | null;

export type MucusQtySymbol = '+' | '-' | '/' | '*' | '+-' | '++' | '--' | string | null;

export type CervixConsistency = 'D' | 'S' | null;
export type CervixOpening = 'C' | 'S' | 'A' | null;
export type CervixPosition = 'B' | 'M' | 'A' | null;

export type IntercourseType = 'X' | 'I' | 'O' | 'P' | null;

export interface DailyEntry {
  id?: string;
  cycle_id?: string;
  user_id?: string;
  cycle_day: number;
  entry_date: string;
  bbt: number | null;
  bbt_time: string | null;
  menstruation: MenstruationType;
  sensation: SensationType;
  mucus_qty_symbol: MucusQtySymbol;
  mucus_qty: string | null;
  mucus_char: string | null;
  cervix_consistency: CervixConsistency;
  cervix_opening: CervixOpening;
  cervix_position: CervixPosition;
  intercourse: IntercourseType;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Cycle {
  id: string;
  user_id: string;
  name: string;
  cycle_number: number;
  year: number;
  month_str: string;
  start_date: string;
  bbt_method: BbtMethod;
  shortest_cycle: number | null;
  teacher_code: string;
  protocol_number: string;
  sigla: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  daily_entries?: Record<number, DailyEntry>;
}

export interface LegacyCycleJSON {
  name?: string;
  cycle_number?: number;
  year?: number;
  month_str?: string;
  start_date?: string;
  bbt_method?: string;
  shortest_cycle?: number | null;
  teacher_code?: string;
  protocol_number?: string;
  sigla?: string;
  daily_entries?: Record<string, {
    date?: string;
    cycle_day: number | string;
    bbt?: number | string | null;
    time?: string | null;
    menstruation?: string | null;
    sensation?: string | null;
    mucus_qty_symbol?: string | null;
    mucus_qty?: string | null;
    mucus_char?: string | null;
    cervix_consistency?: string | null;
    cervix_opening?: string | null;
    cervix_position?: string | null;
    intercourse?: string | null;
    notes?: string | null;
  }>;
}

export type ActiveTab = 'today' | 'chart' | 'cycles' | 'settings';
