// src/components/views/AbmView.tsx

import { useState, useEffect } from 'react';
import { FlightType, Segment, PnrRecord } from '../../types/index.ts';
import SegmentForm from '../common/SegmentForm';
import RecordSelector from '../common/RecordSelector';
import { useToast } from '../../hooks/useToast.ts';
import { Toast } from '../../components/common/Toast.tsx';

interface AbmViewProps {
  flightType: FlightType;
  records: PnrRecord[];
  selectedId: string;
  onSelectRecord: (id: string) => void;
  pnr: string;
  lastName: string;
  segments: Segment[];
  onSegmentChange: (index: number, field: keyof Segment, value: any) => void;
  onSave: (statuses: string[]) => void;
  isAmadeus: boolean;
  statusOptions: string[];
  isEditing: boolean;
  hasUnsaved: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onHasUnsavedChange: (value: boolean) => void;
  openModal: (title: string, message: string) => void;
}

export default function AbmView({
  flightType,
  records,
  selectedId,
  onSelectRecord,
  pnr,
  lastName,
  segments,
  onSegmentChange,
  onSave,
  isAmadeus,
  statusOptions,
  isEditing,
  hasUnsaved,
  onEdit,
  onCancel,
  onHasUnsavedChange,
  openModal
}: AbmViewProps) {

  const { toastMessage, showToast } = useToast();

  useEffect(() => {
  }, [selectedId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved]);

  const handleFieldChange = (index: number, field: keyof Segment, value: any) => {
    onSegmentChange(index, field, value);
    onHasUnsavedChange(true);
  };

  const handleSave = () => {
    const statuses = segments.map(s => s.status || 'FREE');
    onSave(statuses);
    onHasUnsavedChange(false);
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

  const isRoundTrip = flightType === 'round-trip' || flightType === 'connecting-round-trip';
  const goSegments = segments.filter(s => s.direction === 'GO');
  const returnSegments = segments.filter(s => s.direction === 'RETURN');

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
      {/* Selector de registros - igual */}
      <div className="max-width-container">
        <div className="segment-box" style={{ borderColor: '#0056b3', background: '#f0f7ff' }}>
          <RecordSelector records={records} selectedId={selectedId} onSelect={onSelectRecord} label="Seleccionar Registro:" />
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

      {/* Segmentos - igual */}
      <div className="max-width-container">
        <div style={{ marginTop: '25px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>✈ Tramos de Ida</h4>
          {goSegments.map((seg, idx) => (
            <SegmentForm
              key={idx}
              segment={seg}
            index={idx}
            displayNumber={idx + 1}
            mode={isEditing ? 'edit' : 'readonly'}
            onFieldChange={handleFieldChange}
            statusOptions={statusOptions}
          />
        ))}
        </div>

      {isRoundTrip && (
      <div className="max-width-container">
        <div style={{ marginTop: '25px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>🔙 Tramos de Vuelta</h4>
          {returnSegments.map((seg, idx) => (
            <SegmentForm
              key={idx + goSegments.length}
              segment={seg}
              index={idx + goSegments.length}
              displayNumber={idx + 1}
              mode={isEditing ? 'edit' : 'readonly'}
              onFieldChange={handleFieldChange}
              statusOptions={statusOptions}
            />
          ))}
        </div>
      </div>
      )}

      {/*ª Botones con estilo glass */}
        <div className="max-width-container">
          <div style={buttonGroupStyle}>
            {!isEditing ? (
              <button style={getGlassButtonStyle(!selectedId)} onClick={onEdit} disabled={!selectedId}>
                ✏️ EDITAR PNR
              </button>
            ) : (
              <button style={getGlassButtonStyle(false)} onClick={onCancel}>
                ❌ Cancelar Edición
              </button>
            )}
            <button style={getGlassButtonStyle(!selectedId || !isEditing)} onClick={handleSave} disabled={!selectedId || !isEditing}>
              💾 GUARDAR PNR
            </button>
          </div>
        </div>
      <Toast message={toastMessage} />
    </div>
  </div>
  );
}
