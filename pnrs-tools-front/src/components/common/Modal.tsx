// src/components/common/Modal.tsx

import { ModalState } from '../../types/index.ts';

interface ModalProps {
  modal: ModalState;
  setModal: (state: ModalState) => void;
}

export default function Modal({ modal, setModal }: ModalProps) {
  if (!modal.isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-title">{modal.title}</h3>
        <p className="modal-text">{modal.message}</p>
        <button className="btn-modal-close" onClick={() => setModal({ isOpen: false, title: '', message: '' })}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
