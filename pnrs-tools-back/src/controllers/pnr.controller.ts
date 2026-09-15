// src/controllers/pnr.controller.ts

import type { Request, Response } from 'express';
import { getDatabase } from '../storage/database.js';
import * as pnrService from '../services/pnr.service.js';
import { disruptionService } from '../services/soap.service.js';
import { IberiaBookingService } from '../services/ndc.service.js';
import { RoundTripService } from '../services/round-trip.service.js';

interface PnrRequestParams {
    type: string;
}

// 1. OBTENER REGISTROS
export const getRecords = async (req: Request<PnrRequestParams>, res: Response) => {
    try {
        const { type } = req.params;
        const db = await getDatabase();
        
        const tickets = await db.all('SELECT * FROM pnr_tickets WHERE flight_type = ? ORDER BY id DESC', [type]);
        const records = [];

        for (const ticket of tickets) {
            const segments = await db.all(
                'SELECT * FROM pnr_segments WHERE ticket_id = ? ORDER BY direction DESC, sequence ASC', 
                [ticket.id]
            );

            const goSegments = segments.filter(s => s.direction === 'GO');
            const returnSegments = segments.filter(s => s.direction === 'RETURN');

            const seg1 = goSegments[0] || {};
            const seg2 = returnSegments[0] || goSegments[1] || {};

            const paddedId = String(ticket.id).padStart(5, '0');
            const isInvoicedCombined = seg1.is_invoiced === 'YES' || seg2.is_invoiced === 'YES' ? 'YES' : 'NOT';

            const parts = [
                paddedId,
                ticket.pnr,
                ticket.surname,
                ticket.is_amadeus,
                isInvoicedCombined,
                seg1.origin_from || '',
                seg1.destination_to || '',
                seg1.flight || '',
                seg1.flight_class || '',
                seg1.date || '',
                seg1.time || '',
                seg1.rerouting || '',
                seg1.disruption_type || '',
                seg1.export_data || '',
                seg1.status || 'FREE'
            ];

            if (type !== 'one-way') {
                parts.push(
                    seg2.origin_from || '',
                    seg2.destination_to || '',
                    seg2.flight || '',
                    seg2.flight_class || '',
                    seg2.date || '',
                    seg2.time || '',
                    seg2.rerouting || '',
                    seg2.disruption_type || '',
                    seg2.export_data || '',
                    seg2.status || 'FREE'
                );
            }

            records.push({
                id: String(ticket.id),
                raw: parts.join(','),
                parts: parts,
                rawSegments: segments 
            });
        }
        
        return res.status(200).json(records);
    } catch (error) {
        console.error('Error al mapear registros relacionales:', error);
        return res.status(500).json({ message: 'Error interno en lectura relacional.' });
    }
};

// 2. CREAR REGISTRO MANUAL
export const saveRecord = async (req: Request, res: Response) => {
    const db = await getDatabase();
    try {
        let goCount = 0;
        let returnCount = 0;

        const { flightType, pnr, lastName, isAmadeus, isInvoiced, segments, user } = req.body;
        const amadeusValue = isAmadeus ? 'YES' : 'NOT';
        
        await db.run('BEGIN TRANSACTION');

        const ticketResult = await db.run(`
            INSERT INTO pnr_tickets (flight_type, pnr, surname, is_amadeus, user_creation)
            VALUES (?, ?, ?, ?, ?)
        `, [flightType, pnr, lastName, amadeusValue, user || 'SISTEMA']);

        const ticketId = ticketResult.lastID;

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (!seg || !seg.flight) continue;

            const direction = seg.direction;
            let sequence;

            if (direction === 'GO') {
                goCount++;
                sequence = goCount;
            } else {
                returnCount++;
                sequence = returnCount;
            }

            const apiString = pnrService.generateApiString(
                pnr, seg.flight, seg.class, seg.date, seg.from, seg.to, seg.rerouting, seg.type, lastName
            );

            const invoicedValue = isInvoiced ? 'YES' : 'NOT';

            await db.run(`
                INSERT INTO pnr_segments (
                    ticket_id, direction, sequence, flight, origin_from, destination_to,
                    date, time, arrival_time, flight_class, rerouting, disruption_type, is_invoiced, export_data, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FREE')
            `, [
                ticketId, direction, sequence, seg.flight, seg.from, seg.to,
                seg.date, seg.time, seg.arrivalTime || null, seg.class, seg.rerouting, seg.type, invoicedValue, apiString
            ]);
        }

        await db.run('COMMIT');
        return res.status(201).json({ message: 'Ticket y tramos relacionales guardados con éxito.' });
    } catch (error) {
        await db.run('ROLLBACK');
        console.error('Error al insertar transacción:', error);
        return res.status(500).json({ message: 'Error transaccional al escribir en la base de datos' });
    }
};

// 3. ACTUALIZAR REGISTRO DESDE EL ABM
export const updateRecord = async (req: Request, res: Response) => {
    const db = await getDatabase();
    try {
        let goCount = 0;
        let returnCount = 0;

        const { recordId, flightType, pnr, lastName, isAmadeus, isInvoiced, segments, statuses, userAbm } = req.body;
        const ticketId = parseInt(recordId, 10);
        const amadeusValue = isAmadeus ? 'YES' : 'NOT';

        await db.run('BEGIN TRANSACTION');

        await db.run(`
            UPDATE pnr_tickets SET pnr = ?, surname = ?, is_amadeus = ?, user_abm = ? WHERE id = ?
        `, [pnr, lastName, amadeusValue, userAbm || 'MODIFICADOR_ABM', ticketId]);

        await db.run('DELETE FROM pnr_segments WHERE ticket_id = ?', [ticketId]);

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (!seg || !seg.flight) continue;

            const direction = seg.direction;
            let sequence;

            if (direction === 'GO') {
                goCount++;
                sequence = goCount;
            } else {
                returnCount++;
                sequence = returnCount;
            }

            const currentStatus = statuses[i] || 'FREE';

            const apiString = pnrService.generateApiString(
                pnr, seg.flight, seg.class, seg.date, seg.from, seg.to, seg.rerouting, seg.type, lastName
            );

            const invoicedValue = isInvoiced ? 'YES' : 'NOT';

            await db.run(`
                INSERT INTO pnr_segments (
                    ticket_id, direction, sequence, flight, origin_from, destination_to,
                    date, time, arrival_time, flight_class, rerouting, disruption_type, is_invoiced, export_data, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticketId, direction, sequence, seg.flight, seg.from, seg.to,
                seg.date, seg.time, seg.arrivalTime || null, seg.class, seg.rerouting, seg.type, invoicedValue, apiString, currentStatus
            ]);
        }

        await db.run('COMMIT');
        return res.status(200).json({ message: 'Registro relacional actualizado de forma consistente.' });
    } catch (error) {
        await db.run('ROLLBACK');
        console.error('Error al actualizar registro relacional:', error);
        return res.status(500).json({ message: 'Error al modificar la base de datos relacional.' });
    }
};

// 4. DISRUPCIÓN SOAP
export const triggerSoapDisruption = async (req: Request, res: Response) => {
    try {
        const { exportData, disruptionData } = req.body;
        const payload = disruptionData || req.body;

        if (!payload || !payload.pnr) {
            return res.status(400).json({ message: 'Falta la información requerida de la disrupción (PNR, tipo, etc.).' });
        }

        const { result, logs } = await disruptionService.executeDisruptionWithLogs(payload);
        return res.status(200).json({ message: 'Disrupción inyectada con éxito', result, logs });
    } catch (error: any) {
        const logs = error.logs || (error.log ? [error.log] : []);
        return res.status(500).json({ message: error.message || 'Error al ejecutar disrupción SOAP', logs });
    }
};

export const checkVpnStatus = async (req: Request, res: Response) => {
  try {
    const isConnected = await disruptionService.checkVpnStatus();
    res.json({ connected: isConnected });
  } catch (error) {
    res.json({ connected: false });
  }
};

export const mockInt = async (req: Request, res: Response) => {
  const { pnr, surname } = req.body;
  try {
    const { result, log } = await disruptionService.callMockIntWithLogs(pnr, surname);
    res.json({ success: true, data: result, logs: [log] });
  } catch (error: any) {
    const logs = error.log ? [error.log] : [];
    res.status(500).json({ success: false, message: error.message, logs });
  }
};

export const mockPre = async (req: Request, res: Response) => {
  const { pnr, surname } = req.body;
  try {
    const { result, log } = await disruptionService.callMockPreWithLogs(pnr, surname);
    res.json({ success: true, data: result, logs: [log] });
  } catch (error: any) {
    const logs = error.log ? [error.log] : [];
    res.status(500).json({ success: false, message: error.message, logs });
  }
};

export const disruptionUN = async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body, disruptionType: 'UN' };
    const { result, logs } = await disruptionService.executeDisruptionWithLogs(payload);
    res.json({ success: true, message: 'Disrupción UN procesada', result, logs });
  } catch (error: any) {
    const logs = error.logs ? error.logs : (error.log ? [error.log] : []);
    res.status(500).json({ success: false, message: error.message, logs });
  }
};

export const disruptionUNTK = async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body, disruptionType: 'UNTK' };
    const { result, logs } = await disruptionService.executeDisruptionWithLogs(payload);
    res.json({ success: true, message: 'Disrupción UNTK procesada', result, logs });
  } catch (error: any) {
    const logs = error.logs ? error.logs : (error.log ? [error.log] : []);
    res.status(500).json({ success: false, message: error.message, logs });
  }
};

export const disruptionFLCH = async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body, disruptionType: 'FLCH' };
    const { result, logs } = await disruptionService.executeDisruptionWithLogs(payload);
    res.json({ success: true, message: 'Disrupción FLCH procesada', result, logs });
  } catch (error: any) {
    const logs = error.logs ? error.logs : (error.log ? [error.log] : []);
    res.status(500).json({ success: false, message: error.message, logs });
  }
};

// Generador sincrónico v2 (Con soporte Round-trip)
export const generatePnrV2 = async (req: Request, res: Response) => {
  try {
    const { origin, destination, date, returnDate, flightType, environment, firstName, surname, email, phone } = req.body;
    
    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios (origin, destination, date)' });
    }

    if (flightType === 'round-trip' && !returnDate) {
      return res.status(400).json({ error: 'Para vuelos Round-trip es obligatoria la fecha de regreso (returnDate)' });
    }

    const service = new IberiaBookingService(environment || 'INT');
    const result = await service.executeFullFlow(
      { origin, destination, date, returnDate, flightType },
      { firstName, surname, email, phone }
    );

    const mainSegment = result.flightDetails[0] || {};

    res.json({
      success: true,
      pnr: result.pnr,
      orderId: result.orderId,
      flightDetails: result.flightDetails,
      logs: result.logs,
      from: mainSegment.from || mainSegment.origin,
      to: mainSegment.to || mainSegment.destination,
      flight: mainSegment.flight || mainSegment.flightNumber,
      date: mainSegment.date,
      time: mainSegment.time || mainSegment.departureTime
    });
  } catch (error: any) {
    console.error('Error en generatePnrV2:', error);
    const logs = error.logs || [];
    res.status(500).json({ success: false, error: error.message || 'Error interno', logs });
  }
};

// Generador sincrónico específico para el flujo Round-Trip v2
// Generador sincrónico específico para el flujo Round-Trip v2
export const generateRoundTripV2 = async (req: Request, res: Response) => {
  try {
    const { 
      origin, 
      destination, 
      firstDate, 
      secondDate, 
      departureDate, // <-- Soportar variante del frontend
      returnDate,    // <-- Soportar variante del frontend
      numAdults, 
      numChilds, 
      numInfants, 
      numYouths, 
      marketCode, 
      preferredCabin, 
      voucher, 
      environment, 
      firstName, 
      surname, 
      email, 
      phone,
      passenger      // <-- Soportar objeto anidado del frontend
    } = req.body;

    // Normalizar fechas (aceptar firstDate/secondDate o departureDate/returnDate)
    const startDate = firstDate || departureDate;
    const endDate = secondDate || returnDate;

    // Normalizar datos del pasajero
    const pFirstName = firstName || passenger?.firstName;
    const pSurname = surname || passenger?.surname || passenger?.lastName;
    const pEmail = email || passenger?.email;
    const pPhone = phone || passenger?.phone;

    // Validación flexible de parámetros de entrada
    if (!origin || !destination || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Faltan parámetros obligatorios para ida y vuelta (origin, destination, firstDate/departureDate, secondDate/returnDate)' 
      });
    }

    // Instancia y ejecución del servicio RoundTripService
    const service = new RoundTripService(environment || 'INT');
    const result = await service.executeFullFlow(
      { 
        origin, 
        destination, 
        firstDate: startDate, 
        secondDate: endDate, 
        numAdults: numAdults ? Number(numAdults) : 1,
        numChilds: numChilds ? Number(numChilds) : 0,
        numInfants: numInfants ? Number(numInfants) : 0,
        numYouths: numYouths ? Number(numYouths) : 0,
        marketCode: marketCode || 'ES',
        preferredCabin: preferredCabin || 'ECONOMY',
        voucher: voucher || 'BONO10000EUR'
      },
      { 
        firstName: pFirstName, 
        surname: pSurname, 
        email: pEmail, 
        phone: pPhone 
      }
    );

    const goSegment = result.flightDetails.find(s => s.direction === 'GO') || result.flightDetails[0] || {};
    const returnSegment = result.flightDetails.find(s => s.direction === 'RETURN') || result.flightDetails[1] || {};

    return res.status(200).json({
      success: true,
      pnr: result.pnr,
      orderId: result.orderId,
      flightDetails: result.flightDetails,
      logs: result.logs,
      outbound: {
        from: goSegment.origin,
        to: goSegment.destination,
        flight: goSegment.flightNumber,
        date: goSegment.date,
        time: goSegment.departureTime,
        class: goSegment.bookingClass
      },
      inbound: {
        from: returnSegment.origin,
        to: returnSegment.destination,
        flight: returnSegment.flightNumber,
        date: returnSegment.date,
        time: returnSegment.departureTime,
        class: returnSegment.bookingClass
      }
    });
  } catch (error: any) {
    console.error('Error en generateRoundTripV2:', error);
    const logs = error.logs || [];
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno durante el flujo Round-Trip', 
      logs 
    });
  }
};

// Generador Streaming SSE v2 (Con soporte Round-trip)
export const generatePnrV2Stream = async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173'
  });

  const { origin, destination, date, returnDate, flightType, environment, firstName, surname, email, phone } = req.body;

  if (!origin || !destination || !date) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Faltan parámetros obligatorios' })}\n\n`);
    res.end();
    return;
  }

  if (flightType === 'round-trip' && !returnDate) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Para vuelos Round-trip es obligatoria la fecha de regreso (returnDate)' })}\n\n`);
    res.end();
    return;
  }

  const service = new IberiaBookingService(environment || 'INT');

  const onLog = (log: any) => {
    res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
  };

  try {
    const result = await service.executeFullFlow(
      { origin, destination, date, returnDate, flightType },
      { firstName, surname, email, phone },
      onLog
    );

    const mainSegment = result.flightDetails[0] || {};
    
    res.write(`event: success\ndata: ${JSON.stringify({
      pnr: result.pnr,
      orderId: result.orderId,
      flightDetails: result.flightDetails,
      from: result.from || mainSegment.from || mainSegment.origin,
      to: result.to || mainSegment.to || mainSegment.destination,
      flight: result.flight || mainSegment.flight || mainSegment.flightNumber,
      date: result.date || mainSegment.date,
      time: result.time || mainSegment.time || mainSegment.departureTime
    })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Error interno', logs: error.logs || [] })}\n\n`);
    res.end();
  }
};
// Generador Streaming SSE para el flujo Round-Trip v2
export const generateRoundTripV2Stream = async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173'
  });

  const { 
    origin, 
    destination, 
    firstDate, 
    secondDate, 
    numAdults, 
    marketCode, 
    preferredCabin, 
    voucher, 
    environment, 
    firstName, 
    surname, 
    email, 
    phone 
  } = req.body;

  if (!origin || !destination || !firstDate || !secondDate) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Faltan parámetros obligatorios (origin, destination, firstDate, secondDate)' })}\n\n`);
    res.end();
    return;
  }

  const service = new RoundTripService(environment || 'INT');

  const onLog = (log: any) => {
    res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
  };

  try {
    const result = await service.executeFullFlow(
      { 
        origin, 
        destination, 
        firstDate, 
        secondDate, 
        numAdults: numAdults ? Number(numAdults) : 1,
        marketCode: marketCode || 'ES',
        preferredCabin: preferredCabin || 'ECONOMY',
        voucher: voucher || 'BONO10000EUR'
      },
      { firstName, surname, email, phone },
      onLog
    );

    res.write(`event: success\ndata: ${JSON.stringify({
      pnr: result.pnr,
      orderId: result.orderId,
      flightDetails: result.flightDetails
    })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Error interno', logs: error.logs || [] })}\n\n`);
    res.end();
  }
};
