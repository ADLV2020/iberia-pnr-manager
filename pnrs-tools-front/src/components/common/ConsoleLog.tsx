// src/components/common/ConsoleLog.tsx

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'response';
}

interface ConsoleLogProps {
  logs: LogEntry[];
  title?: string;
  height?: string;
}

export default function ConsoleLog({ logs, title = 'Terminal', height = '300px' }: ConsoleLogProps) {
  const getColor = (type: string) => {
    if (type === 'error') return '#ff6b6b';
    if (type === 'success') return '#5cb85c';
    if (type === 'response') return '#5bc0de';
    return '#00ff00';
  };

  return (
    <div style={{ marginTop: '25px' }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>💻 {title}</h4>
      <div
        style={{
          background: '#0c0c0c',
          color: '#00ff00',
          fontFamily: 'monospace',
          padding: '15px',
          borderRadius: '6px',
          height,
          overflowY: 'auto',
          fontSize: '12px',
          lineHeight: '1.5',
          border: '1px solid #333',
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: '#666' }}>Esperando acciones...</span>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ color: getColor(log.type), marginBottom: '4px' }}>
              <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
