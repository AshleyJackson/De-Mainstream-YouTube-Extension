import { writable } from 'svelte/store';

export interface Channel {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export const channels = writable<Channel[]>([]);

export async function loadChannels(): Promise<void> {
  try {
    const values = await new Promise<Channel[]>((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_all' }, (result: Channel[]) => {
        resolve(Array.isArray(result) ? result : []);
      });
    });
    channels.set(values);
  } catch (e) {
    channels.set([]);
  }
}

export async function toggleChannel(id: string, enabled: boolean): Promise<void> {
  try {
    chrome.runtime.sendMessage({ action: 'set', channelId: id, enabled });
  } catch (e) {
    // Silently fail outside extension context
  }
}

export async function setAllEnabled(enabled: boolean): Promise<void> {
  try {
    chrome.runtime.sendMessage({ action: 'set_all', enabled });
    channels.update(list => list.map(ch => ({ ...ch, enabled })));
  } catch (e) {
    // Silently fail outside extension context
  }
}