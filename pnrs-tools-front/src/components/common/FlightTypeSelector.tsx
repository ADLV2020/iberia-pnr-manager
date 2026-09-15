// src/components/common/FlightTypeSelector.tsx

import { FlightType } from '../../types/index.ts';

interface Props {
  flightType: FlightType;
  setFlightType: (type: FlightType) => void;
  visible?: boolean;
  allowedTypes?: FlightType[]; // Controlemos qué tipos de vuelo mostrar
}

export default function FlightTypeSelector({ flightType, setFlightType, visible = true, allowedTypes }: Props) {

  if (!visible) return null;

  const allTypes: { value: FlightType; label: string; icon: string }[] = [
    { value: 'one-way', label: 'Solo Ida', icon: '✈' },
    { value: 'round-trip', label: 'Ida y Vuelta', icon: '🔄' },
    { value: 'connecting-one-way', label: 'Ida con Conexión', icon: '🛬' },
    { value: 'connecting-round-trip', label: 'Ida y Vuelta con Conexión', icon: '🔁' },
  ];

  // Si se proporcionan tipos permitidos, filtramos; de lo contrario se muestran todos.
  const types = allowedTypes 
    ? allTypes.filter(t => allowedTypes.includes(t.value))
    : allTypes;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '25px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
  };

  const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    borderRadius: '10px',
    border: isActive ? '1px solid rgba(255, 255, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
    boxShadow: isActive ? '0 0 10px rgba(255,255,255,0.2)' : 'none',
  });

  return (
    <div className="max-width-container">
      <div style={containerStyle}>
        {types.map((t) => (
          <button key={t.value} style={getButtonStyle(flightType === t.value)} onClick={() => setFlightType(t.value)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
    </div>
  );

}
