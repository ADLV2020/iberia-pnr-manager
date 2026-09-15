// src/components/views/GeneratorView.tsx

import { useState } from 'react';
import ConsoleLog from '../common/ConsoleLog.tsx';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import { useVpnStatus } from '../../hooks/useVpnStatus';
import { VpnStatusBadge } from '../common/VpnStatusBadge';
import FlightTypeSelector from '../common/FlightTypeSelector';
import { FlightType } from '../../types/index.ts';

interface GeneratorViewProps {
  openModal: (title: string, message: string) => void;
  flightType?: FlightType;
  setFlightType?: (type: FlightType) => void;
}

interface FlightDetails {
  origin: string;
  destination: string;
  flightNumber: string;
  date: string;          
  returnDate?: string;    
  returnFlightNumber?: string;
  departureTime: string; 
  arrivalTime: string;   
  bookingClass: string;
}

interface BackendStepLog {
  step: string;
  method: string;
  url: string;
  requestBody?: string;
  status?: number;
  success: boolean;
  error?: string;
  responseData?: string;
}

const getCurrentTimestamp = () => new Date().toLocaleTimeString();

export default function GeneratorView({ openModal, flightType: externalFlightType, setFlightType: externalSetFlightType }: GeneratorViewProps) {
  const [internalFlightType, setInternalFlightType] = useState<FlightType>('one-way');
  const currentFlightType = externalFlightType || internalFlightType;
  const handleSetFlightType = externalSetFlightType || setInternalFlightType;

  const [form, setForm] = useState({
    origen: '',
    destino: '',
    fecha: '',
    fechaRegreso: '',
    environment: 'INT',
    nombre: 'AUTOMATION',
    apellido: 'TEST',
    mail: 'cont.aadelavega+test01@iberia.es',
    telefono: '600100200',
  });
  
  const [logs, setLogs] = useState<{ 
    timestamp: string; 
    data: BackendStepLog; 
    msgType: 'info' | 'success' | 'error' | 'response' 
  }[]>([]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [generatedPnr, setGeneratedPnr] = useState<string | null>(null);
  const [generatedFlight, setGeneratedFlight] = useState<FlightDetails | null>(null);

  const { toastMessage, showToast } = useToast();
  const { vpnConnected } = useVpnStatus();

  const handleCopyPnr = (pnr: string) => {
    showToast(`✅ Código PNR ${pnr} copiado`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newValue = (name === 'origen' || name === 'destino') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones iniciales
    if (!form.origen || !form.destino || !form.fecha) {
      openModal('Campos incompletos', 'Por favor, rellena Origen, Destino y Fecha.');
      return;
    }

    if (currentFlightType === 'round-trip' && !form.fechaRegreso) {
      openModal('Campos incompletos', 'Por favor, selecciona una Fecha de Regreso para la reserva Ida y Vuelta.');
      return;
    }

    setIsRunning(true);
    setGeneratedPnr(null);
    setGeneratedFlight(null);
    setLogs([]);

    // ------------------------------------------------------------------
    // FLUJO 1: IDA Y VUELTA -> /api/ndc/round-trip (NdcController)
    // ------------------------------------------------------------------
    if (currentFlightType === 'round-trip') {
      setLogs([
        {
          timestamp: getCurrentTimestamp(),
          msgType: 'info',
          data: {
            step: 'NDC ROUND TRIP SERVICE',
            method: 'POST',
            url: '/api/ndc/round-trip',
            success: true
          }
        }
      ]);

      const roundTripPayload = {
        origin: form.origen,
        destination: form.destino,
        departureDate: form.fecha,
        returnDate: form.fechaRegreso,
        environment: form.environment,
        passenger: {
          firstName: form.nombre,
          lastName: form.apellido,
          email: form.mail,
          phone: form.telefono
        }
      };

      try {
        const response = await fetch('http://localhost:3000/api/ndc/round-trip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roundTripPayload)
        });

        const data = await response.json();

        if (!response.ok || data.status === 'ERROR') {
          throw new Error(data.message || 'Error en el servicio Round-Trip NDC');
        }

        // Registro de log de respuesta
        setLogs(prev => [
          ...prev,
          {
            timestamp: getCurrentTimestamp(),
            msgType: 'success',
            data: {
              step: 'ROUND TRIP GENERATED',
              method: 'RESPONSE',
              url: `PNR: ${data.pnr || data.bookingReference || 'CREADO'}`,
              status: response.status,
              success: true
            }
          }
        ]);

        setGeneratedPnr(data.pnr || data.bookingReference || 'OK');
        setGeneratedFlight({
          origin: form.origen,
          destination: form.destino,
          flightNumber: data.flightNumber || 'IB-RT',
          date: form.fecha,
          returnDate: form.fechaRegreso,
          departureTime: data.departureTime || '0900',
          arrivalTime: data.arrivalTime || '1100',
          bookingClass: data.bookingClass || 'Y'
        });

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al procesar reserva de Ida y Vuelta';
        setLogs(prev => [
          ...prev,
          {
            timestamp: getCurrentTimestamp(),
            msgType: 'error',
            data: {
              step: 'ERROR ROUND TRIP',
              method: 'FATAL',
              url: errorMessage,
              success: false
            }
          }
        ]);
        openModal('Error de Generación Ida y Vuelta', errorMessage);
      } finally {
        setIsRunning(false);
      }

      return;
    }

    // ------------------------------------------------------------------
    // FLUJO 2: SOLO IDA -> /api/v2/generate-pnr-stream (SSE)
    // ------------------------------------------------------------------
    setLogs([
      {
        timestamp: getCurrentTimestamp(),
        msgType: 'info',
        data: {
          step: 'SISTEMA INYECTOR V2',
          method: 'START',
          url: 'Iniciando orquestación PNR (SOLO IDA)...',
          success: true
        }
      }
    ]);

    const oneWayPayload = {
      flightType: 'one-way',
      origin: form.origen,
      destination: form.destino,
      date: form.fecha,
      environment: form.environment,
      firstName: form.nombre,
      surname: form.apellido,
      email: form.mail,
      phone: form.telefono
    };

    try {
      const response = await fetch('http://localhost:3000/api/v2/generate-pnr-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oneWayPayload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.step) {
                setLogs(prev => [...prev, {
                  timestamp: getCurrentTimestamp(),
                  data: data,
                  msgType: data.success ? 'success' : 'error'
                }]);
              } else if (data.pnr) {
                //setGeneratedPnr(data.pnr);
                //setGeneratedFlight(data.flightDetails);
                setGeneratedPnr(data.pnr);
  
                // Extraemos el primer tramo si data.flightDetails es un Array
                const mainSegment = Array.isArray(data.flightDetails) ? data.flightDetails[0] : data.flightDetails;

                setGeneratedFlight({
                  origin: mainSegment?.origin || mainSegment?.from || form.origen,
                  destination: mainSegment?.destination || mainSegment?.to || form.destino,
                  flightNumber: mainSegment?.flightNumber || mainSegment?.flight || 'IB-ONEWAY',
                  date: mainSegment?.date || form.fecha,
                  departureTime: mainSegment?.departureTime || mainSegment?.time || '0900',
                  arrivalTime: mainSegment?.arrivalTime || '1100',
                  bookingClass: mainSegment?.bookingClass || 'Y'
                });
              } else if (data.message) {
                openModal('Error de Generación V2', data.message);
              }
            } catch (e) {
              console.error('Error parseando SSE data', e);
            }
          }
        }
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error en la conexión con el inyector V2';
      setLogs(prev => [
        ...prev,
        {
          timestamp: getCurrentTimestamp(),
          msgType: 'error',
          data: {
            step: 'ERROR CRÍTICO DEL FLUJO',
            method: 'FATAL',
            url: errorMessage,
            success: false
          }
        }
      ]);
      openModal('Error de Generación V2', errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      {/* Selector de Tipo de Vuelo (Solo Ida / Ida y Vuelta) */}
      <FlightTypeSelector
        flightType={currentFlightType}
        setFlightType={handleSetFlightType}
        allowedTypes={['one-way', 'round-trip']}
      />

      {/* Cabecera */}
      <div 
        className="max-width-container" 
        style={{ 
          margin: '20px auto 30px auto', 
          width: '100%',
          boxSizing: 'border-box',
          padding: '25px 30px',
          background: 'rgba(255, 255, 255, 0.45)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', 
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(179, 0, 0, 0.08)', 
          textAlign: 'center'
        }}
      >
        <h2 
          style={{ 
            margin: '0 0 10px 0',
            fontSize: '2rem',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #b30000 0%, #7a0000 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          🚀 Flujo NDC Iberia ({currentFlightType === 'round-trip' ? 'Ida y Vuelta' : 'Solo Ida'})
        </h2>
        <p style={{ margin: 0, color: '#4a5568', fontSize: '1rem', fontWeight: '500', lineHeight: '1.5' }}>
          {currentFlightType === 'round-trip' 
            ? 'Generación de PNR combinada mediante NdcRoundTripService.' 
            : 'Sincronización de peticiones en tiempo real mediante orquestador SSE.'}
        </p>
      </div>

      {/* Indicador VPN */}
      <div className="max-width-container">
        <VpnStatusBadge />
      </div>

      {/* Formulario */}
      <div className="max-width-container" style={{ margin: '0 auto', width: '100%' }}>
        <div className="card form-card" style={{ background: '#f9f9f9', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            
            {/* Fila 1: Entorno, Origen y Destino */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px', width: '100%' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Entorno de Red</label>
                <select name="environment" value={form.environment} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                  <option value="PRE">PRE (pre.iberia.com)</option>
                  <option value="INT">INT (int.iberia.com)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Origen (IATA) {currentFlightType === 'round-trip' && <small style={{ color: '#666', fontWeight: 'normal' }}>(Destino vuelta)</small>}
                </label>
                <input 
                  type="text" 
                  name="origen" 
                  value={form.origen} 
                  onChange={handleChange} 
                  placeholder="MAD" 
                  disabled={isRunning} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', textTransform: 'uppercase' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Destino (IATA) {currentFlightType === 'round-trip' && <small style={{ color: '#666', fontWeight: 'normal' }}>(Origen vuelta)</small>}
                </label>
                <input 
                  type="text" 
                  name="destino" 
                  value={form.destino} 
                  onChange={handleChange} 
                  placeholder="BCN" 
                  disabled={isRunning} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', textTransform: 'uppercase' }} 
                />
              </div>
            </div>

            {/* Fila 2: Fechas y Pasajero */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: currentFlightType === 'round-trip' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', 
              gap: '15px', 
              marginBottom: '15px', 
              width: '100%' 
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  {currentFlightType === 'round-trip' ? 'Fecha Ida' : 'Fecha Vuelo'}
                </label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>

              {currentFlightType === 'round-trip' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Fecha Regreso</label>
                  <input type="date" name="fechaRegreso" value={form.fechaRegreso} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nombre Pasajero</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Apellido Pasajero</label>
                <input type="text" name="apellido" value={form.apellido} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Fila 3: Email y Teléfono */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', width: '100%' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email Contacto</label>
                <input type="email" name="mail" value={form.mail} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Teléfono Móvil</label>
                <input type="text" name="telefono" value={form.telefono} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Panel de Detalles / Preview del Payload */}
            {showDetails && (
              <div style={{ padding: '15px', background: '#eef2f7', borderRadius: '6px', marginBottom: '20px', fontSize: '0.85rem' }}>
                <strong>📌 Endpoint & Payload Configurado:</strong>
                <pre style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {currentFlightType === 'round-trip'
                    ? `POST /api/ndc/round-trip\n` + JSON.stringify({
                        origin: form.origen,
                        destination: form.destino,
                        departureDate: form.fecha,
                        returnDate: form.fechaRegreso,
                        environment: form.environment,
                        passenger: { firstName: form.nombre, lastName: form.apellido, email: form.mail, phone: form.telefono }
                      }, null, 2)
                    : `POST /api/v2/generate-pnr-stream\n` + JSON.stringify({
                        flightType: 'one-way',
                        origin: form.origen,
                        destination: form.destino,
                        date: form.fecha,
                        environment: form.environment,
                        firstName: form.nombre,
                        surname: form.apellido,
                        email: form.mail,
                        phone: form.telefono
                      }, null, 2)
                  }
                </pre>
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="submit" 
                style={{ background: isRunning ? '#cccccc' : '#b30000', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: isRunning ? 'not-allowed' : 'pointer', fontWeight: 'bold' }} 
                disabled={isRunning || vpnConnected !== true}
              >
                {isRunning ? '⏳ Procesando PNR...' : '✨ Generar PNR V2'}
              </button>
              <button type="button" onClick={() => setShowDetails(!showDetails)} style={{ background: '#6c757d', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {showDetails ? '📄 Ocultar Detalles' : '📄 Mostrar Detalles'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Terminal de Logs */}
      <div className="max-width-container">
        <ConsoleLog 
          logs={logs.map(l => ({
            timestamp: l.timestamp,
            message: `[${l.data.step}] ➔ ${l.data.method} ${l.data.url}${l.data.status ? ` (${l.data.status})` : ''}${l.data.error ? ` ❌ ${l.data.error}` : ''}`,
            type: l.msgType || (l.data.success ? 'success' : 'info')
          }))} 
          title="Terminal de Control NDC" 
          height="400px" 
        />
        
        {/* Banner PNR Resultante */}
        {generatedPnr && generatedFlight && (
          <div style={{ textAlign: 'center', marginTop: '15px', padding: '15px', background: '#e6f4ea', border: '1px solid #137333', borderRadius: '4px', color: '#137333', fontWeight: 'bold' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
              <span>🎉 PNR GENERADO EXITOSAMENTE: {generatedPnr}</span>
              <button 
                onClick={() => handleCopyPnr(generatedPnr)}
                style={{
                  background: '#137333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
                title="Copiar PNR al portapapeles"
              >
                📋 Copiar
              </button>
            </div>
            <div>📍 {generatedFlight.origin} {currentFlightType === 'round-trip' ? '↔' : '→'} {generatedFlight.destination}</div>
            <div>✈️ Vuelo: {generatedFlight.flightNumber}</div>
            <div>📅 Fecha Ida: {generatedFlight.date}</div>
            {generatedFlight.returnDate && <div>📅 Fecha Regreso: {generatedFlight.returnDate}</div>}
          </div>
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}