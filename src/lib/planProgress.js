// Which days of each reading plan are done, kept on the visitor's device only.
// The shape is { [planId]: [day numbers, 0-based, sorted] }; a plan with nothing done has no entry.
export const STORAGE_KEY = 'boikotha.plan-progress';

const isDay = (value) => Number.isInteger(value) && value >= 0;

// Merely looking up window.localStorage throws when the visitor blocks site data.
function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function clean(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const progress = {};
  for (const [planId, days] of Object.entries(value)) {
    if (!Array.isArray(days)) continue;
    const kept = [...new Set(days.filter(isDay))].sort((a, b) => a - b);
    if (kept.length > 0) progress[planId] = kept;
  }
  return progress;
}

export function loadProgress(storage = defaultStorage()) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? clean(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be blocked or full (private mode); progress then lasts only for this visit.
  }
}

export const isDone = (progress, planId, index) => (progress[planId] || []).includes(index);

export function toggleDay(progress, planId, index) {
  if (!isDay(index)) return progress;
  const days = progress[planId] || [];
  const next = days.includes(index) ? days.filter((day) => day !== index) : [...days, index].sort((a, b) => a - b);
  const others = { ...progress };
  delete others[planId];
  return next.length > 0 ? { ...others, [planId]: next } : others;
}

export function resetPlan(progress, planId) {
  const others = { ...progress };
  delete others[planId];
  return others;
}

// Only days inside the plan count, in case a plan is made shorter after progress was saved.
export const doneCount = (progress, planId, totalDays) => (progress[planId] || []).filter((day) => day < totalDays).length;

export function percentDone(progress, planId, totalDays) {
  if (totalDays <= 0) return 0;
  return Math.round((doneCount(progress, planId, totalDays) / totalDays) * 100);
}

// The first day not yet done, or null when every day is.
export function nextDay(progress, planId, totalDays) {
  for (let day = 0; day < totalDays; day++) {
    if (!isDone(progress, planId, day)) return day;
  }
  return null;
}
