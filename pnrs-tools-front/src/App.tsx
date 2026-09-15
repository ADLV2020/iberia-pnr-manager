// src/App.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { FlightType, Segment, PnrRecord, ModalState } from './types/index.ts';
import { useSegments } from './hooks/useSegments.ts';
import { fetchRecords, saveRecord, updateRecord } from './services/api.ts';
import NavBar from './components/common/NavBar.tsx';
import FlightTypeSelector from './components/common/FlightTypeSelector.tsx';
import Modal from './components/common/Modal.tsx';
import HomeView from './components/views/HomeView.tsx';
import RegistroView from './components/views/RegistroView.tsx';
import AbmView from './components/views/AbmView.tsx';
import DisruptionsView from './components/views/DisruptionsView.tsx';
import GeneratorView from './components/views/GeneratorView.tsx';
import ConfirmModal from './components/common/ConfirmModal.tsx';
import ImportView from './components/views/ImportView';

function App() {
  const [view, setView] = useState('home');
  const [flightType, setFlightType] = useState<FlightType>('one-way');
  const [pnr, setPnr] = useState('');
  const [lastName, setLastName] = useState('');
  const [isAmadeus, setIsAmadeus] = useState(false);
  const [records, setRecords] = useState<PnrRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '' });
  const pnrInputRef = useRef<HTMLInputElement>(null);
  const statusOptions = ['FREE', 'IN_USED', 'UTILIZED', 'BURNED', 'EXPIRED'];

  const { segments, updateSegment, addSegment, setSegmentsFromRecord, resetSegments } = useSegments(flightType);

  const openModal = (title: string, message: string) => setModal({ isOpen: true, title, message });

  const [isEditingAbm, setIsEditingAbm] = useState(false);
  const [hasUnsavedAbm, setHasUnsavedAbm] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Función auxiliar para abrir el modal de confirmación
  const openModalConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const loadRecords = useCallback(async () => {
    try {
      const data = await fetchRecords(flightType);
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  }, [flightType]);

  useEffect(() => {
    if (view !== 'home') loadRecords();
  }, [flightType, view, loadRecords]);

  const clearForm = () => {
    setPnr('');
    setLastName('');
    setIsAmadeus(false);
    setSelectedRecordId('');
    resetSegments();
    setIsEditingAbm(false);
    setHasUnsavedAbm(false);
  };

  const handleSelectRecord = (id: string) => {
    if (view === 'abm' && isEditingAbm && hasUnsavedAbm) {
      openModalConfirm('Cambiar registro', 'Hay cambios sin guardar. ¿Perderlos?', () => {
        doSelectRecord(id);
      });
      return;
    }
    doSelectRecord(id);
  };

  const doSelectRecord = (id: string) => {
    setSelectedRecordId(id);
    if (!id) {
      clearForm();
      setIsEditingAbm(false);
      setHasUnsavedAbm(false);
      resetSegments(); // Limpia segmentos
      return;
    }
    const record = records.find(r => r.id === id);
    if (record) {
      setPnr(record.parts[1]);
      setLastName(record.parts[2]);
      setIsAmadeus(record.parts[3] === 'YES');
      if (record.rawSegments) {
        setSegmentsFromRecord(record.rawSegments);
      }
    }
    // Al cargar un registro, sale del modo edición
    setIsEditingAbm(false);
    setHasUnsavedAbm(false);
  };

  const handleCancelEdit = () => {
    openModalConfirm('Cancelar edición', '¿Perder los cambios?', () => {
      setIsEditingAbm(false);
      setHasUnsavedAbm(false);
      // Recargar el registro actual
      if (selectedRecordId) {
        const record = records.find(r => r.id === selectedRecordId);
        if (record) {
          setPnr(record.parts[1]);
          setLastName(record.parts[2]);
          setIsAmadeus(record.parts[3] === 'YES');
          if (record.rawSegments) {
            setSegmentsFromRecord(record.rawSegments);
          }
        }
      } else {
        resetSegments();
      }
    });
  };

  const handleSaveRecord = async () => {
    if (!pnr || !lastName) {
      openModal('Campos Vacíos', 'Complete PNR y apellido.');
      return;
    }
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.date && seg.date.length === 8) {
        const day = parseInt(seg.date.substring(0,2));
        const month = parseInt(seg.date.substring(2,4))-1;
        const year = parseInt(seg.date.substring(4,8));
        const segDate = new Date(year, month, day);
        if (segDate < today) {
          openModal('Fecha Inválida', `Segmento ${i+1} con fecha anterior a hoy.`);
          return;
        }
      }
      if (seg.from && seg.to && seg.from.toUpperCase() === seg.to.toUpperCase()) {
        openModal('Origen/Destino Inválido', `Segmento ${i+1}: origen y destino iguales.`);
        return;
      }
    }
    try {
      await saveRecord({ pnr, lastName, flightType, isAmadeus, segments });
      openModal('Éxito', 'PNR guardado correctamente.');
      clearForm();
      resetSegments();
      loadRecords();
      setIsEditingAbm(false);    // 👈 salir del modo edición
      setHasUnsavedAbm(false);   // 👈 limpiar bandera de cambios      
    } catch (err: any) {
      openModal('Error', err.message);
    }
  };

  // Guardar y LIMPIAR todo el formulario
  const handleSaveRecordAndClear = async () => {
    if (!pnr || !lastName) {
      openModal('Campos Vacíos', 'Complete PNR y apellido.');
      return;
    }

    // Validación de fechas (misma que tenías)
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.date && seg.date.length === 8) {
        const day = parseInt(seg.date.substring(0,2));
        const month = parseInt(seg.date.substring(2,4))-1;
        const year = parseInt(seg.date.substring(4,8));
        const segDate = new Date(year, month, day);
        if (segDate < today) {
          openModal('Fecha Inválida', `Segmento ${i+1} con fecha anterior a hoy.`);
          return;
        }
      }
      if (seg.from && seg.to && seg.from.toUpperCase() === seg.to.toUpperCase()) {
        openModal('Origen/Destino Inválido', `Segmento ${i+1}: origen y destino iguales.`);
        return;
      }
    }

    try {
      await saveRecord({ pnr, lastName, flightType, isAmadeus, segments });
      openModal('Éxito', 'PNR guardado correctamente.');
      clearForm();        // Limpia absolutamente todo (incluye segmentos)
      await loadRecords(); // Recarga la lista
    } catch (err: any) {
      openModal('Error', err.message);
    }
  };

  // Guardar y MANTENER (solo limpia el campo PNR)
  const handleSaveRecordAndKeep = async () => {
    if (!pnr || !lastName) {
      openModal('Campos Vacíos', 'Complete PNR y apellido.');
      return;
    }

    // Misma validación de fechas
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.date && seg.date.length === 8) {
        const day = parseInt(seg.date.substring(0,2));
        const month = parseInt(seg.date.substring(2,4))-1;
        const year = parseInt(seg.date.substring(4,8));
        const segDate = new Date(year, month, day);
        if (segDate < today) {
          openModal('Fecha Inválida', `Segmento ${i+1} con fecha anterior a hoy.`);
          return;
        }
      }
      if (seg.from && seg.to && seg.from.toUpperCase() === seg.to.toUpperCase()) {
        openModal('Origen/Destino Inválido', `Segmento ${i+1}: origen y destino iguales.`);
        return;
      }
    }

    try {
      await saveRecord({ pnr, lastName, flightType, isAmadeus, segments });
      openModal('Éxito', 'PNR guardado correctamente.');
      setPnr('');          // Solo limpia el PNR
      await loadRecords(); // Recarga la lista (para ver el nuevo registro)
    } catch (err: any) {
      openModal('Error', err.message);
    }
  };

  const handleUpdateRecord = async (statuses: string[]) => {
    if (!selectedRecordId) return;
    try {
      await updateRecord({
        recordId: selectedRecordId,
        flightType,
        pnr: pnr.toUpperCase(),
        lastName: lastName.toUpperCase(),
        isAmadeus,
        isInvoiced: segments.some(s => s.isInvoiced),
        segments,
        statuses,
        userAbm: 'OPERADOR_ABM',
      });
      openModal('Éxito', `Registro ${selectedRecordId} actualizado.`);
      loadRecords();
    } catch (err: any) {
      openModal('Error', err.message);
    }
  };

  const changeView = (newView: string) => {
    // 1. Fuerza el tipo de vuelo a 'one-way' si se entra a los módulos de generación automática
    // if (newView === 'generarV1' || newView === 'generarV2') {
    if (newView === 'generarV2') {
      setFlightType('one-way');
    }

    // 2. Mantiene la validación existente de cambios sin guardar en el ABM
    if (view === 'abm' && isEditingAbm && hasUnsavedAbm) {
      openModalConfirm('Cambiar vista', 'Hay cambios sin guardar. ¿Perderlos?', () => {
        setView(newView);
        setIsEditingAbm(false);
        setHasUnsavedAbm(false);
      });
    } else {
      setView(newView);
    }
  };

  const handleViewChange = (newView: string) => {
    setView(newView);
    // if (newView === 'generarV1' || newView === 'generarV2') {
    if (newView === 'generarV2') {  
      setFlightType('one-way'); // Fuerza el estado a Solo Ida internamente
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {view !== 'home' && <NavBar changeView={changeView} clearForm={clearForm} currentView={view} />}
      <div className="max-width-container" style={{ flex: 1, padding: '20px', marginTop: '20px', background: 'transparent' }}>
        {view === 'home' ? (
          <HomeView setView={changeView} />
        ) : (
          <>
            {view !== 'generarV2' && (
              <FlightTypeSelector flightType={flightType} setFlightType={setFlightType} />
            )}
            {view === 'registro' && (
              <RegistroView
                flightType={flightType}
                pnr={pnr}
                lastName={lastName}
                setPnr={setPnr}
                setLastName={setLastName}
                segments={segments}
                onSegmentChange={updateSegment}
                onAddSegment={addSegment}
                // onSubmit={handleSaveRecord}
                onSubmitClear={handleSaveRecordAndClear}
                onSubmitKeep={handleSaveRecordAndKeep}
                isAmadeus={isAmadeus}
                setIsAmadeus={setIsAmadeus}
                pnrInputRef={pnrInputRef}
              />
            )}
            {view === 'abm' && (
              <AbmView
                flightType={flightType}
                records={records}
                selectedId={selectedRecordId}
                onSelectRecord={handleSelectRecord}
                pnr={pnr}
                lastName={lastName}
                segments={segments}
                onSegmentChange={updateSegment}
                onSave={handleUpdateRecord}
                isAmadeus={isAmadeus}
                statusOptions={statusOptions}
                isEditing={isEditingAbm}
                hasUnsaved={hasUnsavedAbm}
                onEdit={() => setIsEditingAbm(true)}
                onCancel={handleCancelEdit}
                onHasUnsavedChange={setHasUnsavedAbm}
                openModal={openModal}   // ✅ nueva prop
              />
            )}
            {view === 'disrupciones' && (
              <DisruptionsView
                flightType={flightType}
                records={records}
                selectedId={selectedRecordId}
                onSelectRecord={handleSelectRecord}
                pnr={pnr}
                lastName={lastName}
                segments={segments}
                onRefresh={loadRecords}
                isAmadeus={isAmadeus}
                openModal={openModal}   // ✅ nueva prop
              />
            )}
            {view === 'generarV2' && (
              <GeneratorView openModal={openModal} />
            )}
            {view === 'importar' && (
              <ImportView openModal={openModal} />
            )}
          </>
        )}
      </div>
      <Modal modal={modal} setModal={setModal} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />      
    </div>
  );
}

export default App;
