import { z } from 'zod';
import { CHANNEL_DEFINITIONS } from './channels';
import { log } from './logger';

// ── Zod schemas ─────────────────────────────────────────────

const ChannelGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  channelIds: z.array(z.string().min(1)).min(1),
  enabled: z.boolean(),
});
const ChannelGroupArraySchema = z.array(ChannelGroupSchema);

const LegacyChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  enabled: z.boolean(),
});
const LegacyChannelArraySchema = z.array(LegacyChannelSchema);

const SetMsg = z.object({ action: z.literal('set'), groupId: z.string().min(1), enabled: z.boolean() });
const SetAllMsg = z.object({ action: z.literal('set_all'), enabled: z.boolean() });
const GetAllMsg = z.object({ action: z.literal('get_all') });
const BadgeCountMsg = z.object({ action: z.literal('badge_count'), count: z.number() });
const ExtMsg = z.discriminatedUnion('action', [GetAllMsg, SetMsg, SetAllMsg, BadgeCountMsg]);

// ── Storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'demainstream';

async function initStorage(): Promise<void> {
  log.info('Initializing storage...');
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);

  if (ChannelGroupArraySchema.safeParse(raw).success) {
    log.info('Storage already in group format, nothing to do');
    return;
  }

  const legacy = LegacyChannelArraySchema.safeParse(raw);
  if (legacy.success) {
    log.info('Migrating legacy format to group format', { legacyCount: legacy.data.length });

    const idToGroup = new Map<string, string>();
    for (const group of CHANNEL_DEFINITIONS) {
      for (const chId of group.channelIds) {
        idToGroup.set(chId.toLowerCase(), group.id);
      }
    }

    const enabledSet = new Set<string>();
    for (const ch of legacy.data) {
      if (ch.enabled) enabledSet.add(ch.id.toLowerCase());
    }
    log.debug('Legacy enabled IDs', { count: enabledSet.size });

    const migrated = CHANNEL_DEFINITIONS.map((group) => {
      // A group is enabled if ANY of its legacy-matching channelIds were enabled
      const anyEnabled = group.channelIds.some((chId) => enabledSet.has(chId.toLowerCase()));
      return { ...group, enabled: anyEnabled };
    });

    await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
    log.info('Migration complete', { groupCount: migrated.length });
    return;
  }

  log.warn('No valid data found, seeding defaults');
  const defaults = CHANNEL_DEFINITIONS.map((ch) => ({ ...ch, enabled: true }));
  await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
  log.info('Defaults seeded', { groupCount: defaults.length });
}

async function getGroups() {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = ChannelGroupArraySchema.safeParse(raw);
  if (parsed.success) {
    log.debug('Loaded groups from storage', { count: parsed.data.length });
    return parsed.data;
  }

  log.warn('Stored data failed validation, returning defaults', { rawType: typeof raw });
  return CHANNEL_DEFINITIONS.map((ch) => ({ ...ch, enabled: true }));
}

async function sendYouTubeUpdate(data: unknown): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
    log.debug('Notifying YouTube tabs', { tabCount: tabs.length, update: data });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id!, data).catch(() => {
        // Tab may not have content script injected — this is normal
      });
    }
  } catch (err) {
    log.debug('Failed to query tabs', { error: String(err) });
  }
}

function updateBadge(count: number): void {
  const text = count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text });
  if (count > 0) {
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
  }
  log.debug('Badge updated', { count });
}

async function setGroupEnabled(groupId: string, enabled: boolean): Promise<void> {
  log.info('Setting group enabled', { groupId, enabled });
  const stored = await getGroups();
  const target = stored.find((g) => g.id === groupId);
  if (!target) {
    log.warn('Group not found in storage', { groupId });
    return;
  }
  const updated = stored.map((g) => (g.id === groupId ? { ...g, enabled } : g));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  log.info('Group updated', { groupId, enabled, channelCount: target.channelIds.length });
}

async function setAllGroupsEnabled(enabled: boolean): Promise<void> {
  log.info('Setting all groups', { enabled });
  const stored = await getGroups();
  const updated = stored.map((g) => ({ ...g, enabled }));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  log.info('All groups updated', { enabled, groupCount: updated.length });
}

// ── Runtime message handler ─────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const parsed = ExtMsg.safeParse(message);
  if (!parsed.success) {
    log.warn('Received invalid message', { message, error: parsed.error?.message ?? 'unknown' });
    return false;
  }

  log.debug('Received message', parsed.data);

  switch (parsed.data.action) {
    case 'get_all':
      getGroups().then((groups) => {
        log.debug('Responding with groups', { count: groups.length });
        sendResponse(groups);
      });
      return true;

    case 'set':
      setGroupEnabled(parsed.data.groupId, parsed.data.enabled).then(() => {
        sendYouTubeUpdate({ type: 'set', groupId: parsed.data.groupId });
        sendResponse({ success: true });
      });
      return true;

    case 'set_all':
      setAllGroupsEnabled(parsed.data.enabled).then(() => {
        sendYouTubeUpdate({ type: 'set_all', enabled: parsed.data.enabled });
        sendResponse({ success: true });
      });
      return true;

    case 'badge_count':
      updateBadge(parsed.data.count);
      sendResponse({ success: true });
      return false;
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  log.info('Extension installed/updated', { reason: details.reason, previousVersion: details.previousVersion });
  initStorage();
});

log.info('Background service worker started');
initStorage();
