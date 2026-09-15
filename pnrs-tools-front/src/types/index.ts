// src/types/index.ts

export interface Segment {
  direction: 'GO' | 'RETURN';
  from: string;
  to: string;
  flight: string;
  class: string;
  date: string;        // DDMMYYYY
  time: string;        // HHMM
  arrivalTime: string; // HHMM
  rerouting: string;
  type: string;
  isInvoiced: boolean;
  status?: string;
  exportData?: string;
}

export interface PnrRecord {
  id: string;
  parts: string[];
  rawSegments?: any[];
}

export type FlightType = 'one-way' | 'round-trip' | 'connecting-one-way' | 'connecting-round-trip';

export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}
