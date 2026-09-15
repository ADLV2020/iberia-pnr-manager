// src/components/views/GeneratorView.tsx

import { useState } from 'react';
import { generatePnrV2 } from '../../services/api.ts';
import ConsoleLog from '../common/ConsoleLog.tsx';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import { useVpnStatus } from '../../hooks/useVpnStatus';
import { VpnStatusBadge } from '../common/VpnStatusBadge';

interface GeneratorViewProps {
  openModal: (title: string, message: string) => void;
}

interface FlightDetails {
  origin: string;
  destination: string;
  flightNumber: string;
  date: string;        // formato DDMMYYYY
  departureTime: string; // HHMM
  arrivalTime: string;   // HHMM
  bookingClass: string;
}

// Estructura de los logs extendidos que vienen del Backend
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

// Helper para timestamp
const getCurrentTimestamp = () => new Date().toLocaleTimeString();
// const getCurrentTimestamp = () => { return new Date().toLocaleTimeString(); };

export default function GeneratorView({ openModal }: GeneratorViewProps) {

  const [form, setForm] = useState({
    origen: '',
    destino: '',
    fecha: '',
    environment: 'INT', // Entorno dinámico (PRE / INT)
    nombre: 'AUTOMATION',
    apellido: 'TEST',
    mail: 'cont.aadelavega+test01@iberia.es',
    telefono: '600100200',
  });
  
  // Guarda marcas de tiempo locales junto con el payload de logs del backend
  const [logs, setLogs] = useState<{ timestamp: string; data: BackendStepLog; msgType: 'info' | 'success' | 'error' | 'response' }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [generatedPnr, setGeneratedPnr] = useState<string | null>(null);
  const [generatedFlight, setGeneratedFlight] = useState<FlightDetails | null>(null);

  const todayISO = new Date().toISOString().split('T')[0];

  // const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast();

  const { vpnConnected } = useVpnStatus();

  /*
  const copyPnrToClipboard = async (pnr: string) => {
    try {
      await navigator.clipboard.writeText(pnr);
      setToastMessage(`✅ Código PNR ${pnr} copiado`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error al copiar:', err);
      setToastMessage('❌ No se pudo copiar el PNR');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };
  */

  // Modifica el botón copiar para que use showToast
  const handleCopyPnr = (pnr: string) => {
    showToast(`✅ Código PNR ${pnr} copiado`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Si el campo es origen o destino, convertimos a mayúsculas
    const newValue = (name === 'origen' || name === 'destino') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.origen || !form.destino || !form.fecha) {
      openModal('Campos incompletos', 'Por favor, rellena Origen, Destino y Fecha.');
      return;
    }

    setIsRunning(true);
    setGeneratedPnr(null);
    setGeneratedFlight(null);    // ← limpiar flightDetails
    setLogs([]);                 // limpiar logs anteriores
    
    // Log inicial de arranque del motor V2
    setLogs([
      {
        timestamp: getCurrentTimestamp(),
        msgType: 'info',
        data: {
          step: 'SISTEMA INYECTOR V2',
          method: 'START',
          url: 'Iniciando orquestación con retardos anti-bot...',
          success: true
        }
      }
    ]);

    const payload = {
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
      // Llamada a la API local que conecta con iberiaBooking.service.ts
      const response = await fetch('http://localhost:3000/api/v2/generate-pnr-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
                // Log de paso
                setLogs(prev => [...prev, {
                  timestamp: getCurrentTimestamp(),
                  data: data,
                  msgType: data.success ? 'success' : 'error'
                }]);
              } else if (data.pnr) {
                // Evento final exitoso
                setGeneratedPnr(data.pnr);
                setGeneratedFlight(data.flightDetails);
              } else if (data.message) {
                // Error del backend
                openModal('Error de Generación V2', data.message);
              }
            } catch (e) {
              console.error('Error parseando SSE data', e);
            }
          }
        }
      }

    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        {
          timestamp: getCurrentTimestamp(),
          msgType: 'error',
          data: {
            step: 'ERROR CRÍTICO DEL FLUJO',
            method: 'FATAL',
            url: err.message || 'Error desconocido en la cadena NDC.',
            success: false
          }
        }
      ]);
      openModal('Error de Generación V2', err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      {/* Cabecera de Título estilizada con Glassmorphism */}
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
            backgroundClip: 'text',          // Estándar W3C
            WebkitBackgroundClip: 'text',    // Motor Webkit (Chrome, Safari, Edge)
            WebkitTextFillColor: 'transparent' // Hace transparente el color base para mostrar el gradiente
          }}
        >
          🚀 Flujo NDC Iberia
        </h2>
        <p 
          style={{ 
            margin: 0, 
            color: '#4a5568', 
            fontSize: '1rem',
            fontWeight: '500',
            lineHeight: '1.5'
          }}
        >
          Sincronización de peticiones en tiempo real con retardos dinámicos anti-bot y auditoría de payloads.
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px', width: '100%' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Entorno de Red</label>
                <select name="environment" value={form.environment} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                  <option value="PRE">PRE (pre.iberia.com)</option>
                  <option value="INT">INT (int.iberia.com)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Origen (IATA)</label>
                <input 
                  type="text" 
                  name="origen" 
                  value={form.origen} 
                  onChange={handleChange} 
                  title="Código IATA del aeropuerto" 
                  placeholder="MAD" 
                  disabled={isRunning} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', textTransform: 'uppercase' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Destino (IATA)</label>
                <input 
                  type="text" 
                  name="destino" 
                  value={form.destino} 
                  onChange={handleChange} 
                  title="Código IATA del aeropuerto" 
                  placeholder="BCN" 
                  disabled={isRunning} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', textTransform: 'uppercase' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px', width: '100%' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Fecha Vuelo</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nombre Pasajero</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Apellido Pasajero</label>
                <input type="text" name="apellido" value={form.apellido} onChange={handleChange} disabled={isRunning} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
            </div>

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

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="submit" 
                style={{ background: isRunning ? '#cccccc' : '#b30000', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: isRunning ? 'not-allowed' : 'pointer', fontWeight: 'bold' }} 
                disabled={isRunning || vpnConnected !== true}
                >
                  {isRunning ? '⏳ Procesando Flujo V2...' : '✨ Generar PNR V2'}
              </button>
              <button type="button" onClick={() => setShowDetails(!showDetails)} style={{ background: '#6c757d', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {showDetails ? '📄 Ocultar Detalles' : '📄 Mostrar Detalles'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Contenedor de la Terminal de Logs (AQUÍ SE FORMATEA EL STRING DETALLADO) */}
      <div className="max-width-container">
        <ConsoleLog 
          logs={logs.map(l => ({
            timestamp: l.timestamp,
            message: l.data ? 
              `[${l.data.step}] ➔ ${l.data.method} ${l.data.url}${l.data.status ? ` (${l.data.status})` : ''}${l.data.error ? ` ❌ ${l.data.error}` : ''}` 
              : l.text || 'Procesando...',
            type: l.msgType || (l.data?.success ? 'success' : 'info')
          }))} 
          title="Terminal de Control NDC (SSE)" 
          height="400px" 
        />
        
        {/* Banner con detalles del vuelo */}
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
            <div>📍 {generatedFlight.origin} → {generatedFlight.destination}</div>
            <div>✈️ Vuelo: {generatedFlight.flightNumber}</div>
            <div>📅 Fecha: {generatedFlight.date.substring(0,2)}/{generatedFlight.date.substring(2,4)}/{generatedFlight.date.substring(4,8)}</div>
            <div>⏰ Salida: {generatedFlight.departureTime ? `${generatedFlight.departureTime.substring(0,2)}:${generatedFlight.departureTime.substring(2,4)}` : '--:--'}</div>
            <div>⏰ Llegada: {generatedFlight.arrivalTime ? `${generatedFlight.arrivalTime.substring(0,2)}:${generatedFlight.arrivalTime.substring(2,4)}` : '--:--'}</div>
            <div>🎫 Clase: {generatedFlight.bookingClass}</div>
          </div>
        )}
      </div>
      {/* Toast flotante */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#333',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          animation: 'fadeOut 3s ease-in-out',
          pointerEvents: 'none'
        }}>
          <Toast message={toastMessage} />
        </div>
      )}
      <Toast message={toastMessage} />
    </div>
  );
}
