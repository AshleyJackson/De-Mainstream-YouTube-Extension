import { describe, it, expect, vi, beforeEach } from 'vitest';

const STORAGE_KEY = 'demainstream';

function createChromeMock() {
  return {
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({})),
        set: vi.fn(() => Promise.resolve()),
      },
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
  };
}

let mockChrome: ReturnType<typeof createChromeMock>;
let onMessageListener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | undefined;
let onInstalledListener: () => void;

beforeEach(() => {
  vi.resetModules();
  mockChrome = createChromeMock();
  (globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

  mockChrome.runtime.onMessage.addListener.mockImplementation(
    (fn: typeof onMessageListener) => { onMessageListener = fn; },
  );
  mockChrome.runtime.onInstalled.addListener.mockImplementation(
    (fn: () => void) => { onInstalledListener = fn; },
  );
});

describe('background service worker', () => {
  it('registers onMessage and onInstalled listeners', async () => {
    await import('../../src/extension/background');

    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
  });

  it('initializes storage on install with default groups (all enabled)', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);

    await import('../../src/extension/background');

    onInstalledListener();
    await new Promise(r => setTimeout(r, 50));

    expect(mockChrome.storage.local.set).toHaveBeenCalled();
    const call = mockChrome.storage.local.set.mock.calls.at(-1);
    const stored = call[0][STORAGE_KEY];
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBeGreaterThan(10);
    for (const g of stored) {
      expect(g.enabled).toBe(true);
      expect(Array.isArray(g.channelIds)).toBe(true);
      expect(g.channelIds.length).toBeGreaterThanOrEqual(1);
    }
  });

  describe('get_all handler', () => {
    it('returns groups from storage', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEY]: [
          { id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true },
        ],
      });

      await import('../../src/extension/background');

      const response = await new Promise<unknown>((resolve) => {
        const keepsOpen = onMessageListener?.({ action: 'get_all' }, null, resolve);
        expect(keepsOpen).toBe(true);
      });

      expect(response).toEqual([
        { id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true },
      ]);
    });
  });

  describe('set handler', () => {
    it('updates a single group and notifies tabs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEY]: [
          { id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true },
          { id: 'bbc', name: 'BBC', icon: 'img/channels/bbc.jpg', channelIds: ['BBC', 'bbcnews'], enabled: false },
        ],
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      mockChrome.tabs.query.mockResolvedValue([{ id: 1 } as unknown as chrome.tabs.Tab]);
      mockChrome.tabs.sendMessage.mockResolvedValue(undefined);

      await import('../../src/extension/background');

      const response = await new Promise<unknown>((resolve) => {
        const keepsOpen = onMessageListener?.(
          { action: 'set', groupId: 'bbc', enabled: true },
          null,
          resolve,
        );
        expect(keepsOpen).toBe(true);
      });

      expect(response).toEqual({ success: true });

      const setCall = mockChrome.storage.local.set.mock.calls.at(-1);
      const updated = setCall[0][STORAGE_KEY];
      const bbc = updated.find((g: { id: string }) => g.id === 'bbc');
      expect(bbc.enabled).toBe(true);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'set', groupId: 'bbc' });
    });
  });

  describe('set_all handler', () => {
    it('disables all groups and notifies tabs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEY]: [
          { id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true },
          { id: 'bbc', name: 'BBC', icon: 'img/channels/bbc.jpg', channelIds: ['BBC', 'bbcnews'], enabled: true },
        ],
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      mockChrome.tabs.query.mockResolvedValue([{ id: 1 } as unknown as chrome.tabs.Tab]);
      mockChrome.tabs.sendMessage.mockResolvedValue(undefined);

      await import('../../src/extension/background');

      const response = await new Promise<unknown>((resolve) => {
        const keepsOpen = onMessageListener?.(
          { action: 'set_all', enabled: false },
          null,
          resolve,
        );
        expect(keepsOpen).toBe(true);
      });

      expect(response).toEqual({ success: true });

      const setCall = mockChrome.storage.local.set.mock.calls.at(-1);
      const updated = setCall[0][STORAGE_KEY];
      expect(updated.every((g: { enabled: boolean }) => g.enabled === false)).toBe(true);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'set_all', enabled: false });
    });
  });

  it('rejects unknown message action (returns false)', async () => {
    await import('../../src/extension/background');

    const result = onMessageListener?.({ action: 'unknown' }, null, () => {});
    expect(result).toBe(false);
  });
});
