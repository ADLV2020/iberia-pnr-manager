// src/services/round-trip.service.ts

import { getDatabase } from '../storage/database.js';
import { generateApiString } from './pnr.service.js';

export interface NdcStepLog {
  step: string;
  method: string;
  url: string;
  requestBody?: string;
  status?: number;
  success: boolean;
  error?: string;
  responseData?: string;
}

export interface PassengerData {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
}

export interface FlightRoundTripData {
  origin: string;
  destination: string;
  firstDate: string;  // YYYY-MM-DD
  secondDate: string; // YYYY-MM-DD
  numAdults?: number;
  numChilds?: number;
  numInfants?: number;
  numYouths?: number;
  marketCode?: string;
  preferredCabin?: string;
  voucher?: string;
}

export interface ProcessedSegment {
  origin: string;
  destination: string;
  flightNumber: string;
  date: string;          // DDMMYYYY
  departureTime: string; // HHMM
  arrivalTime: string;   // HHMM
  bookingClass: string;
  direction: 'GO' | 'RETURN';
  sequence: number;
}

const DEFAULT_COOKIE = "mt.v=2.1037978947.1778589064559; _cq_duid=1.1778589064.c1uj7YORL5CzwQI4; _fbp=fb.1.1778589066107.20468017513695995; _ga=GA1.1.1612261184.1778589066; _twpid=tw.1778589066156.259429965760051712; QuantumMetricUserID=68abaadafa44b1f77eb30e0a25352d0a; rskxRunCookie=0; rCookie=frnw2tsavorzyk2bv9g388mpf874we; OptanonAlertBoxClosed=2026-05-21T09:54:25.791Z; _gcl_gs=2.1.k1$i1779869426$u168300281; _gcl_aw=GCL.1779869429.EAIaIQobChMI9OLmkoLZlAMVSZpoCR0wNwFwEAMYASAAEgKXgPD_BwE; OptanonConsent=isGpcEnabled=0&datestamp=Wed+May+27+2026+11%3A15%3A54+GMT%2B0200+(hora+de+verano+de+Europa+central)&version=202212.1.0&isIABGlobal=false&hosts=&consentId=c4f4ee9d-0c67-427c-be29-c628e8de2afb&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0005%3A1%2CC0004%3A1%2CC0003%3A1&geolocation=ES%3BCT&AwaitingReconsent=false;";

export class RoundTripService {
  private baseUrl: string;
  private authUrl: string;
  private cookie: string;
  private logs: NdcStepLog[] = [];
  private accessToken: string = '';

  private defaultPassenger: PassengerData = {
    firstName: 'AUTOMAT',
    surname: 'TEST',
    email: 'cont.aadelavega+test01@iberia.es',
    phone: '600100200'
  };

  constructor(environment: 'PRE' | 'INT' = 'INT') {
    const subdomain = environment === 'INT' ? 'int-' : 'pre-';
    this.baseUrl = `https://${subdomain}ibisservices.iberia.com`;
    // FIX: Usar la misma URL base que el resto del API y apuntar al gateway correcto
    this.authUrl = `${this.baseUrl}/api`;
    this.cookie = process.env.COOKIE_STRING || DEFAULT_COOKIE;
  }

  private async request(
    stepName: string,
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: any
  ): Promise<any> {
    const logEntry: NdcStepLog = {
      step: stepName,
      method,
      url,
      success: false,
    };
    
    if (body) {
      logEntry.requestBody = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    }

    try {
      const fetchOptions: RequestInit = { method, headers };
      const contentType = headers['Content-Type'] || '';
      
      if (body) {
        if (contentType.includes('application/json')) {
          fetchOptions.body = JSON.stringify(body);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          fetchOptions.body = body;
        } else {
          fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
      }

      const response = await fetch(url, fetchOptions);
      logEntry.status = response.status;
      const responseText = await response.text();
      logEntry.responseData = responseText.substring(0, 2000);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      let json;
      try {
        json = JSON.parse(responseText);
      } catch {
        json = { raw: responseText };
      }

      logEntry.success = true;
      this.logs.push(logEntry);
      return json;
    } catch (error: any) {
      logEntry.error = error.message;
      logEntry.success = false;
      this.logs.push(logEntry);
      throw error;
    }
  }

  private getCommonHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'es-ES',
      'Authorization': `Bearer ${this.accessToken}`,
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Content-Type': 'application/json',
      'Cookie': this.cookie,
      'Origin': 'https://int.iberia.com',
      'Referer': 'https://int.iberia.com',
      ...extraHeaders
    };
  }

  // Step 1: Autenticación OAuth
    async authenticate(): Promise<{ access_token: string }> {
        const url = `${this.authUrl}/auth/realms/commercial_platform/protocol/openid-connect/token`;
        const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic aWJlcmlhX3dlYjphOWQ4NjRiZi1jY2Y2LTQwODctYTJmMS1hMzI1YWEyNGIxMWE=',
        'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
        'X-Request-AppVersion': '200'
        };
        const body = 'grant_type=client_credentials&login_hint=keycloak';

        const result = await this.request('1. Authentication', url, 'POST', headers, body);
        this.accessToken = result.access_token;
        return result;
    }

  // Step 2 & Step 3: Disponibilidad
  async checkAvailability(flight: FlightRoundTripData, stepName: string = '2. Availability'): Promise<any> {
    const url = `${this.baseUrl}/api/sse-avm/rs/v2/availability`;
    const headers = this.getCommonHeaders();

    const slices = [
      { origin: flight.origin, destination: flight.destination, date: flight.firstDate },
      { origin: flight.destination, destination: flight.origin, date: flight.secondDate }
    ];

    const body = {
      slices,
      passengers: [{ passengerType: 'ADULT', count: flight.numAdults || 1 }],
      maxStopNumber: '1',
      marketCode: flight.marketCode || 'ES',
      preferredCabin: flight.preferredCabin || 'ECONOMY'
    };

    return await this.request(stepName, url, 'POST', headers, body);
  }

  // Step 4: Tarificación (Fare)
  async faring(responseId: string, offerItemId: string, outboundSliceId: string = '0', inboundSliceId: string = '2'): Promise<any> {
    const url = `${this.baseUrl}/api/sse-avm/rs/v2/fare`;
    const headers = this.getCommonHeaders({ 'X-Request-AppVersion': '200' });

    const body = {
      offerItemIds: [offerItemId],
      originDestinations: [
        { originDestinationId: 'ODI_0', selectedSliceId: outboundSliceId },
        { originDestinationId: 'ODI_1', selectedSliceId: inboundSliceId }
      ],
      responseId
    };

    return await this.request('4. Faring', url, 'POST', headers, body);
  }

  // Step 5: Creación de la Orden (Ordering)
  async createOrder(shoppingResponseId: string, offerItemId: string, passenger: PassengerData): Promise<any> {
    const url = `${this.baseUrl}/api/sse-orm/rs/v2/order`;
    const headers = this.getCommonHeaders({ 'X-Request-AppVersion': '200' });

    const body = {
      offerItems: [{ offerItemId, passengerIds: ['ADULT_01'] }],
      passengers: [{
        passengerId: 'ADULT_01',
        contactInfo: {
          email: passenger.email,
          phoneType: 'HOME',
          phone: passenger.phone
        },
        passengerType: 'ADULT',
        personalInfo: {
          birthDate: '1971-07-13',
          firstName: passenger.firstName,
          firstSurname: passenger.surname,
          title: 'MR',
          gender: 'MALE'
        }
      }],
      shoppingResponseId,
      primaryContact: {
        email: passenger.email,
        phoneType: 'HOME',
        phone: passenger.phone
      }
    };

    return await this.request('5. Ordering', url, 'POST', headers, body);
  }

  // Step 6: Obtener Servicios Adicionales (Get Ancillaries)
  async getAncillaries(orderId: string): Promise<any> {
    const url = `${this.baseUrl}/api/ass-fass/rs/fass/v5/${encodeURIComponent(orderId)}/ancillaries`;
    const headers = this.getCommonHeaders({ 'Accept': 'application/json' });

    return await this.request('6. Get Ancillaries', url, 'GET', headers);
  }

  // Step 7: Obtener Mapa de Asientos (Seat Map)
  async getSeatMap(orderId: string, segmentId: string): Promise<any> {
    const url = `${this.baseUrl}/api/sea-cism/rs/cism/v4/${encodeURIComponent(orderId)}/flight/${segmentId}/seatmap`;
    const headers = this.getCommonHeaders({
      'Accept': 'application/json',
      'Request-ClientId': 'AGILE_CLIENT_ID'
    });

    return await this.request('7. Seat Map', url, 'GET', headers);
  }

  // Step 8: Asignación/Actualización de Asientos
  async updateSeats(orderId: string, segmentId: string, row: string = '7', column: string = 'E'): Promise<any> {
    const url = `${this.baseUrl}/api/ass-fass/rs/fass/v5/${encodeURIComponent(orderId)}/ancillaries`;
    const headers = this.getCommonHeaders({
      'Accept': 'application/json',
      'Request-ClientId': 'AGILE_CLIENT_ID'
    });

    const body = [{
      segments: [{
        id: segmentId,
        passengers: [{
          id: 'ADULT_01',
          seat: { row, column }
        }]
      }],
      type: 'SEAT'
    }];

    return await this.request('8. Update Asientos', url, 'PUT', headers, body);
  }

  // Step 9: Selección/Actualización de Equipaje
  async updateAncillaries(orderId: string, sliceId: string): Promise<any> {
    const url = `${this.baseUrl}/api/ass-fass/rs/fass/v5/${encodeURIComponent(orderId)}/ancillaries`;
    const headers = this.getCommonHeaders({
      'Accept': 'application/json',
      'Request-ClientId': 'AGILE_CLIENT_ID'
    });

    const body = [{
      type: 'BAGGAGE',
      slices: [{
        id: sliceId,
        passengers: [{
          id: 'ADULT_01',
          pieces: [{ subtype: 'BAGGAGE_23', units: 1 }]
        }]
      }]
    }];

    return await this.request('9. Update Ancillaries', url, 'PUT', headers, body);
  }

  // Step 10: Obtener Métodos de Pago
  async getPaymentMethods(orderId: string): Promise<any> {
    const url = `${this.baseUrl}/api/pmt-ppm/rs/ppm/v3/${encodeURIComponent(orderId)}/payment-methods`;
    const headers = this.getCommonHeaders({ 'X-Request-AppVersion': '200' });

    return await this.request('10. Payments-Methods', url, 'GET', headers);
  }

  // Step 11: Validación de Voucher / Bono
  async validateVoucher(orderId: string, voucherId: string): Promise<any> {
    const url = `${this.baseUrl}/api/sse-orm/rs/v2/order/${encodeURIComponent(orderId)}/voucher/${voucherId}`;
    const headers = this.getCommonHeaders();

    return await this.request('11. Voucher Validation', url, 'GET', headers);
  }

  // Step 12: Emisión Completa con Voucher (Issue Full Voucher)
  async issueFullVoucher(orderId: string, orderItemsId: string[], paymentId: string): Promise<any> {
    const url = `${this.baseUrl}/api/sse-orm/rs/v3/issue`;
    const headers = this.getCommonHeaders();

    const body = {
      orderId,
      orderItemsId,
      paymentId,
      paymentMethod: { type: 'VOUCHER' },
      associatedDiscount: { type: 'VOUCHER' }
    };

    return await this.request('12. Issue Full Voucher', url, 'POST', headers, body);
  }

  // Persistencia SQLite para registros Round-Trip
  private async saveToDatabase(
    pnr: string, 
    surname: string, 
    segments: ProcessedSegment[]
  ): Promise<void> {
    const db = await getDatabase();
    const isAmadeus = 'YES';
    const userCreation = 'SISTEMA_ROUND_TRIP';

    await db.run('BEGIN TRANSACTION');
    try {
      const ticketResult = await db.run(`
        INSERT INTO pnr_tickets (flight_type, pnr, surname, is_amadeus, user_creation)
        VALUES ('round-trip', ?, ?, ?, ?)
      `, [pnr, surname, isAmadeus, userCreation]);
      
      const ticketId = ticketResult.lastID;

      for (const seg of segments) {
        const apiString = generateApiString(
          pnr, seg.flightNumber, seg.bookingClass, seg.date, seg.origin, seg.destination, '', '', surname
        );

        await db.run(`
          INSERT INTO pnr_segments (
            ticket_id, direction, sequence, flight, origin_from, destination_to,
            date, time, arrival_time, flight_class, rerouting, disruption_type, is_invoiced, export_data, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', 'YES', ?, 'FREE')
        `, [
          ticketId, seg.direction, seg.sequence, seg.flightNumber, seg.origin, seg.destination,
          seg.date, seg.departureTime, seg.arrivalTime, seg.bookingClass, apiString
        ]);
      }

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  }

  // Orquestador completo para el flujo Round-Trip
  async executeFullFlow(
    flight: FlightRoundTripData, 
    passengerOverrides?: Partial<PassengerData>,
    onLog?: (log: NdcStepLog) => void
  ): Promise<{ pnr: string; orderId: string; logs: NdcStepLog[]; flightDetails: ProcessedSegment[] }> {
    this.logs = [];
    const passenger = { ...this.defaultPassenger, ...passengerOverrides };

    const addLogAndNotify = (log: NdcStepLog) => {
      this.logs.push(log);
      if (onLog) onLog(log);
    };

    try {
      // 1. Autenticación
      await this.authenticate();
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // 2. Disponibilidad inicial
      await this.checkAvailability(flight, '2. Availability 1');
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // 3. Segunda Disponibilidad (Availability 2)
      const flightAva2: FlightRoundTripData = {
        origin: 'MAD',
        destination: 'BRU',
        firstDate: '2026-07-15',
        secondDate: '2026-07-25',
        numAdults: 1,
        marketCode: 'ES',
        preferredCabin: 'ECONOMY'
      };
      const ava2Result = await this.checkAvailability(flightAva2, '3. Availability 2');
      addLogAndNotify(this.logs[this.logs.length - 1]);

      const responseId = ava2Result.responseId;
      const selectedOffer = ava2Result.offers?.[0];
      const offerItemId = selectedOffer?.offerItems?.[0]?.offerItemId || 'IB6ddcaff9b7ef46ddb18bfcc4a04c33e8OP_01';

      // 4. Tarificación (Faring)
      const faringRes = await this.faring(responseId, offerItemId);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      const faringResponseId = faringRes.responseId || responseId;
      const finalOfferItemId = faringRes.offers?.[0]?.offerItems?.[0]?.offerItemId || offerItemId;

      // 5. Creación de Orden
      const orderRes = await this.createOrder(faringResponseId, finalOfferItemId, passenger);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      const orderId = orderRes.order.orderId;
      const orderItemsId = orderRes.order.orderItems.map((item: any) => item.orderItemId);
      const pnrReference = orderRes.order.bookingReferences[0].reference;

      // 6. Obtención opcional de Ancillaries
      try {
        await this.getAncillaries(orderId);
        addLogAndNotify(this.logs[this.logs.length - 1]);
      } catch {
        // Ignorar en caso de no aplicabilidad según configuración
      }

      // 7 y 8. SeatMap y Asignación de Asientos
      try {
        const segmentId = 'IB042920250407';
        await this.getSeatMap(orderId, segmentId);
        addLogAndNotify(this.logs[this.logs.length - 1]);

        await this.updateSeats(orderId, segmentId);
        addLogAndNotify(this.logs[this.logs.length - 1]);
      } catch {
        // Ignorar si no está habilitado en TestData
      }

      // 9. Actualización de Equipaje
      try {
        const sliceId = 'MADLIN20251112084500';
        await this.updateAncillaries(orderId, sliceId);
        addLogAndNotify(this.logs[this.logs.length - 1]);
      } catch {
        // Ignorar si no está habilitado en TestData
      }

      // 10. Consulta de Métodos de Pago
      const pmtRes = await this.getPaymentMethods(orderId);
      addLogAndNotify(this.logs[this.logs.length - 1]);
      const paymentId = pmtRes.paymentId;

      // 11. Validación de Bono / Voucher
      if (flight.voucher || 'BONO10000EUR') {
        await this.validateVoucher(orderId, flight.voucher || 'BONO10000EUR');
        addLogAndNotify(this.logs[this.logs.length - 1]);
      }

      // 12. Emisión (Issue Full Voucher)
      const issueResult = await this.issueFullVoucher(orderId, orderItemsId, paymentId);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // Mapeo dinámico de tramos
      const processedSegments: ProcessedSegment[] = [];
      const slices = issueResult.order?.slices || orderRes.order?.slices || [];

      slices.forEach((slice: any, index: number) => {
        const seg = slice.segments[0];
        const rawDate = (seg.departureDateTime || '').split(' ')[0] || '2026-07-15';
        const [year, month, day] = rawDate.split('-');
        const formattedDate = `${day}${month}${year}`;

        processedSegments.push({
          origin: seg.departure?.code || flight.origin,
          destination: seg.arrival?.code || flight.destination,
          flightNumber: seg.flight?.marketingFlightNumber || '0603',
          date: formattedDate,
          departureTime: (seg.departureDateTime || '00:00').split(' ')[1]?.replace(':', '') || '1000',
          arrivalTime: (seg.arrivalDateTime || '00:00').split(' ')[1]?.replace(':', '') || '1200',
          bookingClass: seg.cabin?.bookingCode || 'M',
          direction: index === 0 ? 'GO' : 'RETURN',
          sequence: index + 1
        });
      });

      // Guardar registro
      await this.saveToDatabase(pnrReference, passenger.surname, processedSegments);

      return {
        pnr: pnrReference,
        orderId,
        logs: this.logs,
        flightDetails: processedSegments
      };

    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorLog: NdcStepLog = {
        step: 'ERROR',
        method: 'FATAL',
        url: errorMessage,
        success: false,
        error: errorMessage
      };
      addLogAndNotify(errorLog);
      throw { message: errorMessage, logs: this.logs };
    }
  }

  getLogs(): NdcStepLog[] {
    return this.logs;
  }
  
}
