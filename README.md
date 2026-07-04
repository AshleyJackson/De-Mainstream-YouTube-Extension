# De-Mainstream YouTube Extension

Fixes the YouTube algorithm to remove mainstream media results from searches.

## How it works

The extension groups mainstream outlets by parent company. Each group contains one or more YouTube channel IDs — toggling a group hides **all** its channels at once. For example, toggling "CBS" hides CBS, CBS News, CBS Evening News, CBS This Morning, and Face the Nation.

The toolbar icon shows a badge with the number of videos hidden on the current page. The badge clears on the YouTube home page and on page reloads.

## Tech stack

- [SvelteKit](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [`@o7/icon`](https://github.com/o7-dev/icon) (Lucide icons)
- [Zod](https://zod.dev) (runtime validation)
- [`sveltekit-adapter-chrome-extension`](https://github.com/nick-michael/sveltekit-adapter-chrome-extension) (MV3)
- [Vitest](https://vitest.dev) + [jsdom](https://github.com/jsdom/jsdom)

## Developing

Install dependencies and start the dev server:

```bash
bun install
bun run dev
```

## Building

Build the extension for production:

```bash
bun run build
```

The output lands in `build/`. Load it as an unpacked Chrome extension via `chrome://extensions` → **Load unpacked** → select the `build/` directory. See [Extension Development Basics](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/).

## Testing

```bash
bun run test:unit
```

64 tests across 5 files covering zod schemas, channel data integrity, Svelte stores, service worker message handling, and content script DOM filtering.

## Project structure

```
src/
├── extension/          # Service worker + content script (compiled via esbuild)
├── lib/                # Shared types, data, stores ($lib alias)
├── routes/             # SvelteKit popup UI
tests/                  # Vitest test files
static/                 # manifest.json, channel icons, extension icons
```

## Adding a channel group

1. Add the group entry to both `src/extension/channels.ts` and `src/lib/data/channels.ts`
2. Add a 34×34 JPG avatar to `static/img/channels/`
3. Update `GROUP_COUNT` in `tests/lib/data/channels.test.ts`

## Contributing

All function changes (new, updated, or reviewed) must include corresponding tests. No function changes land without test coverage.
