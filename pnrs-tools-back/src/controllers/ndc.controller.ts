// src/controllers/ndc.controller.ts

import type { Request, Response } from 'express';
import { NdcRoundTripService } from '../services/ndc-roundtrip.service.js';
import type { CreateNdcRoundTripDto } from '../services/ndc-roundtrip.dto.js';

const ndcService = new NdcRoundTripService();

export class NdcController {
  
  /**
   * @openapi
   * /api/ndc/round-trip:
   *   post:
   *     summary: Crea una reserva NDC Round-Trip
   *     tags:
   *       - NDC Round-Trip
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               origin:
   *                 type: string
   *                 example: MAD
   *               destination:
   *                 type: string
   *                 example: BRU
   *               outboundDate:
   *                 type: string
   *                 example: 2026-05-10
   *               inboundDate:
   *                 type: string
   *                 example: 2026-05-20
   *               emailContact:
   *                 type: string
   *                 example: test@example.com
   *               phoneContact:
   *                 type: string
   *                 example: 34600000000
   *     responses:
   *       200:
   *         description: Reserva completada con éxito
   *       500:
   *         description: Error en el servicio NDC
   */
  static async createRoundTrip(req: Request, res: Response) {
    try {
      const dto: CreateNdcRoundTripDto = req.body;
      const result = await ndcService.createRoundTripBooking(dto);
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error interno procesando la reserva NDC';
      return res.status(500).json({
        status: 'ERROR',
        message: errorMessage,
      });
    }
  }
  
}
