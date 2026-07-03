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
    const parsed = ChannelGroupArraySchema.safeParse(values);
    if (!parsed.success) {
      log.warn('Groups response failed validation, using empty', { error: parsed.error?.message ?? 'unknown' });
      groups.set([]);
      return;
    }
    log.info('Groups loaded', { count: parsed.data.length, enabled: parsed.data.filter(g => g.enabled).length });
    groups.set(parsed.data);
  } catch (err) {
    log.error('Failed to load groups', { error: String(err) });
    groups.set([]);
  }
}

export async function toggleGroup(id: string, enabled: boolean): Promise<void> {
  log.info('Toggling group', { id, enabled });

  // Optimistic local update
  groups.update(list => list.map(g => g.id === id ? { ...g, enabled } : g));

  try {
    chrome.runtime.sendMessage({ action: 'set', groupId: id, enabled });
  } catch (err) {
    log.error('Failed to toggle group', { id, error: String(err) });
  }

  // Re-sync from background after a tick to ensure consistency
  setTimeout(() => loadGroups(), 100);
}

export async function setAllEnabled(enabled: boolean): Promise<void> {
  log.info('Setting all groups', { enabled });

  // Optimistic local update
  groups.update(list => list.map(g => ({ ...g, enabled })));

  try {
    chrome.runtime.sendMessage({ action: 'set_all', enabled });
  } catch (err) {
    log.error('Failed to set all groups', { error: String(err) });
  }

  // Re-sync from background after a tick
  setTimeout(() => loadGroups(), 100);
}
