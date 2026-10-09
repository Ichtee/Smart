import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // storage unavailable
  }
});

// jsdom has no pointer capture; the music widget's drag uses it
Element.prototype.setPointerCapture ??= () => {};
