// src/services/api.ts

import { FlightType, Segment, PnrRecord } from '../types/index.ts';

const API_BASE = '/api';

export async function fetchRecords(type: FlightType): Promise<PnrRecord[]> {
  const res = await fetch(`${API_BASE}/records/${type}`);
  if (!res.ok) throw new Error('Error al cargar registros');
  return res.json();
}

export async function saveRecord(data: {
  pnr: string;
  lastName: string;
  flightType: FlightType;
  isAmadeus: boolean;
  segments: Segment[];
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error al guardar');
  return json;
}

export async function updateRecord(payload: any): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error al actualizar');
  return json;
}

export async function checkVpnStatus(): Promise<{ connected: boolean }> {
  const res = await fetch(`${API_BASE}/vpn-status`);
  return res.json();
}

export async function callMockInt(pnr: string, surname: string): Promise<any> {
  const res = await fetch(`${API_BASE}/disruption/mock-int`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pnr, surname }),
  });
  if (!res.ok) throw new Error('Mock INT falló');
  return res.json();
}

export async function callMockPre(pnr: string, surname: string): Promise<any> {
  const res = await fetch(`${API_BASE}/disruption/mock-pre`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pnr, surname }),
  });
  if (!res.ok) throw new Error('Mock PRE falló');
  return res.json();
}

export async function callDisruption(type: 'UN' | 'UNTK' | 'FLCH', data: any): Promise<any> {
  let endpoint = '';
  if (type === 'UN') endpoint = '/api/disruption/un';
  else if (type === 'UNTK') endpoint = '/api/disruption/untk';
  else endpoint = '/api/disruption/flch';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Disrupción ${type} falló`);
  return res.json();
}

export async function generatePnr(params: any): Promise<any> {
  const res = await fetch(`${API_BASE}/generate-pnr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al generar PNR');
  return json;
}

export async function generatePnrV2(payload: {
  origin: string;
  destination: string;
  date: string;
  environment: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
}) {
  const response = await fetch('http://localhost:3000/api/v2/generate-pnr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Error en el servidor V2: ${response.status}`);
  }
  return response.json();
}
