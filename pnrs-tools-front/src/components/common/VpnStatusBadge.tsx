// src/components/common/VpnStatusBadge.tsx

import { useVpnStatus } from '../../hooks/useVpnStatus';

interface VpnStatusBadgeProps {
  /** Estilo adicional (ej. marginBottom) */
  style?: React.CSSProperties;
}

export function VpnStatusBadge({ style }: VpnStatusBadgeProps) {
  const { vpnConnected, refreshStatus } = useVpnStatus();

  const getStatusIcon = () => {
    if (vpnConnected === true) return '🔒';
    if (vpnConnected === false) return '⚠️';
    return '🔄';
  };

  const getStatusText = () => {
    if (vpnConnected === true) return 'Conectado';
    if (vpnConnected === false) return 'NO CONECTADO (se requiere VPN para operar)';
    return 'Verificando...';
  };

  const getStatusColor = () => {
    if (vpnConnected === true) return '#28a745';
    if (vpnConnected === false) return '#b30000';
    return '#ffc107';
  };

  return (
    <div
      className="segment-box"
      style={{
        borderLeft: `5px solid ${getStatusColor()}`,
        background: vpnConnected === true ? '#e6f7e6' : vpnConnected === false ? '#f8d7da' : '#fff3cd',
        boxShadow: vpnConnected === false ? '0 0 15px 5px rgba(255, 0, 0, 0.6), inset 0 0 5px rgba(255, 0, 0, 0.4)' : 'none',
        transition: 'box-shadow 0.3s ease-in-out',
        padding: '12px 15px',
        marginBottom: '20px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '24px' }}>{getStatusIcon()}</span>
        <div style={{ flex: 1 }}>
          <strong>Estado de conexión VPN a Iberia:</strong>{' '}
          {vpnConnected === true && <span style={{ fontWeight: 'bold' }}>Conectado</span>}
          {vpnConnected === false && (
            <span style={{ fontWeight: 'bold', textShadow: '0 0 3px red', color: '#b30000' }}>
              NO CONECTADO (se requiere VPN para operar)
            </span>
          )}
          {vpnConnected === null && 'Verificando...'}
        </div>
        <button onClick={refreshStatus} style={{ padding: '4px 12px', cursor: 'pointer' }}>
          Revisar
        </button>
      </div>
    </div>
  );
}
