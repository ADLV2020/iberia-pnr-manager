// src/hooks/useToast.ts

import { useState, useCallback, useRef, useEffect } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, duration: number = 3000) => {
    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setToastMessage(message);
    
    timeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  // Limpiar timeout al desmontar el componente que usa el hook
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { toastMessage, showToast };
}
