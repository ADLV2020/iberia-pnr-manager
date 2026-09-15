// src/services/ndc.service.ts

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

interface PassengerData {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
}

export interface FlightData {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD (Ida)
  returnDate?: string; // YYYY-MM-DD (Vuelta opcional)
  flightType?: 'one-way' | 'round-trip';
}

interface ProcessedSegment {
  origin: string;
  destination: string;
  flightNumber: string;
  date: string;        // Formato DDMMYYYY
  departureTime: string; // HHMM
  arrivalTime: string;   // HHMM
  bookingClass: string;
  direction: 'GO' | 'RETURN';
  sequence: number;
  from?: string;
  to?: string;
  flight?: string;
  time?: string;
  class?: string;
}

const randomDelay = () => new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 1000));

const DEFAULT_COOKIE = "mt.v=2.1037978947.1778589064559; _cq_duid=1.1778589064.c1uj7YORL5CzwQI4; _fbp=fb.1.1778589066107.20468017513695995; _ga=GA1.1.1612261184.1778589066; _twpid=tw.1778589066156.259429965760051712; QuantumMetricUserID=68abaadafa44b1f77eb30e0a25352d0a; rskxRunCookie=0; rCookie=frnw2tsavorzyk2bv9g388mpf874we; OptanonAlertBoxClosed=2026-05-21T09:54:25.791Z; _gcl_gs=2.1.k1$i1779869426$u168300281; _gcl_aw=GCL.1779869429.EAIaIQobChMI9OLmkoLZlAMVSZpoCR0wNwFwEAMYASAAEgKXgPD_BwE; OptanonConsent=isGpcEnabled=0&datestamp=Wed+May+27+2026+11%3A15%3A54+GMT%2B0200+(hora+de+verano+de+Europa+central)&version=202212.1.0&isIABGlobal=false&hosts=&consentId=c4f4ee9d-0c67-427c-be29-c628e8de2afb&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0005%3A1%2CC0004%3A1%2CC0003%3A1&geolocation=ES%3BCT&AwaitingReconsent=false;";

export class IberiaBookingService {
  private baseUrl: string;
  private cookie: string;
  private logs: NdcStepLog[] = [];
  private accessToken: string = '';

  private defaultPassenger: PassengerData = {
    firstName: 'AUTOMATION',
    surname: 'TEST',
    email: 'cont.aadelavega+test@iberia.es',
    phone: '600100200'
  };

  constructor(environment: 'PRE' | 'INT' = 'INT') {
    const subdomain = environment === 'INT' ? 'int-' : 'pre-';
    this.baseUrl = `https://${subdomain}ibisservices.iberia.com`;
    this.cookie = process.env.COOKIE_STRING || DEFAULT_COOKIE;
  }

  private async request(
    stepName: string,
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
    isAuthRequest: boolean = false
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

  // Paso 1: Autenticación
  async authenticate(): Promise<{ access_token: string }> {
    const url = `${this.baseUrl}/api/auth/realms/commercial_platform/protocol/openid-connect/token`;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic aWJlcmlhX3dlYjphOWQ4NjRiZi1jY2Y2LTQwODctYTJmMS1hMzI1YWEyNGIxMWE=',
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
    };
    const body = 'grant_type=client_credentials&login_hint=keycloak';

    const result = await this.request('1. Autenticación', url, 'POST', headers, body, true);
    this.accessToken = result.access_token;
    return result;
  }

  // Paso 2: Availability (Soporte One-Way y Round-Trip)
  async checkAvailability(flight: FlightData): Promise<any> {
    const url = `${this.baseUrl}/api/sse-avm/rs/v2/availability/itinerary`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'es-ES',
      'Authorization': `Bearer ${this.accessToken}`,
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'Cookie': this.cookie,
      'Origin': 'https://int.iberia.com',
      'Referer': 'https://int.iberia.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const slices = [
      { origin: flight.origin, destination: flight.destination, date: flight.date }
    ];

    if (flight.flightType === 'round-trip' && flight.returnDate) {
      slices.push({
        origin: flight.destination,
        destination: flight.origin,
        date: flight.returnDate
      });
    }

    const body = {
      isPetFlight: false,
      slices,
      passengers: [{ passengerType: 'ADULT', count: 1 }],
      marketCode: 'ES',
      preferredCabin: 'ECONOMY'
    };

    return await this.request('2. Availability', url, 'POST', headers, body);
  }

  // Paso 3: Fare
  async priceFare(responseId: string, originDestinations: any[], offerItemId: string): Promise<any> {
    const url = `${this.baseUrl}/api/sse-avm/rs/v2/fare`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': `Bearer ${this.accessToken}`,
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Content-Type': 'application/json',
      'Cookie': this.cookie,
      'Origin': 'https://int.iberia.com',
      'Referer': 'https://int.iberia.com'
    };

    const odPayload = originDestinations.map(od => ({
      originDestinationId: od.originDestinationId,
      selectedSliceId: od.applicableSlices[0].sliceId
    }));

    const body = {
      responseId,
      originDestinations: odPayload,
      offerItemIds: [offerItemId]
    };

    return await this.request('3. Fare (cotización)', url, 'POST', headers, body);
  }

  // Paso 4: Create Order
  async createOrder(shoppingResponseId: string, offerItemId: string, passenger: PassengerData): Promise<any> {
    const url = `${this.baseUrl}/api/sse-orm/rs/v2/order`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': `Bearer ${this.accessToken}`,
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Content-Type': 'application/json',
      'Cookie': this.cookie,
      'Origin': 'https://int.iberia.com',
      'Referer': 'https://int.iberia.com'
    };
    const body = {
      shoppingResponseId,
      offerItems: [{ offerItemId, passengerIds: ['ADULT_01'] }],
      passengers: [{
        idInfo: { type: 'DN', value: '70590385G' },
        passengerId: 'ADULT_01',
        passengerType: 'ADULT',
        personalInfo: {
          firstName: passenger.firstName,
          firstSurname: passenger.surname,
          birthDate: '2000-11-11'
        }
      }],
      primaryContact: {
        email: passenger.email,
        phone: passenger.phone,
        phoneType: 'MOBILE',
        phonePrefix: '34',
        prefixCountryCode: 'ES',
        suscribeNewsletter: false
      },
      onHold: false,
      redemptionOptionId: null
    };
    return await this.request('4. Crear orden', url, 'POST', headers, body);
  }

  // Paso 5: Obtener métodos de pago
  async getPaymentMethods(orderId: string): Promise<{ paymentId: string; vaultId: string }> {
    const url = `${this.baseUrl}/api/pmt-ppm/rs/ppm/v7/${orderId}/payment-methods`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': `Bearer ${this.accessToken}`,
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Cookie': this.cookie
    };
    const data = await this.request('5. Obtener métodos de pago', url, 'GET', headers);
    const paymentId = data.paymentId;
    const iberiaPay = data.paymentMethods.find((pm: any) => pm.type === 'IBERIA_PAY');
    if (!iberiaPay) throw new Error('No se encontró método de pago IBERIA_PAY');
    return { paymentId, vaultId: iberiaPay.vault.id };
  }

  // Paso 6: Vault Card
  async registerCreditCard(vaultId: string, cvv: string, cardNumber: string): Promise<any> {
    const url = `https://www.test.indra-netplus.com/iberiapay/api/v2/public/vault/${vaultId}/credit-card`;
    const headers = {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Authorization': `Bearer ${this.accessToken}`,
      'content-type': 'application/json',
      'origin': 'https://www.test.indra-netplus.com'
    };
    const body = { cvv, number: cardNumber };
    return await this.request('6. Registrar tarjeta en vault', url, 'PUT', headers, body);
  }

  // Paso 7: Issue Ticket
  async issueTicket(orderId: string, orderItemsId: string, paymentId: string, vaultId: string, passenger: PassengerData): Promise<any> {
    const url = `${this.baseUrl}/api/sse-orm/rs/v3/issue`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': `Bearer ${this.accessToken}`,
      'Authorization2': 'Basic DC_exit/kOGBOp864E0DQmbz.uJU',
      'Content-Type': 'application/json',
      'Cookie': this.cookie
    };
    const body = {
      orderItemsId: [orderItemsId],
      paymentId,
      paymentMethod: {
        type: 'IBERIA_PAY',
        cardTypeId: '112',
        expiration: '032030',
        payer: {
          personalInfo: { name: passenger.firstName, surname: passenger.surname },
          contactInfo: { email: passenger.email, phone: passenger.phone },
          address: { country: 'ES' }
        },
        vaultId,
        associatedDiscounts: [],
        deviceFingerPrintId: 'QM9VA2LUZ0BJQMJHN2YZZJI4NTU0ZDQYY2JIZWM2ZMFMMJQ0YTA5NJIWT1A',
        offerSelection: false
      },
      orderId
    };
    return await this.request('7. Emisión (Issue)', url, 'POST', headers, body);
  }

  // Guardar dinámicamente en SQLite admitiendo Round-Trip
  private async saveToDatabase(
    pnr: string, 
    surname: string, 
    flightType: string,
    segments: ProcessedSegment[]
  ): Promise<void> {
    const db = await getDatabase();
    const isAmadeus = 'YES';
    const userCreation = 'SISTEMA_NDC';

    await db.run('BEGIN TRANSACTION');
    try {
      const ticketResult = await db.run(`
        INSERT INTO pnr_tickets (flight_type, pnr, surname, is_amadeus, user_creation)
        VALUES (?, ?, ?, ?, ?)
      `, [flightType, pnr, surname, isAmadeus, userCreation]);
      
      const ticketId = ticketResult.lastID;

      for (const seg of segments) {
        const apiString = generateApiString(
          pnr, seg.flightNumber, seg.bookingClass, seg.date, seg.origin, seg.destination, '', '', surname
        );

        await db.run(`
          INSERT INTO pnr_segments (
            ticket_id, direction, sequence, flight, origin_from, destination_to,
            date, time, arrival_time, flight_class, rerouting, disruption_type, is_invoiced, export_data, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'YES', ?, 'FREE')
        `, [
          ticketId, seg.direction, seg.sequence, seg.flightNumber, seg.origin, seg.destination,
          seg.date, seg.departureTime, seg.arrivalTime, seg.bookingClass, '', '', apiString
        ]);
      }

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  }

  // Orquestador completo
  async executeFullFlow(
    flight: FlightData, 
    passengerOverrides?: Partial<PassengerData>,
    onLog?: (log: NdcStepLog) => void
  ): Promise<{ pnr: string; orderId: string; logs: NdcStepLog[]; flightDetails: ProcessedSegment[]; from?: string; to?: string; flight?: string; date?: string; time?: string }> {
    this.logs = [];
    const passenger = { ...this.defaultPassenger, ...passengerOverrides };
    const flightType = flight.flightType || 'one-way';

    const addLogAndNotify = (log: NdcStepLog) => {
      this.logs.push(log);
      if (onLog) onLog(log);
    };

    try {
      // Step 1
      await randomDelay();
      await this.authenticate();
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // Step 2
      await randomDelay();
      const availability = await this.checkAvailability(flight);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      const responseId = availability.responseId;
      const firstOffer = availability.offers[0];
      const offerItemId = firstOffer.offerItems[0].offerItemId;

      // Step 3
      await randomDelay();
      const fare = await this.priceFare(responseId, firstOffer.originDestinations, offerItemId);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      const newResponseId = fare.responseId;
      const newOfferItemId = fare.offers[0].offerItems[0].offerItemId;

      // Step 4
      await randomDelay();
      const order = await this.createOrder(newResponseId, newOfferItemId, passenger);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      const orderId = order.order.orderId;
      const orderItemsId = order.order.orderItems[0].orderItemId;
      const pnrReference = order.order.bookingReferences[0].reference;

      // Step 5
      await randomDelay();
      const { paymentId, vaultId } = await this.getPaymentMethods(orderId);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // Step 6
      await randomDelay();
      await this.registerCreditCard(vaultId, '737', '5585558555855583');
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // Step 7
      await randomDelay();
      const issueResult = await this.issueTicket(orderId, orderItemsId, paymentId, vaultId, passenger);
      addLogAndNotify(this.logs[this.logs.length - 1]);

      // Mapear dinámicamente los tramos
      const processedSegments: ProcessedSegment[] = [];
      const slices = issueResult.order.slices || [];

      slices.forEach((slice: any, index: number) => {
        const seg = slice.segments[0];
        const rawDate = seg.departureDateTime.split(' ')[0];
        const [year, month, day] = rawDate.split('-');
        const formattedDate = `${day}${month}${year}`;

        const origin = seg.departure.code;
        const destination = seg.arrival.code;
        const flightNumber = seg.flight.marketingFlightNumber;
        const departureTime = seg.departureDateTime.split(' ')[1].replace(':', '');
        const arrivalTime = seg.arrivalDateTime.split(' ')[1].replace(':', '');
        const bookingClass = seg.cabin.bookingCode;

        processedSegments.push({
          origin,
          destination,
          flightNumber,
          date: formattedDate,
          departureTime,
          arrivalTime,
          bookingClass,
          direction: index === 0 ? 'GO' : 'RETURN',
          sequence: 1,
          from: origin,
          to: destination,
          flight: flightNumber,
          time: departureTime,
          class: bookingClass
        });
      });

      await this.saveToDatabase(pnrReference, passenger.surname, flightType, processedSegments);

      return {
        pnr: pnrReference,
        orderId,
        logs: this.logs,
        flightDetails: processedSegments,
        from: processedSegments[0]?.from,
        to: processedSegments[0]?.to,
        flight: processedSegments[0]?.flight,
        date: processedSegments[0]?.date,
        time: processedSegments[0]?.time
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
