// Adds DOM matchers such as toBeInTheDocument() and toHaveTextContent() to expect.
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { resetNavigation } from './test/nextNavigation';

// Every test runs against in-memory versions of the Next.js router and link.
vi.mock('next/navigation', () => import('./test/nextNavigation'));
vi.mock('next/link', () => import('./test/nextLink'));
// next/font/local needs Next's compiler; in tests it just reports its CSS variable name.
vi.mock('next/font/local', () => ({ default: (options) => ({ variable: options.variable, className: '' }) }));

beforeEach(() => resetNavigation());
