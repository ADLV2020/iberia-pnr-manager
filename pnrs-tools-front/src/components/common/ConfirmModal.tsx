// src/components/common/ConfirmModal.tsx

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-text">{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            className="btn-modal-close" 
            style={{ background: '#dc3545' }} 
            onClick={onCancel}
            >
              Cancelar
          </button>
          <button 
            className="btn-modal-close" 
            style={{ background: '#6c757d' }}
            onClick={onConfirm}
            >
              Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
