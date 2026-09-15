// src/components/views/RegistroView.tsx

import { FlightType, Segment } from '../../types/index.ts';
import SegmentForm from '../common/SegmentForm';

interface RegistroViewProps {
  flightType: FlightType;
  pnr: string;
  lastName: string;
  setPnr: (val: string) => void;
  setLastName: (val: string) => void;
  segments: Segment[];
  onSegmentChange: (index: number, field: keyof Segment, value: any) => void;
  onAddSegment: (direction: 'GO' | 'RETURN') => void;
  // 👇 Reemplo onSubmit por dos funciones específicas
  onSubmitClear: () => void;   // Guarda y limpiar todo
  onSubmitKeep: () => void;    // Guarda y mantener (solo limpia PNR)
  isAmadeus: boolean;
  setIsAmadeus: (val: boolean) => void;
  pnrInputRef: React.RefObject<HTMLInputElement>;
}

export default function RegistroView({
  flightType,
  pnr,
  lastName,
  setPnr,
  setLastName,
  segments,
  onSegmentChange,
  onAddSegment,
  onSubmitClear,
  onSubmitKeep,
  isAmadeus,
  setIsAmadeus,
  pnrInputRef,
}: RegistroViewProps) {
  const isConnectingMode = flightType === 'connecting-one-way' || flightType === 'connecting-round-trip';
  const showReturnSection = flightType === 'round-trip' || flightType === 'connecting-round-trip';
  const goSegments = segments.filter(s => s.direction === 'GO');
  const returnSegments = segments.filter(s => s.direction === 'RETURN');

  return (
    <div>
      {/* Sección datos maestros (sin cambios) */}
      <div className="max-width-container">
        <div className="segment-box" style={{ background: '#f8f9fa' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Datos Maestros del Ticket</h4>
          <div className="row">
            <div>
              <label>Código PNR</label>
              <input type="text" ref={pnrInputRef} maxLength={5} placeholder="WX7YZ" value={pnr} onChange={(e) => setPnr(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label>Apellido Pasajero</label>
              <input type="text" placeholder="AUTOM" value={lastName} onChange={(e) => setLastName(e.target.value.toUpperCase())} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '15px' }}>
              <input type="checkbox" checked={isAmadeus} onChange={(e) => setIsAmadeus(e.target.checked)} style={{ width: 'auto' }} />
              <label style={{ margin: 0, fontWeight: 'bold' }}>Tiene Copia en Amadeus</label>
            </div>
          </div>
        </div>
      </div>

      {/* Tramos Ida (sin cambios) */}
      <div className="max-width-container">
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ color: '#fff', textShadow: '1px 1px 2px #000' }}>✈ Tramos de Ida</h4>
            {isConnectingMode && (
              <button className="btn-type" style={{ padding: '6px 16px', fontSize: '13px', background: '#0056b3', color: 'white' }} onClick={() => onAddSegment('GO')}>
                ➕ Agregar Segmento (Ida)
              </button>
            )}
          </div>
          {goSegments.map((seg, idx) => (
            <SegmentForm 
              key={idx} 
              segment={seg} 
              index={idx} 
              displayNumber={idx + 1}
              mode="edit" 
              onFieldChange={onSegmentChange} 
            />
          ))}
        </div>
      </div>

      {/* Tramos Vuelta (sin cambios) */}
      {showReturnSection && (
        <div className="max-width-container">
          <div style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#fff', textShadow: '1px 1px 2px #000' }}>🔙 Tramos de Regreso / Vuelta</h4>
              {flightType === 'connecting-round-trip' && (
                <button className="btn-type" style={{ padding: '6px 16px', fontSize: '13px', background: '#5a6268', color: 'white' }} onClick={() => onAddSegment('RETURN')}>
                  ➕ Agregar Segmento (Vuelta)
                </button>
              )}
            </div>
            {returnSegments.map((seg, idx) => (
              <SegmentForm 
                key={idx + goSegments.length}
                segment={seg} 
                index={idx + goSegments.length} 
                displayNumber={idx + 1} 
                mode="edit" 
                onFieldChange={onSegmentChange} 
              />
            ))}
          </div>
        </div>
      )}

      {/* 👇 BOTONES DIVIDIDOS */}
      <div className="max-width-container" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
        <button className="btn-submit" style={{ background: '#28a745' }} onClick={onSubmitClear}>
          🧹 Guardar y Limpiar
        </button>
        <button className="btn-submit" style={{ background: '#007bff' }} onClick={onSubmitKeep}>
          🔄 Guardar y Mantener
        </button>
      </div>
    </div>
  );
}
