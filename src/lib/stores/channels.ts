import { writable } from 'svelte/store';
import { ChannelArraySchema, type Channel } from '$lib/types';

export const channels = writable<Channel[]>([]);

export async function loadChannels(): Promise<void> {
  try {
    const values = await new Promise<unknown>((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_all' }, (result: unknown) => {
        resolve(result);
      });
    });
    const parsed = ChannelArraySchema.parse(values);
    channels.set(parsed);
  } catch {
    channels.set([]);
  }
}

export async function toggleChannel(id: string, enabled: boolean): Promise<void> {
  try {
    chrome.runtime.sendMessage({ action: 'set', channelId: id, enabled });
  } catch {
    // gracefully handled outside extension context
  }
}

export async function setAllEnabled(enabled: boolean): Promise<void> {
  try {
    chrome.runtime.sendMessage({ action: 'set_all', enabled });
    channels.update(list => list.map(ch => ({ ...ch, enabled })));
  } catch {
    // gracefully handled outside extension context
  }
}