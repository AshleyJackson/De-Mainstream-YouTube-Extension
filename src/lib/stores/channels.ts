import { writable } from 'svelte/store';
import { ChannelGroupArraySchema, type ChannelGroup } from '$lib/types';

export const groups = writable<ChannelGroup[]>([]);

export async function loadGroups(): Promise<void> {
  try {
    const values = await new Promise<unknown>((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_all' }, (result: unknown) => {
        resolve(result);
      });
    });
    const parsed = ChannelGroupArraySchema.parse(values);
    groups.set(parsed);
  } catch {
    groups.set([]);
  }
}

export async function toggleGroup(id: string, enabled: boolean): Promise<void> {
  try {
    chrome.runtime.sendMessage({ action: 'set', groupId: id, enabled });
  } catch {
    // gracefully handled outside extension context
  }
}

export async function setAllEnabled(enabled: boolean): Promise<void> {
  try {
    chrome.runtime.sendMessage({ action: 'set_all', enabled });
    groups.update(list => list.map(g => ({ ...g, enabled })));
  } catch {
    // gracefully handled outside extension context
  }
}