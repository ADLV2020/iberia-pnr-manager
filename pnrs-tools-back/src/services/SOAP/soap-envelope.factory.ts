// CODIGO NUEVO

import { DisruptionType } from '../../entities/pnr.entity.js';

export interface DisruptionData {
  pnr: string;
  surname: string;
  flight: string;
  flightClass: string;
  date: string;    // ddmmaaaa
  origin: string;
  destination: string;
  alternative?: string;
  disruptionType: DisruptionType;
}

function formatDateToIso(ddmmaaaa: string): string {
  if (!ddmmaaaa || ddmmaaaa.length !== 8) return '';
  const day = ddmmaaaa.substring(0, 2);
  const month = ddmmaaaa.substring(2, 4);
  const year = ddmmaaaa.substring(4, 8);
  return `${year}-${month}-${day}`;
}

// Estrategia Base
abstract class SoapEnvelopeStrategy {
  abstract build(data: DisruptionData): string;
}

class UnSoapStrategy extends SoapEnvelopeStrategy {
  build(data: DisruptionData): string {
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
}

class UntkSoapStrategy extends SoapEnvelopeStrategy {
  build(data: DisruptionData): string {
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
}

class FlchSoapStrategy extends SoapEnvelopeStrategy {
  build(data: DisruptionData): string {
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
}

export class SoapEnvelopeFactory {
  private static strategies: Record<string, SoapEnvelopeStrategy> = {
    [DisruptionType.UN]: new UnSoapStrategy(),
    [DisruptionType.UNTK]: new UntkSoapStrategy(),
    [DisruptionType.FLCH]: new FlchSoapStrategy(),
  };

  public static getEnvelope(data: DisruptionData): string {
    const strategy = this.strategies[data.disruptionType];
    if (!strategy) {
      throw new Error(`Tipo de disrupción no soportado: ${data.disruptionType}`);
    }
    return strategy.build(data);
  }
}
