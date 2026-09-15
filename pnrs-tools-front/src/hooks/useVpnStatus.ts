// src/hooks/useVpnStatus.ts

import { useState, useEffect, useCallback } from 'react';
import { checkVpnStatus } from '../services/api';

export function useVpnStatus() {
  const [vpnConnected, setVpnConnected] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const { connected } = await checkVpnStatus();
      setVpnConnected(connected);
    } catch (error) {
      setVpnConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus(); // primera comprobación
    const interval = setInterval(refreshStatus, 30000); // cada 30 segundos
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return { vpnConnected, refreshStatus };
}
