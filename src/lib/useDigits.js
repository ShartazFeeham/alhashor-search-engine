'use client';

import { useCallback } from 'react';
import { useSettings } from '../settings/SettingsProvider';
import { formatNumber } from './digits';

// A function that formats a number in the visitor's chosen digit style (Bengali or English).
export function useDigits() {
  const { settings } = useSettings();
  return useCallback((value) => formatNumber(value, settings.digits), [settings.digits]);
}
