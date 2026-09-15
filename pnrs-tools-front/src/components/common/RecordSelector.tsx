// src/components/common/RecordSelector.tsx

import { PnrRecord } from '../../types/index.ts';

interface RecordSelectorProps {
  records: PnrRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  label?: string;
}

export default function RecordSelector({ records, selectedId, onSelect, label = 'Seleccionar Registro:' }: RecordSelectorProps) {
  const getRecordDisplay = (record: PnrRecord) => {
    const pnr = record.parts[1];
    const surname = record.parts[2];
    const date = record.rawSegments?.[0]?.date || 'sin fecha';
    const status = record.rawSegments?.[0]?.status || 'FREE';
    return `ID: ${record.id} - PNR: ${pnr} - PAX: ${surname} - FECHA: ${date} - ESTADO: ${status}`;
  };

  return (
    <div className="segment-box" style={{ borderColor: '#0056b3', background: '#f0f7ff' }}>
      <label style={{ marginTop: 0, color: '#0056b3' }}>{label}</label>
      <select value={selectedId} onChange={(e) => onSelect(e.target.value)} style={{ marginTop: '5px', width: '100%' }}>
        <option value="">-- Elige un registro --</option>
        {records.map(record => (
          <option key={record.id} value={record.id}>
            {getRecordDisplay(record)}
          </option>
        ))}
      </select>
    </div>
  );
}
