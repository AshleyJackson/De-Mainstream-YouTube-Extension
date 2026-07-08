import { writable } from "svelte/store";
import { CustomChannelsSchema } from "$lib/types";
import { log } from "$lib/logger";

export const customChannels = writable<string[]>([]);

export async function loadCustomChannels(): Promise<void> {
  log.info("Loading custom channels from background...");
  try {
    const values = await new Promise<unknown>((resolve) => {
      chrome.runtime.sendMessage(
        { action: "get_custom" },
        (result: unknown) => {
          resolve(result);
        },
      );
    });
    const parsed = CustomChannelsSchema.safeParse(values);
    if (!parsed.success) {
      log.warn("Custom channels response failed validation, using empty", {
        error: parsed.error?.message ?? "unknown",
      });
      customChannels.set([]);
      return;
    }
    log.info("Custom channels loaded", { count: parsed.data.length });
    customChannels.set(parsed.data);
  } catch (err) {
    log.error("Failed to load custom channels", { error: String(err) });
    customChannels.set([]);
  }
}

export async function removeCustomChannel(channelId: string): Promise<void> {
  log.info("Removing custom channel", { channelId });

  // Optimistic local update
  customChannels.update((list) => list.filter((id) => id !== channelId));

  try {
    chrome.runtime.sendMessage({ action: "remove_custom", channelId });
  } catch (err) {
    log.error("Failed to remove custom channel", {
      channelId,
      error: String(err),
    });
  }

  // Re-sync from background after a tick
  setTimeout(() => loadCustomChannels(), 100);
}
