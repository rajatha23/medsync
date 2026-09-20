import { useState, useEffect, useCallback } from 'react';
import { healthService } from '../services/healthService';

export function useSystemHealth(pollInterval = 10000) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await healthService.getHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Unable to reach MedSync API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    if (pollInterval > 0) {
      const interval = setInterval(fetchHealth, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, pollInterval]);

  return { health, loading, error, refresh: fetchHealth };
}
