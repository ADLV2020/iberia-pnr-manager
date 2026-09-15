// src/components/common/NavBar.tsx

interface NavBarProps {
  changeView: (view: string) => void;
  clearForm: () => void;
  currentView: string;
}

export default function NavBar({ changeView, clearForm, currentView }: NavBarProps) {
  const getButtonStyle = (isActive: boolean) => ({
    background: isActive ? 'rgba(255,255,255,0.3)' : 'none',
    border: `1px solid ${isActive ? 'white' : 'rgba(255,255,255,0.5)'}`,
    color: 'white',
    padding: '8px 15px',
    marginLeft: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s',
    boxShadow: isActive ? '0 0 5px rgba(255,255,255,0.5)' : 'none',
  });

  const handleClick = (viewName: string) => {
    changeView(viewName);
    clearForm();
  };

  return (
    <div className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      <div className="navbar-brand" onClick={() => handleClick('home')}>
        ✈ GESTOR DE PNRs
      </div>
      <div className="navbar-menu">
        <button onClick={() => handleClick('generarV2')} style={getButtonStyle(currentView === 'generarV2')}>
          ✨ Generar
        </button>
        <button onClick={() => handleClick('checkin')} style={getButtonStyle(currentView === 'checkin')}>
          🧳 Check-in
        </button>
        <button onClick={() => handleClick('registro')} style={getButtonStyle(currentView === 'registro')}>
          📋 Registrar
        </button>
        <button onClick={() => handleClick('importar')} style={getButtonStyle(currentView === 'importar')}>
          📂 Importar
        </button>
        <button onClick={() => handleClick('abm')} style={getButtonStyle(currentView === 'abm')}>
          ⚙ Administrar
        </button>
        <button onClick={() => handleClick('disrupciones')} style={getButtonStyle(currentView === 'disrupciones')}>
          ⚡ Disrupción
        </button>
      </div>
    </div>
  );
}
