'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, applySettings, clampSettings, loadSettings, saveSettings } from './settings';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // The server and the first browser render both use the defaults, so they always agree.
  // The saved settings are loaded right after mounting (the inline theme script has already
  // applied a saved theme, so there is no flash).
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const update = useCallback((partial) => {
    setSettings((current) => {
      const next = clampSettings({ ...current, ...partial });
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
