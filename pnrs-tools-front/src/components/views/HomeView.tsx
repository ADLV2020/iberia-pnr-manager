// src/components/views/HomeView.tsx

interface HomeViewProps {
  setView: (view: string) => void;
}

export default function HomeView({ setView }: HomeViewProps) {
  const cardBaseStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(5px)',
    padding: '30px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    transition: 'transform 0.2s, background 0.2s',
  };

  const gridCardsStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 340px)',
    gap: '30px',
    justifyContent: 'center',
    width: '100%',
    marginTop: '20px',
  };

  const cards = [
    { id: 'generarV2', icon: '✨', title: 'Generar PNR', desc: 'Flujo interactivo de cotización y emisión simulada de tramas NDC.', borderTop: '#f0ad4e' },
    { id: 'check-in', icon: '🧳', title: 'Check-in de PNRs', desc: 'Funcionalidad en desarrollo. Próximamente podrás realizar check-in automático.', borderTop: '#0056b3' },
    { id: 'registro', icon: '📋', title: 'Registro de PNRs', desc: 'Ingreso manual estructurado, máscaras de validación y almacenamiento.', borderTop: '#0056b3' },
    { id: 'importar', icon: '📂', title: 'Importar CSV', desc: 'Carga masiva de PNRs desde archivo CSV.', borderTop: '#0056b3' },
    { id: 'abm', icon: '⚙', title: 'Administrador PNR', desc: 'Modificación, persistencia SQLite y auditoría de estados operacionales.', borderTop: '#28a745' },
    { id: 'disrupciones', icon: '⚡', title: 'Disrupciones Host', desc: 'Simulación e inyección de mensajería SOAP/XML en caliente.', borderTop: '#dc3545' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      <h1 style={{ color: '#fff', fontSize: '38px', fontWeight: 'bold', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>
        ✈ GESTOR DE PNRs
      </h1>
      <div style={gridCardsStyle}>
        {cards.map(card => (
          <div key={card.id} className="card" onClick={() => setView(card.id)} style={{ ...cardBaseStyle, borderTop: `5px solid ${card.borderTop}` }}>
            <div style={{ fontSize: '45px', marginBottom: '15px' }}>{card.icon}</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '19px' }}>{card.title}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#e0e0e0' }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
