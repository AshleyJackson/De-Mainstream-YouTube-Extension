import { z } from 'zod';
import { CHANNEL_DEFINITIONS } from './channels';

// ── Zod schemas ─────────────────────────────────────────────

const ChannelGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  channelIds: z.array(z.string().min(1)).min(1),
  enabled: z.boolean(),
});
const ChannelGroupArraySchema = z.array(ChannelGroupSchema);

const SetMsg = z.object({ action: z.literal('set'), groupId: z.string().min(1), enabled: z.boolean() });
const SetAllMsg = z.object({ action: z.literal('set_all'), enabled: z.boolean() });
const GetAllMsg = z.object({ action: z.literal('get_all') });
const ExtMsg = z.discriminatedUnion('action', [GetAllMsg, SetMsg, SetAllMsg]);

// ── Storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'demainstream';

async function initStorage(): Promise<void> {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  if (!ChannelGroupArraySchema.safeParse(raw).success) {
    const defaults = CHANNEL_DEFINITIONS.map((ch) => ({ ...ch, enabled: true }));
    await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
  }
}

async function getGroups() {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  return ChannelGroupArraySchema.parse(raw ?? []);
}

async function sendYouTubeUpdate(data: unknown): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id!, data).catch(() => {});
  }
}

async function setGroupEnabled(groupId: string, enabled: boolean): Promise<void> {
  const stored = await getGroups();
  const updated = stored.map((g) => (g.id === groupId ? { ...g, enabled } : g));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

async function setAllGroupsEnabled(enabled: boolean): Promise<void> {
  const stored = await getGroups();
  const updated = stored.map((g) => ({ ...g, enabled }));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

// ── Runtime message handler ─────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const parsed = ExtMsg.safeParse(message);
  if (!parsed.success) return false;

  switch (parsed.data.action) {
    case 'get_all':
      getGroups().then(sendResponse);
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
  }
});

chrome.runtime.onInstalled.addListener(() => initStorage());
initStorage();