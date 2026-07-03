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

### Test conventions
- Tests live in `tests/` directory
- All chrome.* APIs are mocked via `vitest.setup.ts`
- Content script tests use `environment: 'jsdom'`
- Run `bun run test:unit` (vitest)

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
