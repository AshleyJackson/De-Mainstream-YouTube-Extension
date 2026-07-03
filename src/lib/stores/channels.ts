import { writable } from 'svelte/store';
import { ChannelGroupArraySchema, type ChannelGroup } from '$lib/types';
import { log } from '$lib/logger';

export const groups = writable<ChannelGroup[]>([]);

export async function loadGroups(): Promise<void> {
  log.info('Loading groups from background...');
  try {
    const values = await new Promise<unknown>((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_all' }, (result: unknown) => {
        resolve(result);
      });
    });
    const parsed = ChannelGroupArraySchema.parse(values);
    log.info('Groups loaded', { count: parsed.length, enabled: parsed.filter(g => g.enabled).length });
    groups.set(parsed);
  } catch (err) {
    log.error('Failed to load groups', { error: String(err) });
    groups.set([]);
  }
}

export async function toggleGroup(id: string, enabled: boolean): Promise<void> {
  log.info('Toggling group', { id, enabled });
  try {
    chrome.runtime.sendMessage({ action: 'set', groupId: id, enabled });
  } catch (err) {
    log.error('Failed to toggle group', { id, error: String(err) });
  }
}

export async function setAllEnabled(enabled: boolean): Promise<void> {
  log.info('Setting all groups', { enabled });
  try {
    chrome.runtime.sendMessage({ action: 'set_all', enabled });
    groups.update(list => {
      const updated = list.map(g => ({ ...g, enabled }));
      log.debug('Store updated optimistically', { count: updated.length });
      return updated;
    });
  } catch (err) {
    log.error('Failed to set all groups', { error: String(err) });
  }
}
