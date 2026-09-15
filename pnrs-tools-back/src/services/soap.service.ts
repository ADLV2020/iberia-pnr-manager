import { ENDPOINTS } from '../config/endpoints.config.js';
import { SoapEnvelopeFactory } from './SOAP/soap-envelope.factory.js';
import type { DisruptionData } from './SOAP/soap-envelope.factory.js';

export interface SoapStepLog {
  step: string;
  method: string;
  url: string;
  requestBody?: string;
  status?: number;
  success: boolean;
  error?: string;
  responseData?: string;
}

// Cliente HTTP base reutilizable para llamadas SOAP
async function callSoapServiceWithLog(
  step: string,
  url: string,
  soapAction: string,
  envelope: string
): Promise<{ result: string; log: SoapStepLog }> {
  const log: SoapStepLog = {
    step,
    method: 'POST',
    url,
    requestBody: envelope,
    success: false
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction
      },
      body: envelope
    });

    log.status = response.status;
    const responseText = await response.text();
    log.responseData = responseText;

    if (!response.ok || responseText.includes('<faultstring>')) {
      throw new Error(`SOAP error: ${responseText.substring(0, 500)}`);
    }

    log.success = true;
    return { result: responseText, log };
  } catch (error: any) {
    log.error = error.message;
    throw { log, originalError: error };
  }
}

// Cliente HTTP base para Mock JSON
async function callMockWithLog(step: string, url: string, body: any): Promise<{ result: any; log: SoapStepLog }> {
  const log: SoapStepLog = { step, method: 'POST', url, requestBody: JSON.stringify(body, null, 2), success: false };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    log.status = response.status;
    const data = await response.json();
    log.responseData = JSON.stringify(data, null, 2);

    if (!response.ok) throw new Error(`Mock error: ${response.status}`);

    log.success = true;
    return { result: data, log };
  } catch (error: any) {
    log.error = error.message;
    throw { log, originalError: error };
  }
}

export const disruptionService = {
  // Ejecuta Mock INT registrando logs
  async callMockIntWithLogs(pnr: string, surname: string) {
    const body = { locator: pnr, surname };
    return callMockWithLog('Mock INT', ENDPOINTS.MOCK_INT, body);
  },

  // Ejecuta Mock PRE registrando logs
  async callMockPreWithLogs(pnr: string, surname: string) {
    const body = { locator: pnr, surname };
    return callMockWithLog('Mock PRE', ENDPOINTS.MOCK_PRE, body);
  },

  // Envío unificado de Disrupciones (UN, UNTK, FLCH) utilizando Factory Pattern
  async executeDisruptionWithLogs(data: DisruptionData): Promise<{ result: string; logs: SoapStepLog[] }> {
    const envelope = SoapEnvelopeFactory.getEnvelope(data);
    const stepName = `Disrupción ${data.disruptionType} - ${data.pnr}`;

    try {
      const { result, log } = await callSoapServiceWithLog(
        stepName,
        ENDPOINTS.SOAP_DISRUPTION,
        ENDPOINTS.SOAP_ACTION,
        envelope
      );
      return { result, logs: [log] };
    } catch (err: any) {
      if (err.log) return { result: '', logs: [err.log] };
      throw err;
    }
  },

  // Verificación del estado de VPN / Conectividad
  async checkVpnStatus(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(ENDPOINTS.MOCK_INT, {
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeout);
      return true;
    } catch (error) {
      clearTimeout(timeout);
      return false;
    }
  },

  // Wrappers de conveniencia
  async callDisruptionUNWithLogs(data: any) {
    return this.executeDisruptionWithLogs({ ...data, disruptionType: 'UN' });
  },

  async callDisruptionUNTKWithLogs(data: any) {
    return this.executeDisruptionWithLogs({ ...data, disruptionType: 'UNTK' });
  },

  async callDisruptionFLCHWithLogs(data: any) {
    return this.executeDisruptionWithLogs({ ...data, disruptionType: 'FLCH' });
  }

};
