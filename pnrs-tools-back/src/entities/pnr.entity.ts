// src/entities/pnr.entity.ts

// CODIGO NUEVO / REFACTORIZADO

export enum SegmentStatus {
  FREE_TO_USE = 'FREE_TO_USE',
  RESERVE_TO_USE = 'RESERVE_TO_USE',
  UTILIZED = 'UTILIZED',
  BURNED = 'BURNED',
  EXPIRED = 'EXPIRED'
}

export enum DisruptionType {
  NONE = 'NONE',
  UN = 'UN',
  UNTK = 'UNTK',
  FLCH = 'FLCH'
}

export interface Segment {
  id: string;
  origin: string;
  destination: string;
  flightNumber: string;
  flightClass: string;
  departureDate: string; // YYYY-MM-DD
  status: SegmentStatus;
  
  // NUEVA MARCA: Disrupciones
  disruptionType?: DisruptionType; 
  
  // NUEVA MARCA: Reprogramación / Schedule
  isScheduleChanged?: boolean;
  scheduleDetails?: string; // ej: "+2h delay", "retimed to 14:00"
}

export interface Leg {
  id: string;
  type: 'GO' | 'RETURN' | 'ONE_WAY';
  segments: Segment[];
}

export interface PnrRecord {
  id: string;
  pnr: string;
  surname: string;
  legs: Leg[];
  
  // NUEVAS MARCAS DE AMBIENTE (Timestamp null = No Mockeado)
  mockedAtInt?: Date | null;
  mockedAtPre?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}
