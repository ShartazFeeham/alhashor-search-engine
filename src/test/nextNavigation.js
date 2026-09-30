import { useSyncExternalStore } from 'react';

// In-memory stand-in for next/navigation, used by every test (see setupTests.js).
let url = new URL('http://localhost/');
let history = [];
let lastPushOptions;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setUrl(path) {
  url = new URL(path, 'http://localhost');
  notify();
}

export function getUrl() {
  return url;
}

export function getHistory() {
  return history;
}

export function getLastPushOptions() {
  return lastPushOptions;
}

export function resetNavigation() {
  history = [];
  lastPushOptions = undefined;
  setUrl('/');
}

const router = {
  push(path, options) {
    lastPushOptions = options;
    history = [...history, url.href];
    setUrl(path);
  },
  replace(path) {
    setUrl(path);
  },
};

export function useRouter() {
  return router;
}

export function usePathname() {
  useSyncExternalStore(subscribe, () => url.href, () => url.href);
  return url.pathname;
}

export function useSearchParams() {
  useSyncExternalStore(subscribe, () => url.href, () => url.href);
  return new URLSearchParams(url.search);
}
