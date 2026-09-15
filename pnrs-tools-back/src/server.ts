// src/server.ts

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import express from 'express';
import cors from 'cors';
import { getDatabase } from './storage/database.js';
import { 
  getRecords, saveRecord, updateRecord, triggerSoapDisruption,
  checkVpnStatus, mockInt, mockPre, disruptionUN, disruptionUNTK, disruptionFLCH,
  generatePnrV2, generatePnrV2Stream, generateRoundTripV2, generateRoundTripV2Stream
} from './controllers/pnr.controller.js';
import { NdcController } from './controllers/ndc.controller.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const LOCAL_IP = process.env.LOCAL_IP || 'localhost';

// -------------------------------------------------------------
// CONFIGURACIÓN DE LISTA BLANCA DE IPS (SECURITY MIDDLEWARE)
// -------------------------------------------------------------
// Convertimos la lista del .env en un Array
const envAllowedIps = process.env.ALLOWED_IPS 
  ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) 
  : [];

// Malla básica de IPs seguras por defecto (Localhost + IP Local configurada)
const defaultAllowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', LOCAL_IP];

const allowedIpsList = Array.from(new Set([...defaultAllowedIps, ...envAllowedIps]));

// Middleware de Control de Acceso por IP
app.use((req, res, next) => {
  // NGROK o proxies reenvían la IP real en 'x-forwarded-for'
  const rawClientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '';
  
  // Limpiamos el prefijo de IPv6 que asigna Node en Windows (ej: ::ffff:192.168.1.136 -> 192.168.1.136)
  const clientIp = rawClientIp.replace(/^::ffff:/, '');

  const isAllowed = allowedIpsList.some(ip => ip === clientIp || ip === rawClientIp);

  if (isAllowed) {
    return next();
  }

  console.warn(`🚨 [FIREWALL INT] Acceso denegado a IP no autorizada: ${clientIp} (${req.method} ${req.url})`);
  return res.status(403).json({
    status: 'FORBIDDEN',
    message: `Acceso denegado. La IP [${clientIp}] no está autorizada en la Lista Blanca.`,
  });
});

// Configuración CORS dinámica
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Endpoints
app.get('/api/records/:type', getRecords);
app.post('/api/save', saveRecord);
app.put('/api/update', updateRecord);
app.post('/api/inject-disruption', triggerSoapDisruption);
app.get('/api/vpn-status', checkVpnStatus);
app.post('/api/disruption/mock-int', mockInt);
app.post('/api/disruption/mock-pre', mockPre);
app.post('/api/disruption/un', disruptionUN);
app.post('/api/disruption/untk', disruptionUNTK);
app.post('/api/disruption/flch', disruptionFLCH);
app.post('/api/v2/generate-pnr', generatePnrV2);
app.post('/api/v2/generate-pnr-stream', generatePnrV2Stream);
app.post('/api/ndc/round-trip', generateRoundTripV2);
app.post('/api/ndc/round-trip-stream', generateRoundTripV2Stream);

// Inicialización del servidor
const startServer = async () => {
  try {
    await getDatabase();
    console.log('📦 Base de Datos SQLite inicializada correctamente.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend corriendo en:            http://localhost:${PORT}`);
      console.log(`📡 Accesible en Red Local Wi-Fi:    http://${LOCAL_IP}:${PORT}`);
      console.log(`🛡️  IPs Autorizadas en Whitelist:    [${allowedIpsList.join(', ')}]`);
    });
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor y la base de datos:', error);
    process.exit(1);
  }
};

// Swagger UI Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Automatización de PNRs - Iberia NDC',
      version: '2.0.0',
      description: 'Portal de desarrollo para la inyección de disrupciones y generación automática de flujos de compra en entornos PRE e INT.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Entorno Localhost',
      },
      {
        url: `http://${LOCAL_IP}:${PORT}`,
        description: 'Entorno Red Local Wi-Fi',
      },
    ],
  },
  apis: ['./src/server.js', './src/controllers/*.js', './dist/server.js', './dist/controllers/*.js'], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);

startServer();
