// src/hooks/useApi.ts

import { useState } from 'react';

export function useApi<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (promise: Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await promise;
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { call, loading, error };
}
