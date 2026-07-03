import { z } from 'zod';
import { CHANNEL_DEFINITIONS } from './channels';

// ── Zod schemas (minimal, tree-shakeable) ───────────────────

const ChannelSchema = z.object({ id: z.string(), name: z.string(), icon: z.string(), enabled: z.boolean() });
const ChannelArraySchema = z.array(ChannelSchema);

const SetMsg = z.object({ action: z.literal('set'), channelId: z.string().min(1), enabled: z.boolean() });
const SetAllMsg = z.object({ action: z.literal('set_all'), enabled: z.boolean() });
const GetAllMsg = z.object({ action: z.literal('get_all') });
const ExtMsg = z.discriminatedUnion('action', [GetAllMsg, SetMsg, SetAllMsg]);

// ── Storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'demainstream';
// Reuse a single schema instance for parsing
const channelArray = () => ChannelArraySchema;

async function initStorage(): Promise<void> {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  if (!channelArray().safeParse(raw).success) {
    const defaults = CHANNEL_DEFINITIONS.map((ch) => ({ ...ch, enabled: true }));
    await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
  }
}

async function getChannels() {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  return channelArray().parse(raw ?? []);
}

async function sendYouTubeUpdate(data: unknown): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id!, data).catch(() => {});
  }
}

async function setChannelEnabled(channelId: string, enabled: boolean): Promise<void> {
  const stored = await getChannels();
  const updated = stored.map((ch) => (ch.id === channelId ? { ...ch, enabled } : ch));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

async function setAllChannelsEnabled(enabled: boolean): Promise<void> {
  const stored = await getChannels();
  const updated = stored.map((ch) => ({ ...ch, enabled }));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

// ── Runtime message handler ─────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const parsed = ExtMsg.safeParse(message);
  if (!parsed.success) return false;

  switch (parsed.data.action) {
    case 'get_all':
      getChannels().then(sendResponse);
      return true;

    case 'set':
      setChannelEnabled(parsed.data.channelId, parsed.data.enabled).then(() => {
        sendYouTubeUpdate({ type: 'set', channelId: parsed.data.channelId });
        sendResponse({ success: true });
      });
      return true;

    case 'set_all':
      setAllChannelsEnabled(parsed.data.enabled).then(() => {
        sendYouTubeUpdate({ type: 'set_all', enabled: parsed.data.enabled });
        sendResponse({ success: true });
      });
      return true;
  }
});

chrome.runtime.onInstalled.addListener(() => initStorage());
initStorage();