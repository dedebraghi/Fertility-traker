export type BbtMethod = 'Vaginale' | 'Orale' | 'Rettale' | 'Non specificato';

export type MenstruationType = 'M' | 'm' | null; // M = Flusso abbondante/normale, m = Spotting/leggero

export type SensationType = 'A' | 'U' | 'B' | 'L' | null; // A = Asciutto, U = Umido, B = Bagnato, L = Lubrificato

export type MucusQtySymbol = '+' | '-' | '/' | '*' | null;

export type CervixConsistency = 'D' | 'S' | null; // D = Dura, S = Soffice
export type CervixOpening = 'C' | 'S' | 'A' | null; // C = Chiusa, S = Socchiusa, A = Aperta
export type CervixPosition = 'B' | 'M' | 'A' | null; // B = Basso, M = Medio, A = Alto

export type IntercourseType = 'X' | 'I' | 'O' | 'P' | null; // X = Completo, I = Interrotto, O = Senza Eiaculazione, P = Protetto

export interface DailyEntry {
  id?: string;
  cycle_id?: string;
  user_id?: string;
  cycle_day: number;
  entry_date: string; // ISO format 'YYYY-MM-DD'
  bbt: number | null; // Temperature in Celsius, e.g. 36.75
  bbt_time: string | null; // HH:mm
  menstruation: MenstruationType;
  sensation: SensationType;
  mucus_qty_symbol: MucusQtySymbol;
  mucus_qty: string | null;
  mucus_char: string | null; // Letters like O, T, A, F, D, E
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
  start_date: string; // ISO format 'YYYY-MM-DD'
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
    cycle_day: number;
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
