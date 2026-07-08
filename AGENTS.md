# AGENTS.md — De-Mainstream YouTube Extension

## Overview

This project is a browser extension (Chrome MV3) that removes mainstream media results from YouTube searches. Built with SvelteKit, `sveltekit-adapter-chrome-extension`, Tailwind CSS v4, `@o7/icon`, and `zod`.

## Architecture

```
src/
├── extension/          # Compiled separately via esbuild (Vite plugin)
│   ├── background.ts   # Service worker — chrome.storage + runtime message broker
│   ├── channels.ts     # Channel group definitions (52 groups, 75 YouTube channel IDs)
│   ├── types.ts        # Plain TS interfaces (no zod — avoids bundling zod into service worker)
│   └── youtube.ts      # Content script — DOM observer + video filtering
├── lib/
│   ├── data/
│   │   └── channels.ts # Channel group definitions mirror for Svelte side ($lib alias)
│   ├── stores/
│   │   └── channels.ts # Svelte writable store + chrome.runtime message helpers
│   └── types.ts        # Zod schemas (ChannelGroup, messages, tab updates)
├── routes/
│   ├── +layout.svelte  # Root layout shell
│   ├── +layout.ts      # Prerender config
│   └── +page.svelte    # Popup UI — group list with toggle checkboxes
├── app.css             # Tailwind import
├── app.html            # HTML shell
└── app.d.ts            # App type declarations
tests/
├── lib/
│   ├── types.test.ts       # Zod schema validation
│   ├── data/channels.test.ts # Group data integrity
│   └── stores/channels.test.ts # Store + chrome API tests
└── extension/
    ├── background.test.ts  # Service worker message handling
    └── youtube.test.ts     # DOM filtering (jsdom)
```

## Channel groups

Channels are organised into **groups** — each group represents a parent company/brand and contains a list of YouTube channel IDs. Toggling a group hides all its channels at once.

Example: the `cbs` group contains `CBS`, `CBSNewsOnline`, `CBSEveningNews`, `CBSThisMorning`, `Cbsfacethenation1`, `cbstvdinsideedition`.

## Build

`bun run build` — SvelteKit builds the popup, then the `extensionBuildPlugin` compiles `src/extension/background.ts` and `src/extension/youtube.ts` via esbuild into `build/`.

## Agent Instructions

### When adding a channel group

1. Add to both `src/extension/channels.ts` AND `src/lib/data/channels.ts`
2. Add a 34×34 JPG to `static/img/channels/`
3. Update `GROUP_COUNT` in `tests/lib/data/channels.test.ts`
4. Add the new YouTube channel IDs to the group's `channelIds` array
5. Verify no duplicate `channelIds` across groups (there's a test for this)

### When adding a new YouTube channel ID to an existing group

1. Add the ID string to the group's `channelIds` in both `channels.ts` files
2. No new icon needed — the group icon is used

### When modifying schemas

- All runtime-validated types live in `src/lib/types.ts` using zod
- `src/extension/types.ts` has plain TS interfaces for esbuild-bundled code (avoids bundling zod into the service worker)

### Custom channels (right-click context menu)

Users can right-click any YouTube channel link and select **"Add to De-Mainstream block list"** to block a channel not in the predefined groups.

### How it works

1. **Background** (`src/extension/background.ts`): Creates a `chrome.contextMenus` item on install. Click handler extracts channel ID from link URL (`/channel/UC...`, `/@handle`, `/user/...`), stores it in `chrome.storage.local` under the `"customChannels"` key, and sends a `{ type: "refresh" }` update to YouTube tabs.

2. **Content script** (`src/extension/youtube.ts`): Fetches both groups and custom channels. Custom channel IDs are appended to `blockedChannelIds[]`. The `"refresh"` update type triggers a full re-fetch of both sources.

3. **Popup** (`src/routes/+page.svelte`): A separate "Custom" tab (only visible when the list is non-empty) shows channel IDs with a Remove button.

### Storage

- Key: `"customChannels"` — validated via `CustomChannelsSchema` (zod `z.array(z.string().min(1))`)
- No migration needed — initialized as `[]` on first run
- Deduplication by lowercase comparison

### When adding custom channel tests

- Mock `chrome.contextMenus.create` and `chrome.contextMenus.onClicked.addListener` in `vitest.setup.ts`
- Use the `CUSTOM_KEY = "customChannels"` constant in tests

## Test conventions

- Tests live in `tests/` directory
- All chrome.* APIs are mocked via `vitest.setup.ts`
- Content script tests use `environment: 'jsdom'`
- Run `bun run test:unit` (vitest)
- **Mandatory:** Every function that is created, reviewed, or updated must have corresponding tests. No function changes land without test coverage.

## State flow

```
Popup (Svelte) —chrome.runtime.sendMessage—→ Background (service worker)
  toggleGroup(groupId, enabled)                    │
                                          chrome.storage.local
  loadGroups() ←──────────────────────────────────┘
                                                    │
Background —chrome.tabs.sendMessage—→ Content script (YouTube page)
  { type: 'set', groupId }                    ↓
  { type: 'set_all', enabled }        FlatMaps enabled groups' channelIds
                                      into blockedChannelIds[]
                                              ↓
                                      Removes matching <ytd-video-renderer>
```
