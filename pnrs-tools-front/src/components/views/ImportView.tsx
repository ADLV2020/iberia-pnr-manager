// src/components/views/ImportView.tsx

import { useState } from 'react';
import { saveRecord } from '../../services/api';
import ConsoleLog from '../common/ConsoleLog';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../common/Toast';

interface ImportViewProps {
  openModal: (title: string, message: string) => void;
}

type CsvField = 
  | 'pnr' | 'surname' | 'origin' | 'destination' | 'flight' 
  | 'date' | 'departureTime' | 'arrivalTime' | 'bookingClass' 
  | 'rerouting' | 'disruptionType';

const fieldLabels: Record<CsvField, string> = {
  pnr: 'PNR',
  surname: 'Apellido',
  origin: 'Origen',
  destination: 'Destino',
  flight: 'Vuelo',
  date: 'Fecha',
  departureTime: 'Hora Salida',
  arrivalTime: 'Hora Llegada',
  bookingClass: 'Clase',
  rerouting: 'Alternativa',
  disruptionType: 'Tipo Disrupción',
};

const fieldDefaults: Partial<Record<CsvField, string>> = {
  departureTime: '0000',
  arrivalTime: '0000',
  bookingClass: '',
  rerouting: '',
  disruptionType: '',
};

// Validaciones
const validateField = (field: CsvField, value: string): string | null => {
  if (field === 'pnr') {
    if (!value || value.length < 4 || value.length > 5 || !/^[A-Z0-9]{4,5}$/.test(value))
      return 'PNR debe tener 4-5 caracteres alfanuméricos';
  }
  if (field === 'surname') {
    if (!value || value.length < 2 || value.length > 30 || !/^[A-Za-z]{2,30}$/.test(value))
      return 'Apellido solo letras, 2-30 caracteres';
  }
  if (field === 'origin' || field === 'destination') {
    if (!value || !/^[A-Z]{3}$/.test(value))
      return `${field === 'origin' ? 'Origen' : 'Destino'} debe ser 3 letras mayúsculas`;
  }
  if (field === 'flight') {
    if (!value || !/^\d{3,4}$/.test(value))
      return 'Vuelo debe ser 3-4 dígitos';
  }
  if (field === 'date') {
    if (!value) return 'Fecha es obligatoria';
  }
  if (field === 'departureTime' || field === 'arrivalTime') {
    if (value && !/^\d{4}$/.test(value)) return `${fieldLabels[field]} debe ser 4 dígitos (HHMM)`;
  }
  if (field === 'bookingClass') {
    if (value && !/^[A-Z]{1}$/.test(value)) return 'Clase debe ser 1 letra mayúscula';
  }
  if (field === 'rerouting') {
    if (value && !/^\d{3,4}$/.test(value)) return 'Alternativa debe ser 3-4 dígitos';
  }
  if (field === 'disruptionType') {
    if (value && !/^[A-Z]{2,4}$/.test(value)) return 'Tipo disrupción debe ser 2-4 letras mayúsculas';
  }
  return null;
};

function normalizeDate(dateStr: string): string {
  const cleaned = dateStr.trim().replace(/[-/]/g, '');
  if (/^\d{8}$/.test(cleaned)) {
    const firstFour = parseInt(cleaned.substring(0,4), 10);
    if (firstFour >= 1900 && firstFour <= 2100) {
      // YYYYMMDD -> DDMMYYYY
      return cleaned.substring(6,8) + cleaned.substring(4,6) + cleaned.substring(0,4);
    } else {
      return cleaned;
    }
  }
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }
  throw new Error(`Formato de fecha no reconocido: ${dateStr}`);
}

export default function ImportView({ openModal }: ImportViewProps) {
  const { toastMessage, showToast } = useToast();
  const [delimiter, setDelimiter] = useState<string>(',');
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<CsvField, number | null>>({
    pnr: null,
    surname: null,
    origin: null,
    destination: null,
    flight: null,
    date: null,
    departureTime: null,
    arrivalTime: null,
    bookingClass: null,
    rerouting: null,
    disruptionType: null,
  });
  const [logs, setLogs] = useState<{ timestamp: string; message: string; type: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [headerDetected, setHeaderDetected] = useState(true);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  const clearLogs = () => setLogs([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setParsedData([]);
      setPreviewRows([]);
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) {
        addLog('El archivo está vacío', 'error');
        return;
      }
      const parsedLines = lines.map(line => line.split(delimiter));
      setParsedData(parsedLines);
      setPreviewRows(parsedLines.slice(0, 5)); // primeras 5 filas para preview
      resetMapping();
      const firstRow = parsedLines[0];
      const maybeHeader = firstRow.some(cell => /^[A-Za-z]/i.test(cell) && !/^[A-Z0-9]{4,5}$/.test(cell));
      setHeaderDetected(maybeHeader);
      if (maybeHeader) {
        addLog('Se detectó posible cabecera. Activa "La primera fila es cabecera" si corresponde.', 'info');
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const resetMapping = () => {
    setMapping({
      pnr: null,
      surname: null,
      origin: null,
      destination: null,
      flight: null,
      date: null,
      departureTime: null,
      arrivalTime: null,
      bookingClass: null,
      rerouting: null,
      disruptionType: null,
    });
  };

  const updateMapping = (field: CsvField, position: number | null) => {
    setMapping(prev => ({ ...prev, [field]: position }));
  };

  const maxCols = parsedData.length > 0 ? Math.max(...parsedData.map(row => row.length)) : 0;

  const handleImport = async () => {
    if (!file) {
      openModal('Error', 'Selecciona un archivo CSV');
      return;
    }
    const requiredFields: CsvField[] = ['pnr', 'surname', 'origin', 'destination', 'flight', 'date'];
    const missingMapping = requiredFields.filter(f => mapping[f] === null || mapping[f] === undefined);
    if (missingMapping.length > 0) {
      openModal('Error', `Falta asignar columna para: ${missingMapping.map(f => fieldLabels[f]).join(', ')}`);
      return;
    }

    setImporting(true);
    clearLogs();
    addLog(`Iniciando importación desde ${file.name} (delimitador: ${delimiter === '\t' ? 'tabulación' : delimiter})`, 'info');

    let startRow = headerDetected ? 1 : 0;
    const rows = parsedData.slice(startRow);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const record: any = {};

      for (const [field, col] of Object.entries(mapping) as [CsvField, number | null][]) {
        if (col !== null && col >= 1 && col <= maxCols) {
          let rawValue = row[col - 1]?.trim() || '';
          if (field === 'date') {
            try {
              rawValue = normalizeDate(rawValue);
            } catch (err: any) {
              addLog(`Fila ${i+1}: ${err.message}`, 'error');
              errorCount++;
              continue;
            }
          }
          if (field === 'departureTime' || field === 'arrivalTime') {
            if (rawValue === '') rawValue = '0000';
            else rawValue = rawValue.replace(/[^0-9]/g, '').slice(0,4);
            if (rawValue.length !== 4) rawValue = '0000';
          }
          record[field] = rawValue;
        } else {
          record[field] = fieldDefaults[field] ?? '';
        }
      }

      let valid = true;
      for (const field of requiredFields) {
        const err = validateField(field, record[field]);
        if (err) {
          addLog(`Fila ${i+1}: ${err}`, 'error');
          valid = false;
          break;
        }
      }
      if (!valid) {
        errorCount++;
        continue;
      }

      const segment = {
        direction: 'GO',
        from: record.origin,
        to: record.destination,
        flight: record.flight,
        class: record.bookingClass || '',
        date: record.date,
        time: record.departureTime,
        arrivalTime: record.arrivalTime,
        rerouting: record.rerouting || '',
        type: record.disruptionType || '',
        isInvoiced: false,
        status: 'FREE',
      };

      const payload = {
        pnr: record.pnr,
        lastName: record.surname,
        flightType: 'one-way',
        isAmadeus: false,
        segments: [segment],
      };

      try {
        await saveRecord(payload);
        addLog(`Fila ${i+1}: PNR ${record.pnr} importado correctamente`, 'success');
        successCount++;
      } catch (err: any) {
        addLog(`Fila ${i+1}: Error al guardar - ${err.message}`, 'error');
        errorCount++;
      }
    }

    addLog(`Importación finalizada. ${successCount} registros OK, ${errorCount} errores.`, successCount > 0 ? 'success' : 'error');
    showToast(`Importación completada: ${successCount} correctos, ${errorCount} fallos`);
    setImporting(false);
  };

  const renderPreview = () => {
    if (previewRows.length === 0) return null;
    return (
        <div style={{ marginTop: '30px' }}>
        <h4 style={{ marginBottom: '15px', color: '#b30000' }}>Vista previa del archivo (primeras 5 filas)</h4>
        {parsedData.length === 0 ? (
            <div className="segment-box" style={{ background: '#f8f9fa', textAlign: 'center' }}>
            No se ha cargado ningún archivo o el archivo está vacío.
            </div>
        ) : (
            <div className="segment-box" style={{ overflowX: 'auto', padding: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                    {row.map((cell, cellIdx) => (
                        <td key={cellIdx} style={{ border: '1px solid #ddd', padding: '6px', background: idx === 0 && headerDetected ? '#f0f0f0' : 'white' }}>
                        {cell}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            {parsedData.length > 5 && <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px' }}>... y {parsedData.length - 5} filas más</div>}
            </div>
        )}
        </div>
    );
  };

    const getOptionsForField = (field: CsvField) => {
        const requiredFields: CsvField[] = ['pnr', 'surname', 'origin', 'destination', 'flight', 'date'];
        const isRequired = requiredFields.includes(field);
        const options = [];

        if (!isRequired) {
            options.push(<option key="none" value="none">N/A</option>);
        }

        if (maxCols === 0) {
            if (!isRequired) return options;
            // Si es requerido y no hay columnas, mostramos opción deshabilitada
            return [<option key="none" value="none" disabled>No hay columnas disponibles</option>];
        }

        for (let i = 1; i <= maxCols; i++) {
            options.push(<option key={i} value={i.toString()}>Columna {i}</option>);
        }

        return options;
    };

  return (
    <div className="max-width-container">
    {/* Tarjeta principal (fondo semitransparente con blur) */}
    <div className="card form-card" style={{
        width: '100%',
        boxSizing: 'border-box',
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        borderRadius: '16px',
        padding: '25px',
        boxShadow: '0 8px 32px 0 rgba(179, 0, 0, 0.08)',
        marginBottom: '25px'
    }}>
        
        {/* GRUPO 1: Configuración del archivo */}
        <div style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#b30000', fontSize: '1.2rem' }}>⚙️ Configuración del archivo</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Delimitador</label>
            <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} disabled={importing} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}>
                <option value=",">Coma (,)</option>
                <option value=";">Punto y coma (;)</option>
                <option value="\t">Tabulación (\\t)</option>
            </select>
            </div>
            <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Archivo CSV</label>
            <input type="file" accept=".csv" onChange={handleFileChange} disabled={importing} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', marginTop: '28px' }}>
                <input type="checkbox" checked={headerDetected} onChange={(e) => setHeaderDetected(e.target.checked)} disabled={importing} />
                <span style={{ marginLeft: '8px' }}>La primera fila es cabecera</span>
            </label>
            </div>
        </div>
        </div>

        {/* GRUPO 2: Asignación de columnas */}
        <div style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#b30000', fontSize: '1.2rem' }}>📋 Asignación de columnas</h4>
        {maxCols === 0 ? (
            <div className="segment-box" style={{ background: '#fff3cd', color: '#856404' }}>
            📂 Cargue un archivo CSV para ver las columnas disponibles.
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '12px' }}>
            {(Object.keys(fieldLabels) as CsvField[]).map(field => (
                <div key={field}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{fieldLabels[field]}</label>
                <select
                    value={mapping[field] === null ? 'none' : mapping[field]!.toString()}
                    onChange={(e) => {
                    const val = e.target.value;
                    updateMapping(field, val === 'none' ? null : parseInt(val, 10));
                    }}
                    disabled={importing}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    {getOptionsForField(field)}
                </select>
                </div>
            ))}
            </div>
        )}
        </div>

        {/* GRUPO 3: Vista previa (opcional, pero lo dejamos igual que antes, sin glass extra para no recargar) */}
        <div style={{ marginBottom: '30px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#b30000', fontSize: '1.2rem' }}>👁️ Vista previa (primeras 5 filas)</h4>
        {parsedData.length === 0 ? (
            <div className="segment-box" style={{ background: '#fff3cd', color: '#856404' }}>
            No se ha cargado ningún archivo o el archivo está vacío.
            </div>
        ) : (
            <div className="segment-box" style={{ overflowX: 'auto', padding: '10px', background: 'rgba(255,255,255,0.8)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                    {row.map((cell, cellIdx) => (
                        <td key={cellIdx} style={{ border: '1px solid #ddd', padding: '6px', background: idx === 0 && headerDetected ? '#f0f0f0' : 'white' }}>
                        {cell}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            {parsedData.length > 5 && <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px' }}>... y {parsedData.length - 5} filas más</div>}
            </div>
        )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <button onClick={handleImport} disabled={!file || importing} style={{
            background: importing ? '#cccccc' : '#b30000',
            color: 'white',
            padding: '10px 25px',
            border: 'none',
            borderRadius: '8px',
            cursor: importing ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
        }}>
            {importing ? '⏳ Importando...' : '📤 Importar datos'}
        </button>
        <button onClick={clearLogs} disabled={importing} style={{
            background: '#6c757d',
            color: 'white',
            padding: '10px 25px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
        }}>
            🧹 Limpiar logs
        </button>
        </div>
    </div>
    </div>
  );
}
