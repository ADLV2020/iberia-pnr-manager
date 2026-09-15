// src/components/common/SegmentForm.tsx

import { Segment } from '../../types/index.ts';
import { formatVisualTime } from '../../utils/formatters.ts';
import { formatDateToIso, formatDateToDdmmaaaa } from '../../utils/dateUtils.ts';

interface SegmentFormProps {
  segment: Segment;
  index: number;
  mode: 'readonly' | 'edit' | 'selectable';
  onFieldChange?: (index: number, field: keyof Segment, value: any) => void;
  onSelect?: (index: number) => void;
  isSelected?: boolean;
  statusOptions?: string[];
  displayNumber?: number;
}

export default function SegmentForm({
  segment,
  index,
  mode,
  onFieldChange,
  onSelect,
  isSelected = false,
  statusOptions = [],
  displayNumber,
}: SegmentFormProps) {
  const handleChange = (field: keyof Segment, value: any) => {
    if (onFieldChange) onFieldChange(index, field, value);
  };

  const title = `${segment.direction === 'GO' ? '✈ IDA' : '🔙 VUELTA'} Segmento ${displayNumber !== undefined ? displayNumber : index + 1}`;

  if (mode === 'readonly') {
    return (
      <div className="segment-box" style={{ marginTop: '15px', borderLeft: segment.direction === 'GO' ? '5px solid #0056b3' : '5px solid #5a6268' }}>
        <h5 style={{ margin: '0 0 10px 0', color: segment.direction === 'GO' ? '#0056b3' : '#333' }}>{title}</h5>
        <div className="row">
          <div><strong>Origen:</strong> {segment.from || '—'}</div>
          <div><strong>Destino:</strong> {segment.to || '—'}</div>
          <div><strong>Vuelo:</strong> {segment.flight || '—'}</div>
        </div>
        <div className="row" style={{ marginTop: '10px' }}>
          <div><strong>Fecha:</strong> {segment.date || '—'}</div>
          <div><strong>Hora salida:</strong> {segment.time || '—'}</div>
          <div><strong>Hora arribo: {segment.arrivalTime ? `${segment.arrivalTime.substring(0,2)}:${segment.arrivalTime.substring(2,4)}` : 'N/A'}</strong> {segment.arrivalTime || '—'}</div>
        </div>
        <div className="row" style={{ marginTop: '10px' }}>
          <div><strong>Clase:</strong> {segment.class || '—'}</div>
          <div><strong>Alternativa:</strong> {segment.rerouting || '—'}</div>
          <div><strong>Tipo Disrupción:</strong> {segment.type || '—'}</div>
        </div>
        <div className="row" style={{ marginTop: '10px' }}>
          <div><strong>Facturado:</strong> {segment.isInvoiced ? 'Sí' : 'No'}</div>
          {segment.status && <div><strong>Estado:</strong> {segment.status}</div>}
        </div>
      </div>
    );
  }

  const isEdit = mode === 'edit';
  const isSelectable = mode === 'selectable';
  const flightCleanNumber = segment.flight ? segment.flight.replace('IB', '') : '';

  return (
    <div className="segment-box" style={{ marginTop: '15px', borderLeft: segment.direction === 'GO' ? '5px solid #0056b3' : '5px solid #5a6268' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h5 style={{ margin: 0, color: segment.direction === 'GO' ? '#0056b3' : '#333', fontSize: '15px' }}>{title}</h5>
        {isSelectable && onSelect && (
          <label className="custom-radio" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="selectedSegment"
              checked={isSelected}
              onChange={() => onSelect(index)}
              style={{ display: 'none' }} // ocultamos el nativo
            />
            <span className="radio-custom" style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? '2px solid #28a745' : '2px solid #ffc107', background: isSelected ? '#28a745' : 'rgba(0,0,0,0.3)', display: 'inline-block', position: 'relative' }}>
              {isSelected && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '12px' }}>✓</span>}
            </span>
            <span>Seleccionar segmento</span>
          </label>
        )}
        {isEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input type="checkbox" checked={segment.isInvoiced} onChange={(e) => handleChange('isInvoiced', e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
            <label style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Tramo Facturado</label>
          </div>
        )}
      </div>

      <div className="row">
        <div><label>Origen</label><input type="text" maxLength={3} value={segment.from} onChange={(e) => handleChange('from', e.target.value.toUpperCase())} disabled={isSelectable} /></div>
        <div><label>Destino</label><input type="text" maxLength={3} value={segment.to} onChange={(e) => handleChange('to', e.target.value.toUpperCase())} disabled={isSelectable} /></div>
        <div>
          <label>Vuelo</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#e9ecef', borderRadius: '4px', border: '1px solid #ccc' }}>
            <span style={{ padding: '0 10px', fontWeight: 'bold' }}>IB</span>
            <input
              type="text"
              placeholder="0452"
              value={flightCleanNumber}
              onChange={(e) => {
                let digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                handleChange('flight', digits);
              }}
              onBlur={(e) => {
                if (e.target.value) handleChange('flight', e.target.value.padStart(4, '0'));
              }}
              style={{ border: 'none', background: 'transparent', width: '100%' }}
              disabled={isSelectable}
            />
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: '10px' }}>
        <div><label>Fecha</label><input type="date" value={formatDateToIso(segment.date)} onChange={(e) => handleChange('date', formatDateToDdmmaaaa(e.target.value))} disabled={isSelectable} /></div>
        <div><label>Hora salida</label><input type="text" placeholder="12:45" value={formatVisualTime(segment.time)} onChange={(e) => handleChange('time', e.target.value.replace(/:/g, ''))} disabled={isSelectable} /></div>
        <div><label>Hora arribo</label><input type="text" placeholder="15:30" value={formatVisualTime(segment.arrivalTime)} onChange={(e) => handleChange('arrivalTime', e.target.value.replace(/:/g, ''))} disabled={isSelectable} /></div>
      </div>

      <div className="disruption-box" style={{ marginTop: '12px' }}>
        <p className="disruption-title">Información Host & Rerouting</p>
        <div className="row">
          <div><label>Clase</label><input type="text" maxLength={1} value={segment.class} onChange={(e) => handleChange('class', e.target.value.toUpperCase())} disabled={isSelectable} /></div>
          <div><label>Alternativa (Rerouting)</label><input type="text" maxLength={4} value={segment.rerouting} onChange={(e) => handleChange('rerouting', e.target.value)} disabled={isSelectable} /></div>
          <div><label>Tipo Disrupción</label><input type="text" maxLength={4} value={segment.type} onChange={(e) => handleChange('type', e.target.value.toUpperCase())} disabled={isSelectable} /></div>
        </div>
      </div>

      {isEdit && segment.status !== undefined && (
        <div className="row" style={{ marginTop: '10px' }}>
          <div>
            <label>Estado</label>
            <select value={segment.status} onChange={(e) => handleChange('status', e.target.value)}>
              {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
