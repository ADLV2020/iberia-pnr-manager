// src/services/soap.service.ts

export interface SoapStepLog {
  step: string;          // "Disrupción UN", "Mock INT", etc.
  method: string;        // "POST"
  url: string;
  requestBody?: string;   // XML envelope
  status?: number;
  success: boolean;
  error?: string;
  responseData?: string;  // XML response
}

interface DisruptionData {
  pnr: string;
  surname: string;
  flight: string;
  flightClass: string;
  date: string;    // formato "YYYY-MM-DD"
  origin: string;
  destination: string;
  alternative?: string; // rerouting
  disruptionType: string; // UN, UNTK, FLCH
}

// Convertir fecha de ddmmaaaa a YYYY-MM-DD
function formatDateToIso(ddmmaaaa: string): string {
  if (!ddmmaaaa || ddmmaaaa.length !== 8) return '';
  const day = ddmmaaaa.substring(0,2);
  const month = ddmmaaaa.substring(2,4);
  const year = ddmmaaaa.substring(4,8);
  return `${year}-${month}-${day}`;
}

// Construir el envelope SOAP para disrupción UN
function buildUnSoapEnvelope(data: DisruptionData): string {
  const isoDate = formatDateToIso(data.date);
  return `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:reac="http://Reaccom_Admin.svc">
   <soapenv:Header/>
   <soapenv:Body>
      <reac:DisruptionIB>
         <reac:RequestDisrupt>
            <reac:PNR>${data.pnr}</reac:PNR>
            <reac:DisruptedFlightsUN>
               <reac:vueloUB>
                  <reac:Origen>${data.origin}</reac:Origen>
                  <reac:Destino>${data.destination}</reac:Destino>
                  <reac:Linea>IB</reac:Linea>
                  <reac:Vuelo>${data.flight}</reac:Vuelo>
                  <reac:Clase>${data.flightClass}</reac:Clase>
                  <reac:Fecha>${isoDate}T00:00:00</reac:Fecha>
                  <reac:Cancelado>false</reac:Cancelado>
               </reac:vueloUB>
            </reac:DisruptedFlightsUN>
         </reac:RequestDisrupt>
      </reac:DisruptionIB>
   </soapenv:Body>
</soapenv:Envelope>`.trim();
}

// Envelope para UNTK
function buildUntkSoapEnvelope(data: DisruptionData): string {
  const isoDate = formatDateToIso(data.date);
  return `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:reac="http://Reaccom_Admin.svc">
   <soapenv:Header />
   <soapenv:Body>
      <reac:DisruptionIB>
         <reac:RequestDisrupt>
            <reac:PNR>${data.pnr}</reac:PNR>
            <reac:DisruptedGroupsUNTK>
               <reac:DisruptionGroup>
                  <reac:DisruptedFlights>
                     <reac:vueloUB>
                        <reac:Origen>${data.origin}</reac:Origen>
                        <reac:Destino>${data.destination}</reac:Destino>
                        <reac:Linea>IB</reac:Linea>
                        <reac:Vuelo>${data.flight}</reac:Vuelo>
                        <reac:Clase>${data.flightClass}</reac:Clase>
                        <reac:Fecha>${isoDate}T00:00:00</reac:Fecha>
                        <reac:Cancelado>false</reac:Cancelado>
                     </reac:vueloUB>
                  </reac:DisruptedFlights>
                  <reac:NewFlights>
                     <reac:vueloUB>
                        <reac:Origen>${data.origin}</reac:Origen>
                        <reac:Destino>${data.destination}</reac:Destino>
                        <reac:Linea>IB</reac:Linea>
                        <reac:Vuelo>${data.alternative || ''}</reac:Vuelo>
                        <reac:Clase>${data.flightClass}</reac:Clase>
                        <reac:Fecha>${isoDate}T00:00:00</reac:Fecha>
                        <reac:Cancelado>false</reac:Cancelado>
                     </reac:vueloUB>
                  </reac:NewFlights>
               </reac:DisruptionGroup>
            </reac:DisruptedGroupsUNTK>
         </reac:RequestDisrupt>
      </reac:DisruptionIB>
   </soapenv:Body>
</soapenv:Envelope>`.trim();
}

// Envelope para FLCH (similar a UNTK pero con CheckinWindow)
function buildFlchSoapEnvelope(data: DisruptionData): string {
  const isoDate = formatDateToIso(data.date);
  return `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:reac="http://Reaccom_Admin.svc">
   <soapenv:Header/>
   <soapenv:Body>
      <reac:DisruptionIB>
         <reac:RequestDisrupt>
            <reac:PNR>${data.pnr}</reac:PNR>
            <reac:DisruptedGroupsUNTK>
               <reac:DisruptionGroup>
                  <reac:DisruptedFlights>
                     <reac:vueloUB>
                        <reac:Origen>${data.origin}</reac:Origen>
                        <reac:Destino>${data.destination}</reac:Destino>
                        <reac:Linea>IB</reac:Linea>
                        <reac:Vuelo>${data.flight}</reac:Vuelo>
                        <reac:Clase>${data.flightClass}</reac:Clase>
                        <reac:Fecha>${isoDate}T00:00:00</reac:Fecha>
                        <reac:Cancelado>false</reac:Cancelado>
                     </reac:vueloUB>
                  </reac:DisruptedFlights>
                  <reac:NewFlights>
                     <reac:vueloUB>
                        <reac:Origen>${data.origin}</reac:Origen>
                        <reac:Destino>${data.destination}</reac:Destino>
                        <reac:Linea>IB</reac:Linea>
                        <reac:Vuelo>${data.alternative || ''}</reac:Vuelo>
                        <reac:Clase>${data.flightClass}</reac:Clase>
                        <reac:Fecha>${isoDate}T00:00:00</reac:Fecha>
                        <reac:Cancelado>false</reac:Cancelado>
                     </reac:vueloUB>
                  </reac:NewFlights>
                  <reac:CheckinWindow>true</reac:CheckinWindow>
               </reac:DisruptionGroup>
            </reac:DisruptedGroupsUNTK>
         </reac:RequestDisrupt>
      </reac:DisruptionIB>
   </soapenv:Body>
</soapenv:Envelope>`.trim();
}

// Llamada genérica a un endpoint SOAP
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

// Mock INT (endpoint JSON)
async function callMockInt(pnr: string, surname: string): Promise<any> {
  const url = 'http://internal-OCIAME2IDLB00001-1637202973.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create';
  const body = { locator: pnr, surname };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Mock INT error: ${response.status}`);
  return await response.json();
}

// Mock PRE
async function callMockPre(pnr: string, surname: string): Promise<any> {
  const url = 'http://internal-OCIAME2IDLB00001-339266582.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create';
  const body = { locator: pnr, surname };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Mock PRE error: ${response.status}`);
  return await response.json();
}

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
  callMockInt,
  callMockPre,
  async callMockIntWithLogs(pnr: string, surname: string) {
    const url = 'http://internal-OCIAME2IDLB00001-1637202973.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create';
    const body = { locator: pnr, surname };
    return callMockWithLog('Mock INT', url, body);
  },  
  async callMockPreWithLogs(pnr: string, surname: string) {
    const url = 'http://internal-OCIAME2IDLB00001-339266582.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create';
    const body = { locator: pnr, surname };
    return callMockWithLog('Mock PRE', url, body);
  },  
  async callDisruptionUN(data: DisruptionData) {
    const url = process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services';
    const soapAction = 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB';
    const envelope = buildUnSoapEnvelope(data);
    // return callSoapService(url, soapAction, envelope);
  },
  async callDisruptionUNWithLogs(data: DisruptionData): Promise<{ result: string; logs: SoapStepLog[] }> {
    const url = process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services';
    const soapAction = 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB';
    const envelope = buildUnSoapEnvelope(data);
    try {
      const { result, log } = await callSoapServiceWithLog(`Disrupción UN ${data.pnr}`, url, soapAction, envelope);
      return { result, logs: [log] };
    } catch (err: any) {
      // Asegurar que el log se devuelva incluso en error
      if (err.log) return { result: '', logs: [err.log] };
      throw err;
    }
  },  
  async callDisruptionUNTK(data: DisruptionData) {
    const url = process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services';
    const soapAction = 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB';
    const envelope = buildUntkSoapEnvelope(data);
    // return callSoapService(url, soapAction, envelope);
  },
  async callDisruptionUNTKWithLogs(data: DisruptionData): Promise<{ result: string; logs: SoapStepLog[] }> {
    const url = process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services';
    const soapAction = 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB';
    const envelope = buildUntkSoapEnvelope(data);
    try {
      const { result, log } = await callSoapServiceWithLog(`Disrupción UNTK ${data.pnr}`, url, soapAction, envelope);
      return { result, logs: [log] };
    } catch (err: any) {
      // Asegurar que el log se devuelva incluso en error
      if (err.log) return { result: '', logs: [err.log] };
      throw err;
    }
  },  
  async callDisruptionFLCH(data: DisruptionData) {
    const url = process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services';
    const soapAction = 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB';
    const envelope = buildFlchSoapEnvelope(data);
    // return callSoapService(url, soapAction, envelope);
  },
  async callDisruptionFLCHWithLogs(data: DisruptionData): Promise<{ result: string; logs: SoapStepLog[] }> {
    const url = process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services';
    const soapAction = 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB';
    const envelope = buildFlchSoapEnvelope(data);
    try {
      const { result, log } = await callSoapServiceWithLog(`Disrupción FLCH ${data.pnr}`, url, soapAction, envelope);
      return { result, logs: [log] };
    } catch (err: any) {
      // Asegurar que el log se devuelva incluso en error
      if (err.log) return { result: '', logs: [err.log] };
      throw err;
    }
  },  
  async checkVpnStatus(): Promise<boolean> {
    // Intentar un ping ligero al endpoint de mock (timeout 5s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      // Por ejemplo, probar conectividad al mock INT (no requiere datos)
      await fetch('http://internal-OCIAME2IDLB00001-1637202973.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create', {
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeout);
      return true;
    } catch (error) {
      clearTimeout(timeout);
      return false;
    }
  }
};

export const injectDisruptionToHost = async (exportData: string): Promise<{ success: boolean; message: string }> => {
    try {
        // 1. Parsear el EXPORT DATA (ej: PNR;VUELO;FECHA;FROM;TO;REROUTING;TYPE;LASTNAME)
        const parts = exportData.split(';');
        if (parts.length < 8) {
            throw new Error("Formato de EXPORT DATA inválido para inyección SOAP.");
        }
        
        const [pnr, flight, date, from, to, rerouting, disruptionType, lastName] = parts;

        // 2. Definir el Endpoint obtenido de tu SoapUI
        const endpoint = "http://TU_ENDPOINT_DE_REACCOM_ADMIN/IReaccom_Disruption_Services"; 

        // 3. Construir el XML SOAP dinámico tal como lo armaba el Groovy de SoapUI
        const soapEnvelope = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soapenv/" xmlns:reac="http://schemas.datacontract.org/2004/07/Reaccom_Admin">
           <soapenv:Header/>
           <soapenv:Body>
              <reac:DisruptionIB>
                 <reac:PNR>${pnr}</reac:PNR>
                 <reac:LastName>${lastName}</reac:LastName>
                 <reac:FlightNumber>${flight}</reac:FlightNumber>
                 <reac:DepartureDate>${date}</reac:DepartureDate>
                 <reac:Origin>${from}</reac:Origin>
                 <reac:Destination>${to}</reac:Destination>
                 <reac:DisruptionType>${disruptionType}</reac:DisruptionType>
                 <reac:Rerouting>${rerouting || ''}</reac:Rerouting>
              </reac:DisruptionIB>
           </soapenv:Body>
        </soapenv:Envelope>`.trim();

        // 4. Realizar el envío HTTP imitando las cabeceras exactas de SoapUI
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB' // Cabecera requerida por WCF
            },
            body: soapEnvelope
        });

        const responseText = await response.text();

        if (response.ok && !responseText.includes("<faultstring>")) {
            return { success: true, message: "Disrupción procesada exitosamente en el Host." };
        } else {
            return { success: false, message: `Error del Host: ${responseText}` };
        }

    } catch (error: any) {
        return { success: false, message: error.message || "Error al conectar con el WebService." };
    }
};
