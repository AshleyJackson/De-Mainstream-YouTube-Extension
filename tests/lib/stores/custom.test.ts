import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  customChannels,
  loadCustomChannels,
  removeCustomChannel,
} from "$lib/stores/custom";
import { get } from "svelte/store";

beforeEach(() => {
  customChannels.set([]);
  vi.clearAllMocks();
});

describe("loadCustomChannels", () => {
  it("loads custom channels from chrome.runtime.sendMessage and updates the store", async () => {
    chrome.runtime.sendMessage = vi.fn((_msg, cb) => cb(["UC123", "@handle"]));

    await loadCustomChannels();

    const state = get(customChannels);
    expect(state).toEqual(["UC123", "@handle"]);
  });

  it("sets empty array when runtime response is not an array", async () => {
    chrome.runtime.sendMessage = vi.fn((_msg, cb) => cb(null));

    await loadCustomChannels();
    expect(get(customChannels)).toEqual([]);
  });

  it("sets empty array when runtime response fails validation", async () => {
    chrome.runtime.sendMessage = vi.fn((_msg, cb) => cb(["valid", ""]));

    await loadCustomChannels();
    expect(get(customChannels)).toEqual([]);
  });

  it("sets empty array on error", async () => {
    chrome.runtime.sendMessage = vi.fn(() => {
      throw new Error("chrome not available");
    });

    await loadCustomChannels();
    expect(get(customChannels)).toEqual([]);
  });
});

describe("removeCustomChannel", () => {
  it("sends remove_custom message with correct params", async () => {
    customChannels.set(["UC123", "BBC"]);
    chrome.runtime.sendMessage = vi.fn();

    await removeCustomChannel("UC123");

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: "remove_custom",
      channelId: "UC123",
    });
  });

  it("optimistically removes from local store", async () => {
    customChannels.set(["UC123", "BBC"]);
    chrome.runtime.sendMessage = vi.fn();

    await removeCustomChannel("UC123");

    const state = get(customChannels);
    expect(state).toEqual(["BBC"]);
  });

  it("handles chrome API error gracefully", async () => {
    customChannels.set(["UC123"]);
    chrome.runtime.sendMessage = vi.fn(() => {
      throw new Error("not available");
    });

    await expect(removeCustomChannel("UC123")).resolves.not.toThrow();
  });
});
