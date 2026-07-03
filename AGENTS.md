# AGENTS.md — De-Mainstream YouTube Extension

## Overview

This project is a browser extension (Chrome MV3) that removes mainstream media results from YouTube searches. Built with SvelteKit, `sveltekit-adapter-chrome-extension`, Tailwind CSS v4, `@o7/icon`, and `zod`.

## Architecture

```
src/
├── extension/          # Compiled separately via esbuild (Vite plugin)
│   ├── background.ts   # Service worker — chrome.storage + runtime message broker
│   ├── channels.ts     # Channel definitions (75 mainstream outlets)
│   ├── types.ts        # Shared TS interfaces (not zod — no bundling needed here)
│   └── youtube.ts      # Content script — DOM observer + video filtering
├── lib/
│   ├── data/
│   │   └── channels.ts # Channel definitions mirror for Svelte side ($lib alias)
│   ├── stores/
│   │   └── channels.ts # Svelte writable store + chrome.runtime message helpers
│   └── types.ts        # Zod schemas shared between popup and tests
├── routes/
│   ├── +layout.svelte  # Root layout shell
│   ├── +layout.ts      # Prerender config
│   └── +page.svelte    # Popup UI — channel list with toggle checkboxes
├── app.css             # Tailwind import
├── app.html            # HTML shell
└── app.d.ts            # App type declarations
```

## Build

`vite build` — SvelteKit builds the popup, then the `extensionBuildPlugin` compiles `src/extension/*.ts` via esbuild into `build/`.

## Agent Instructions

### When adding a channel
1. Add to both `src/extension/channels.ts` AND `src/lib/data/channels.ts`
2. Add a 34×34 JPG to `static/img/channels/`
3. Update `CHANNEL_COUNT` in `src/lib/data/channels.test.ts`

### When modifying schemas
- All runtime-validated types live in `src/lib/types.ts` using zod
- `src/extension/types.ts` has plain TS interfaces for esbuild-bundled code (avoids bundling zod into the service worker)

### Test conventions
- Unit tests live alongside source (`*.test.ts`)
- All chrome.* APIs are mocked via `vitest.setup.ts`
- Content script tests use `environment: 'jsdom'`
- Run `bun run test:unit` (vitest)

## State flow

```
Popup (Svelte) —chrome.runtime.sendMessage—→ Background (service worker)
                                                    │
                                            chrome.storage.local
                                                    │
Background —chrome.tabs.sendMessage—→ Content script (YouTube page)
                                            ↓
                                    Removes matching <ytd-video-renderer>
```
