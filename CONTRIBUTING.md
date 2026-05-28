# Contributing to Clipform

Thanks for poking around. Clipform is intentionally tiny — three files, no build step — so contributions stay short and obvious.

## File layout

| File | What it does |
|---|---|
| [`manifest.json`](manifest.json) | Plugin metadata, permissions, allowed domains |
| [`code.js`](code.js) | Sandbox side — runs in Figma's plugin VM, accesses `figma.*` |
| [`ui.html`](ui.html) | UI iframe — full browser context with DOM, fetch, IndexedDB, etc. |

The two sides talk only via `postMessage`. Convention: every message has a string `type`, and handlers live next to each other.

## Running locally

There is no build step. To test changes:

1. **Figma desktop → Plugins → Development → Import plugin from manifest…** → pick `manifest.json`
2. Edit any file, save, then **Plugins → Development → Hot reload plugin** (or close+reopen)
3. Use **Plugins → Development → Show/Hide console** to see UI-side errors and `console.log` output

## Sandbox constraints — read this before you edit `code.js`

Figma's plugin sandbox runs a subset of JavaScript and rejects several modern things. These will cause cryptic parse-time errors:

- **No spread/rest in `code.js`** — neither `{...obj}` nor `[...arr]`. Use `Object.assign` / `Array.from` / push-in-a-loop instead. (UI-side `ui.html` runs in a normal browser context and supports everything.)
- **`window.prompt`, `window.alert`, `window.confirm` are blocked** in the UI iframe. Use inline UI patterns (the `+ New collection` row replaces with an input on click — that's the pattern).
- **`figma.currentUser`** requires `"permissions": ["currentuser"]` in the manifest.
- **Network access** is gated by `networkAccess.allowedDomains`. Add domains there if you fetch anywhere new.

Validate before opening a PR:

```bash
node --check code.js && echo "code.js OK"
node -e "const html=require('fs').readFileSync('ui.html','utf8'); const m=[...html.matchAll(/<script(?:\\s+type=\"module\")?>([\\s\\S]*?)<\\/script>/g)]; m.forEach((s,i) => require('vm').createScript(s[1])); console.log('ui.html scripts OK')"
grep -n "\\.\\.\\." code.js || echo "no spread in code.js"
```

## Data model

References live on a hidden Figma page named `📌 Clipform Library`. Each ref is a `RECTANGLE` with the image as a fill plus JSON metadata under `pluginData['clipform']`:

```js
{
  kind: 'reference',     // 'reference' | 'collection'
  imageHash: '...',
  collectionId: '...',
  tags: [],
  colors: [],            // 5 dominant hex strings
  addedAt: 1234567890,
  embedding: 'base64',   // 512-dim Float32Array CLIP vector
  addedBy: { id, name },
  reactions: { '👍': [{ userId, userName, at }] },
  comments: [{ id, userId, userName, text, at }],
  sourceUrl: 'https://…'
}
```

If you add a new field: update `loadLibrary` to surface it on the ref, the `add-reference` handler to persist it, and (if it's editable) an update handler. The UI auto-receives it through the next `library` message.

## Conventions

- **Sandbox-side JS** stays ES2017 (no spread, no optional chaining, no nullish coalescing — they sometimes work but not reliably).
- **UI-side JS** can use anything modern. Stick to plain JS — no React, no TypeScript, no bundler. The whole UI is hand-rolled to keep the dependency surface zero.
- **Filenames** in the screenshots folder are referenced from the README. If you add a new feature with a screenshot, save it as `screenshots/<feature>.png` and add it to the README's matching section.

## Style

- Inline comments explain *why*, not *what*. The code already says what.
- One blank line between sections inside the message handler.
- Keep UI strings short and conversational — they're surfaced in `figma.notify`, which truncates fast.

## Reporting bugs

Open an issue with the [Bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Useful things to include:

- Figma version + OS
- Console output (right-click in the plugin panel → **Open Console**)
- Steps to reproduce
- What you expected vs. what happened

## License

By contributing you agree your code is released under the [MIT License](LICENSE).
