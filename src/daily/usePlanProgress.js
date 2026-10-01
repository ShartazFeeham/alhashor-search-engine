'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadProgress, resetPlan, saveProgress, toggleDay } from '../lib/planProgress';

// Reading-plan progress, kept on this device only. The first render (also the pre-built page)
// starts empty; the saved progress is read right after mounting. If the device blocks storage,
// ticks still work for this visit.
export function usePlanProgress() {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const toggle = useCallback((planId, index) => {
    setProgress((current) => {
      const next = toggleDay(current, planId, index);
      saveProgress(next);
      return next;
    });
  }, []);

  const reset = useCallback((planId) => {
    setProgress((current) => {
      const next = resetPlan(current, planId);
      saveProgress(next);
      return next;
    });
  }, []);

  return { progress, toggle, reset };
}
