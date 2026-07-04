import { vi } from "vitest";

// ── Chrome API mocks ────────────────────────────────────────

function createChromeStorage() {
  const store: Record<string, unknown> = {};

  return {
    local: {
      get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
        if (typeof keys === "string") {
          return Promise.resolve({ [keys]: store[keys] ?? null });
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const k of keys) result[k] = store[k] ?? null;
          return Promise.resolve(result);
        }
        if (keys && typeof keys === "object") {
          const result: Record<string, unknown> = {};
          for (const k of Object.keys(keys)) {
            result[k] = store[k] ?? (keys as Record<string, unknown>)[k];
          }
          return Promise.resolve(result);
        }
        return Promise.resolve({ ...store });
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(store, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const ks = Array.isArray(keys) ? keys : [keys];
        for (const k of ks) delete store[k];
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
    },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      onInstalled: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([])),
      sendMessage: vi.fn(() => Promise.resolve()),
    },
  } as unknown as typeof chrome;
}

// Apply mocks globally
const mockChrome = createChromeStorage();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).chrome = mockChrome;

export { mockChrome };
