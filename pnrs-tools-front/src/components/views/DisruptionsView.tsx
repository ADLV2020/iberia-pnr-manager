// src7components/views/DisruptionsView.tsx

import { useState, useEffect } from 'react';
import { FlightType, Segment, PnrRecord } from '../../types/index.ts';
import SegmentForm from '../common/SegmentForm.tsx';
import ConsoleLog from '../common/ConsoleLog.tsx';
import { checkVpnStatus, callMockInt, callMockPre, callDisruption } from '../../services/api.ts';
import ConfirmModal from '../common/ConfirmModal.tsx';
import RecordSelector from '../common/RecordSelector';
import { useToast } from '../../hooks/useToast.ts';
import { Toast } from '../../components/common/Toast.tsx';
import { useVpnStatus } from '../../hooks/useVpnStatus';
import { VpnStatusBadge } from '../common/VpnStatusBadge';

interface DisruptionsViewProps {
  flightType: FlightType;
  records: PnrRecord[];
  selectedId: string;
  onSelectRecord: (id: string) => void;
  pnr: string;
  lastName: string;
  segments: Segment[];
  onRefresh: () => void;
  isAmadeus: boolean;
  openModal: (title: string, message: string) => void;
}

export default function DisruptionsView({
  flightType,
  records,
  selectedId,
  onSelectRecord,
  pnr,
  lastName,
  segments,
  onRefresh,
  isAmadeus,
  openModal
}: DisruptionsViewProps) {
  // const [vpnConnected, setVpnConnected] = useState<boolean | null>(null);
  const { vpnConnected } = useVpnStatus();
  const [logs, setLogs] = useState<{ timestamp: string; message: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataPrepared, setDataPrepared] = useState(false);
  const [mockExecuted, setMockExecuted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { toastMessage, showToast } = useToast();
  
  const [prepareConfirm, setPrepareConfirm] = useState<{ isOpen: boolean; segmentIndex: number }>({ isOpen: false, segmentIndex: 0 });

  const formatBackendLog = (log: any, msgType: 'info' | 'success' | 'error' | 'response'): string => {
    let msg = `[${log.step}] ➔ Método: ${log.method}\nURL: ${log.url}\n`;
    if (log.status) msg += `STATUS HTTP: ${log.status}\n`;
    if (log.requestBody) msg += `--- REQUEST ---\n${log.requestBody}\n`;
    if (log.responseData) msg += `--- RESPONSE ---\n${log.responseData}\n`;
    if (log.error) msg += `❌ ERROR: ${log.error}\n`;
    msg += `====================================================================`;
    return msg;
  };

  const clearConsole = () => setLogs([]);

  useEffect(() => {
    setDataPrepared(false);
    setMockExecuted(false);
    setSelectedIndex(0);
  }, [selectedId]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'response' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  // Se ejecuta al hacer clic en el botón de "Preparar". 
  // Solo valida que haya un PNR y un segmento seleccionado, y abre el modal.
  const handlePrepareClick = () => {
    if (!selectedId) { // Usamos 'selectedId' que es tu variable actual
      addLog('Primero selecciona un PNR.', 'error');
      return;
    }
    
    // Suponiendo que en tu estado o componente tienes guardado el índice seleccionado como 'selectedIndex'
    const seg = segments[selectedIndex];
    if (!seg) {
      addLog('Selecciona un segmento válido.', 'error');
      return;
    }

    // Abre el modal guardando el índice del segmento que se va a procesar
    setPrepareConfirm({ isOpen: true, segmentIndex: selectedIndex });
  };

  const handlePrepare = (indexAProcesar: number) => {
    setLogs([]);
    addLog(`📋 Preparando datos para PNR: ${pnr} (${lastName})`, 'info');
    segments.forEach((seg, idx) => {
      addLog(`Segmento ${idx+1} (${seg.direction}): ${seg.from} → ${seg.to} ${seg.flight} ${seg.date}`, 'info');
    });
    const selected = segments[indexAProcesar];
    if (selected) {
      const concatenated = `${pnr};${selected.flight};${selected.class};${selected.date};${selected.from};${selected.to};${selected.rerouting};${selected.type};${lastName}`;
      addLog(`📦 Datos armados: ${concatenated}`, 'response');
    }
    setDataPrepared(true);
    addLog('✅ Datos preparados', 'success');
  };

  const doPrepare = () => {
    setLogs([]);
    addLog(`📋 Preparando datos para PNR: ${pnr} (${lastName})`, 'info');
    segments.forEach((seg, idx) => {
      addLog(`Segmento ${idx+1} (${seg.direction}): ${seg.from} → ${seg.to} ${seg.flight} ${seg.date}`, 'info');
    });
    const selected = segments[prepareConfirm.segmentIndex];
    if (selected) {
      const concatenated = `${pnr};${selected.flight};${selected.class};${selected.date};${selected.from};${selected.to};${selected.rerouting};${selected.type};${lastName}`;
      addLog(`📦 Datos armados: ${concatenated}`, 'response');
    }
    setDataPrepared(true);
    addLog('✅ Datos preparados', 'success');
    setPrepareConfirm({ isOpen: false, segmentIndex: 0 });
  };

  const handleMock = async (env: 'INT' | 'PRE') => {
    if (!selectedId) return;
    setLoading(true);
    addLog(`Iniciando Mock ${env}...`, 'info');
    try {
      const fn = env === 'INT' ? callMockInt : callMockPre;
      const response = await fn(pnr, lastName);
      
      // Procesar logs si existen
      if (response.logs && Array.isArray(response.logs)) {
        response.logs.forEach((log: any) => {
          const formatted = formatBackendLog(log, log.success ? 'success' : 'error');
          setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: formatted, type: log.success ? 'success' : 'error' }]);
        });
      }
      
      if (response.success) {
        addLog(`Mock ${env} exitoso`, 'success');
        setMockExecuted(true);
      } else {
        addLog(`Mock ${env} falló: ${response.message || 'Error desconocido'}`, 'error');
      }
    } catch (err: any) {
      addLog(`Error Mock ${env}: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisruption = async (type: 'UN' | 'UNTK' | 'FLCH') => {
    if (!selectedId) return;
    const target = segments[selectedIndex];
    if (!target) return;
    if (target.type !== type) {
      addLog(`El segmento tiene tipo "${target.type}", no coincide con ${type}`, 'error');
      return;
    }
    setLoading(true);
    addLog(`Inyectando disrupción ${type}...`, 'info');
    try {
      const body = {
        pnr,
        surname: lastName,
        flight: target.flight,
        flightClass: target.class,
        date: target.date,
        origin: target.from,
        destination: target.to,
        alternative: target.rerouting,
        disruptionType: type,
      };
      const response = await callDisruption(type, body);
      
      // Procesar logs
      if (response.logs && Array.isArray(response.logs)) {
        response.logs.forEach((log: any) => {
          const formatted = formatBackendLog(log, log.success ? 'success' : 'error');
          setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: formatted, type: log.success ? 'success' : 'error' }]);
        });
      }
      
      if (response.success) {
        addLog(`Disrupción ${type} inyectada exitosamente`, 'success');
        onRefresh();
      } else {
        addLog(`Disrupción ${type} falló: ${response.message || 'Error desconocido'}`, 'error');
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPnr = async () => {
    if (!pnr) return;
    try {
      await navigator.clipboard.writeText(pnr);
      showToast(`✅ Código PNR ${pnr} copiado`);
    } catch (err) {
      showToast('❌ No se pudo copiar el PNR');
    }
  };

  const availableTypes = [...new Set(segments.map(s => s.type).filter(t => t && ['UN','UNTK','FLCH'].includes(t)))];
  const hasUN = availableTypes.includes('UN');
  const hasUNTK = availableTypes.includes('UNTK');
  const hasFLCH = availableTypes.includes('FLCH');
  const otherTypes = segments.some(s => s.type && !['UN','UNTK','FLCH'].includes(s.type));

  const selectedSegmentType = segments[selectedIndex]?.type || '';

  const buttonGroupStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '20px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
    flexWrap: 'wrap',
  };

  const getGlassButtonStyle = (disabled: boolean = false) => ({
    padding: '10px 18px',
    borderRadius: '10px',
    border: disabled ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
    background: disabled ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'normal',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
    opacity: disabled ? 0.5 : 1,
    minWidth: '160px',
    textAlign: 'center',
  });

  return (
    <div>
      <div className="max-width-container">
        <VpnStatusBadge />
      </div>

      <div className="max-width-container">
        <div className="segment-box" style={{ borderColor: '#28a745', background: '#f4fbf6' }}>
          <RecordSelector records={records} selectedId={selectedId} onSelect={onSelectRecord} label="Seleccionar PNR para gestionar disrupción:" />
        </div>
      </div>

      {/* Datos del PNR - igual */}
      <div className="max-width-container">
        <div className="segment-box" style={{ marginTop: '20px', background: '#fff' }}>
          <h4 style={{ margin: 0, color: '#0056b3', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>
              PNR: {pnr || '—'}
            </span>
            {pnr && (
              <button
                onClick={handleCopyPnr}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0 4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#0056b3'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Copiar PNR"
              >
                📋
              </button>
            )}
            <span>&nbsp;|&nbsp; Apellido: {lastName || '—'} &nbsp;|&nbsp; Amadeus: {isAmadeus ? 'SÍ' : 'NO'}</span>
          </h4>
        </div>
      </div>

      <div className="max-width-container">
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#fff' }}>Segmentos del PNR</h4>
          {segments.map((seg, idx) => (
            <SegmentForm
              key={idx}
              segment={seg}
              index={idx}
              mode="selectable"
              isSelected={selectedIndex === idx}
              onSelect={setSelectedIndex}
            />
          ))}
        </div>
      </div>

    {/* Grupo 1: Preparación */}
    <div className="max-width-container">
      <div style={buttonGroupStyle}>
        <button 
          onClick={handlePrepareClick} 
          disabled={!selectedId || !vpnConnected} 
          style={{ ...getGlassButtonStyle(!selectedId || !vpnConnected), flex: 1 }}
          >
          📂 Preparar datos
        </button>
        <button  
          onClick={clearConsole}
          disabled={!dataPrepared}
          style={{ ...getGlassButtonStyle(!dataPrepared), flex: 1 }}
          >
          🧹 Limpiar datos
        </button>        
        <button 
          onClick={() => handleMock('INT')} 
          disabled={!dataPrepared || !vpnConnected} 
          style={{ ...getGlassButtonStyle(!dataPrepared || !vpnConnected), flex: 1 }}
          >
          🧪 Mock INT
        </button>
        <button 
          onClick={() => handleMock('PRE')} 
          disabled={!dataPrepared || !vpnConnected} 
          style={{ ...getGlassButtonStyle(!dataPrepared || !vpnConnected), flex: 1 }}
          >
          🧪 Mock PRE
        </button>
      </div>
      {/* Grupo 2: Disrupciones */}
      <div style={buttonGroupStyle}>
        <button 
          onClick={() => handleDisruption('UN')} 
          disabled={!mockExecuted || !vpnConnected || selectedSegmentType !== 'UN'} 
          style={{ ...getGlassButtonStyle(!mockExecuted || !vpnConnected || selectedSegmentType !== 'UN'), flex: 1 }}
          >
            ⚡ UN
        </button>
        <button 
          onClick={() => handleDisruption('UNTK')} 
          disabled={!mockExecuted || !vpnConnected || selectedSegmentType !== 'UNTK'} 
          style={{ ...getGlassButtonStyle(!mockExecuted || !vpnConnected || selectedSegmentType !== 'UNTK'), flex: 1 }}
          >
            ⚡ UNTK
        </button>
        <button 
          onClick={() => handleDisruption('FLCH')} 
          disabled={!mockExecuted || !vpnConnected || selectedSegmentType !== 'FLCH'} 
          style={{ ...getGlassButtonStyle(!mockExecuted || !vpnConnected || selectedSegmentType !== 'FLCH'), flex: 1 }}
          >
            ⚡ FLCH
        </button>
      </div>
      {otherTypes && 
      <div style={{ color: '#856404', background: '#fff3cd', padding: '8px', marginTop: '10px', textAlign: 'center' }}>
        ⚠️ Tipos diferentes a UN/UNTK/FLCH deben gestionarse manualmente.
      </div>}
      <ConsoleLog logs={logs} title="Terminal de Disrupciones" />
      </div>
      <ConfirmModal
        isOpen={prepareConfirm.isOpen}
        title="Confirmar preparación de datos"
        message={`Se procederá a preparar datos para:\n${segments[prepareConfirm.segmentIndex]?.direction === 'GO' ? 'IDA' : 'VUELTA'} 
        SEGMENTO ${prepareConfirm.segmentIndex + 1}\nOrigen ${segments[prepareConfirm.segmentIndex]?.from} 
        y Destino ${segments[prepareConfirm.segmentIndex]?.to}\n
        Confirma la selección?`}
        onConfirm={doPrepare}
        onCancel={() => setPrepareConfirm({ isOpen: false, segmentIndex: 0 })}
      />
      <Toast message={toastMessage} />
    </div>
  );
}
