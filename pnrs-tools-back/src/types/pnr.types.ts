// src/types/pnr.types.ts

// Nuevos estados por Segmento
export type SegmentStatus = 'FREE_TO_USE' | 'RESERVE_TO_USE' | 'UTILIZED' | 'BURNED' | 'EXPIRED';

// Tipos de Disrupción (Disruption)
export type DisruptionType = 'UN' | 'UNTK' | 'FLCH' | 'TK' | 'NO_DISRUPTION';

// Tipos de Reprogramación (Schedule Change)
export type ScheduleChangeType = 'DELAYED' | 'RESCHEDULED' | 'CANCELLED' | 'NONE';

export interface PnrSegment {
  id?: number;
  ticket_id?: number;
  direction: 'GO' | 'RETURN' | 'OUTBOUND' | 'INBOUND';
  sequence: number; // 1, 2, 3...
  flight: string;
  origin_from: string;
  destination_to: string;
  date: string;
  time?: string;
  arrival_time?: string;
  flight_class?: string;
  rerouting?: string;
  disruption_type?: DisruptionType | null;     // Marca 1: Disrupción
  schedule_change_type?: ScheduleChangeType | null; // Marca 2: Reprogramación
  is_invoiced?: string;
  export_data?: string;
  status: SegmentStatus;
}

export interface PnrTicket {
  id?: number;
  flight_type: 'ONE_WAY' | 'ROUND_TRIP';
  pnr: string;
  surname: string;
  is_amadeus?: string;
  user_creation?: string;
  user_abm?: string;
  mocked_at_int?: string | null; // NULL = No mockeado, "YYYY-MM-DD HH:mm:ss" = Mockeado
  mocked_at_pre?: string | null; // NULL = No mockeado, "YYYY-MM-DD HH:mm:ss" = Mockeado
  created_at?: string;
  segments?: PnrSegment[];
}
