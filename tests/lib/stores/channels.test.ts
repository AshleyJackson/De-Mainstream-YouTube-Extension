import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  groups,
  loadGroups,
  toggleGroup,
  setAllEnabled,
} from "$lib/stores/channels";
import { get } from "svelte/store";

beforeEach(() => {
  groups.set([]);
  vi.clearAllMocks();
});

const SAMPLE_GROUPS = [
  {
    id: "cnn",
    name: "CNN",
    icon: "img/channels/cnn.jpg",
    channelIds: ["CNN"],
    enabled: true,
  },
  {
    id: "bbc",
    name: "BBC",
    icon: "img/channels/bbc.jpg",
    channelIds: ["BBC", "bbcnews"],
    enabled: false,
  },
];

describe("loadGroups", () => {
  it("loads groups from chrome.runtime.sendMessage and updates the store", async () => {
    chrome.runtime.sendMessage = vi.fn((_msg, cb) => cb(SAMPLE_GROUPS));

    await loadGroups();

    const state = get(groups);
    expect(state).toEqual(SAMPLE_GROUPS);
  });

  it("sets empty array when runtime response is not an array", async () => {
    chrome.runtime.sendMessage = vi.fn((_msg, cb) => cb(null));

    await loadGroups();
    expect(get(groups)).toEqual([]);
  });

  it("sets empty array on error", async () => {
    chrome.runtime.sendMessage = vi.fn(() => {
      throw new Error("chrome not available");
    });

    await loadGroups();
    expect(get(groups)).toEqual([]);
  });
});

describe("toggleGroup", () => {
  it("sends set message with correct params", async () => {
    chrome.runtime.sendMessage = vi.fn();

    await toggleGroup("cnn", false);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: "set",
      groupId: "cnn",
      enabled: false,
    });
  });

  it("handles chrome API error gracefully", async () => {
    chrome.runtime.sendMessage = vi.fn(() => {
      throw new Error("not available");
    });

    await expect(toggleGroup("cnn", true)).resolves.not.toThrow();
  });
});

describe("setAllEnabled", () => {
  it("sends set_all message and updates store optimistically", async () => {
    groups.set([
      {
        id: "cnn",
        name: "CNN",
        icon: "img/channels/cnn.jpg",
        channelIds: ["CNN"],
        enabled: true,
      },
      {
        id: "bbc",
        name: "BBC",
        icon: "img/channels/bbc.jpg",
        channelIds: ["BBC", "bbcnews"],
        enabled: false,
      },
    ]);
    chrome.runtime.sendMessage = vi.fn();

    await setAllEnabled(true);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: "set_all",
      enabled: true,
    });

    const state = get(groups);
    expect(state.every((g) => g.enabled)).toBe(true);
  });

  it("handles chrome API error gracefully", async () => {
    groups.set([
      {
        id: "cnn",
        name: "CNN",
        icon: "img/channels/cnn.jpg",
        channelIds: ["CNN"],
        enabled: true,
      },
    ]);
    chrome.runtime.sendMessage = vi.fn(() => {
      throw new Error("not available");
    });

    await expect(setAllEnabled(false)).resolves.not.toThrow();
  });
});
