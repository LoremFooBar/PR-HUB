import "@testing-library/jest-dom";

// --- Chrome API mock ---
const store = new Map<string, unknown>();

export function resetChromeStorage() {
  store.clear();
}

const chromeStorageLocal = {
  get(keys: string | string[], cb: (result: Record<string, unknown>) => void) {
    const result: Record<string, unknown> = {};
    const keyArr = Array.isArray(keys) ? keys : [keys];
    for (const k of keyArr) {
      if (store.has(k)) result[k] = store.get(k);
    }
    cb(result);
  },
  set(items: Record<string, unknown>, cb?: () => void) {
    for (const [k, v] of Object.entries(items)) store.set(k, v);
    cb?.();
  },
  remove(keys: string | string[], cb?: () => void) {
    const keyArr = Array.isArray(keys) ? keys : [keys];
    for (const k of keyArr) store.delete(k);
    cb?.();
  },
};

Object.defineProperty(globalThis, "chrome", {
  value: {
    storage: { local: chromeStorageLocal },
    tabs: {
      query: jest.fn((_q: unknown, cb: (tabs: unknown[]) => void) => cb([])),
      create: jest.fn(),
      update: jest.fn(),
    },
    windows: {
      update: jest.fn(),
    },
  },
  writable: true,
});

// --- Clipboard mock ---
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

beforeEach(() => {
  resetChromeStorage();
  jest.clearAllMocks();
});
