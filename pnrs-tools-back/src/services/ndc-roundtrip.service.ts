// src/services/ndc-roundtrip.service.ts

import axios from 'axios';
import type { CreateNdcRoundTripDto } from './ndc-roundtrip.dto.js';
import { getDatabase } from '../storage/database.js';
import { generateApiString } from './pnr.service.js';

export class NdcRoundTripService {
  private readonly auth2Header = process.env.AUTH2_HEADER || 'Basic DC_exit/kOGBOp864E0DQmbz.uJU';
  private readonly appVersion = process.env.APP_VERSION || '200';

  private async getAuthToken(): Promise<string> {
    const authUrl = process.env.AUTH_URL || '';
    const basicAuth = process.env.AUTH_BASIC_CREDENTIALS || '';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('login_hint', 'keycloak');

    try {
      const response = await axios.post(authUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': basicAuth,
          'Authorization2': this.auth2Header,
          'X-Request-AppVersion': this.appVersion,
        },
      });
      return response.data.access_token;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Error al autenticar en Keycloak:', error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error('Error al autenticar:', error.message);
      }
      throw new Error('Authentication failed');
    }
  }

  async createRoundTripBooking(dto: CreateNdcRoundTripDto) {
    const accessToken = await this.getAuthToken();
    const hostUrl = process.env.HOST_URL || '';
    const hostUrlOrm = process.env.HOST_URL_ORM || '';

    const commonHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Authorization2': this.auth2Header,
      'Accept-Language': 'es-ES',
      'X-Request-AppVersion': this.appVersion,
      'Content-Type': 'application/json',
    };

    // 1. AVAILABILITY
    console.log(`[NDC] Buscando disponibilidad Round-Trip: ${dto.origin} <-> ${dto.destination}`);

    const availabilityPayload = {
      slices: [
        { origin: dto.origin, destination: dto.destination, date: dto.outboundDate },
        { origin: dto.destination, destination: dto.origin, date: dto.inboundDate },
      ],
      passengers: dto.passengers,
      maxStopNumber: '1',
      marketCode: dto.marketCode || 'ES',
      preferredCabin: dto.preferredCabin || 'ECONOMY',
    };

    const availRes = await axios.post(`${hostUrl}/sse-avm/rs/v2/availability`, availabilityPayload, { headers: commonHeaders });
    const shoppingResponseId = availRes.data.responseId;
    const offers = availRes.data.offers;

    if (!offers || offers.length === 0) {
      throw new Error('No hay ofertas disponibles para el trayecto indicado');
    }

    const selectedOffer = offers[0];
    const offerItemIds = selectedOffer.offerItems.map((item: any) => item.offerItemId);
    const outboundOD = selectedOffer.originDestinations[0];
    const inboundOD = selectedOffer.originDestinations[1];

    // 2. FARING
    console.log('[NDC] Cotizando tarifa Round-Trip...');
    const faringPayload = {
      offerItemIds,
      originDestinations: [
        { originDestinationId: outboundOD.originDestinationId, selectedSliceId: outboundOD.applicableSlices[0].sliceId },
        { originDestinationId: inboundOD.originDestinationId, selectedSliceId: inboundOD.applicableSlices[0].sliceId },
      ],
      responseId: shoppingResponseId,
    };

    const faringRes = await axios.post(`${hostUrl}/sse-avm/rs/v2/fare`, faringPayload, { headers: commonHeaders });
    const faringData = faringRes.data;
    const faringResponseId = faringData.responseId;

    // 3. ORDERING
    console.log('[NDC] Emitiendo PNR / Creando Orden...');
    const orderPassengers = dto.passengerDetails.map((pax, index) => ({
      passengerId: `ADULT_0${index + 1}`,
      contactInfo: { email: dto.emailContact, phoneType: 'HOME', phone: dto.phoneContact },
      passengerType: 'ADULT',
      personalInfo: {
        birthDate: pax.birthDate,
        firstName: pax.firstName,
        firstSurname: pax.firstSurname,
        title: pax.title,
        gender: pax.gender,
      },
    }));

    const orderOfferItems = faringData.offers[0].offerItems.map((item: any) => ({
      offerItemId: item.offerItemId,
      passengerIds: item.passengerIds,
    }));

    const orderPayload = {
      offerItems: orderOfferItems,
      passengers: orderPassengers,
      shoppingResponseId: faringResponseId,
      primaryContact: { email: dto.emailContact, phoneType: 'HOME', phone: dto.phoneContact },
    };

    const orderRes = await axios.post(`${hostUrlOrm}/sse-orm/rs/v2/order`, orderPayload, { headers: commonHeaders });
    const orderData = orderRes.data.order;
    const pnr = orderData.bookingReferences[0].reference;
    const orderId = orderData.orderId;

    // 4. PAYMENT METHODS
    console.log(`[NDC] Obteniendo métodos de pago para orden ${orderId}...`);
    const paymentMethodsRes = await axios.get(`${hostUrl}/pmt-ppm/rs/v3/${orderId}/payment-methods`, { headers: commonHeaders });

    // 5. PERSISTENCIA EN BD (Persistir PNR Round-Trip)
    const primaryPax = dto.passengerDetails[0] || { firstSurname: 'PASSENGER' };
    await this.persistRoundTripBooking(pnr, primaryPax.firstSurname, dto);

    return {
      status: 'SUCCESS',
      message: 'Reserva Round-Trip creada y guardada exitosamente',
      pnr,
      orderId,
      totalPrice: orderData.price.total,
      paymentMethods: paymentMethodsRes.data,
    };
  }

  private async persistRoundTripBooking(pnr: string, surname: string, dto: CreateNdcRoundTripDto): Promise<void> {
    const db = await getDatabase();
    try {
      await db.run('BEGIN TRANSACTION');

      const ticketResult = await db.run(
        `INSERT INTO pnr_tickets (flight_type, pnr, surname, is_amadeus, user_creation) VALUES (?, ?, ?, ?, ?)`,
        ['round-trip', pnr, surname, 'NOT', 'SISTEMA_NDC']
      );

      const ticketId = ticketResult.lastID;

      // Segmento Ida (GO)
      const exportDataGo = generateApiString(pnr, 'IB101', 'Y', dto.outboundDate, dto.origin, dto.destination, '', 'TK', surname);
      await db.run(
        `INSERT INTO pnr_segments (
          ticket_id, direction, sequence, flight, origin_from, destination_to, date, time, flight_class, is_invoiced, export_data, status
        ) VALUES (?, 'GO', 1, ?, ?, ?, ?, '10:00', 'Y', 'NOT', ?, 'FREE')`,
        [ticketId, 'IB101', dto.origin, dto.destination, dto.outboundDate, exportDataGo]
      );

      // Segmento Vuelta (RETURN)
      const exportDataReturn = generateApiString(pnr, 'IB102', 'Y', dto.inboundDate, dto.destination, dto.origin, '', 'TK', surname);
      await db.run(
        `INSERT INTO pnr_segments (
          ticket_id, direction, sequence, flight, origin_from, destination_to, date, time, flight_class, is_invoiced, export_data, status
        ) VALUES (?, 'RETURN', 1, ?, ?, ?, ?, '18:00', 'Y', 'NOT', ?, 'FREE')`,
        [ticketId, 'IB102', dto.destination, dto.origin, dto.inboundDate, exportDataReturn]
      );

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      console.error('Error persistiendo PNR NDC en SQLite:', err);
    }
  }
}
