# Changelog

All notable changes to Clipform are documented here. Format roughly follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.1.0 — Initial public release

The whole plugin built in one pass. Listed by surface area for browsing.

### Capture
- Paste from clipboard (⌘V)
- Drop image files (from Finder, Desktop, anywhere)
- Drag from browser tabs — fetches via CORS, falls back to `images.weserv.nl` proxy when blocked
- Save current Figma canvas selection via the **+** button — exports each selected node as PNG
- Source-URL tracking: drags from the web remember which page they came from

### Library
- Hidden Figma page (`📌 Clipform Library`) holds every reference as a rectangle with image fill + pluginData
- 5-color palette extracted per save (3-bit-per-channel histogram, runs in browser)
- Tags + collections, sidebar with per-collection covers + palette dots
- Optional BYOK auto-tagging via OpenAI `gpt-4o-mini` vision

### Search
- Tag substring filter (type)
- Color-swatch filter (click colors in the top row)
- Visual similarity ("Find similar" button per card) — local CLIP, 512-dim, cosine-sim sort
- **Text → image AI search** — type a query, press ↵, grid resorts by CLIP semantic similarity

### Moodboard arrange
- Pick multiple refs (per-card checkbox + floating action bar)
- 7 layouts: Grid, Masonry, Hero + thumbs, Magazine, Filmstrip, Row, Polaroid
- All built as real Figma auto-layout frames on the current page — fully editable after

### Extract → tokens
- One click on any reference creates:
  - 5 color variables + paint styles (palette sorted by luminance, accent picked by saturation)
  - 8 spacing variables (4 → 64, 8pt scale) + 4 radius variables
  - 6 text styles (Inter at Display → Caption sizes)
- Idempotent — re-run on the same ref updates existing tokens instead of duplicating

### Team mode
- Author attribution per ref (`Added by Sara · 2m ago`)
- Reactions (👍 🔥 🤔 ❤️ 👀 💡)
- Comment threads per reference, authored deletions only
- Activity feed view (chronological, aggregated from adds + reactions + comments)
- `figma.on('documentchange')` listener auto-refreshes when teammates edit, debounced 400ms

### UI
- Lightbox: full-screen preview with ← / → / Esc
- Color-bar filter, model status chip, similar/search banner
- Plugin window 360×520 (compact, fits design panels alongside Figma's right rail)
- Inline new-collection input (works around blocked `prompt()`)
- Hot-reload safe — no globals leak between reloads

### Engineering
- Three files: `manifest.json`, `code.js`, `ui.html`
- No build step, no bundler, no dependencies installed locally
- CLIP loaded via Transformers.js from jsDelivr at runtime
- IndexedDB shim polyfills `self.caches` so the model survives across plugin opens (Figma's iframe lacks Cache API)
- All sandbox JS is ES2017 (no spread, the Figma plugin VM rejects it)
- Strict checks before ship: `node --check`, no `...` in `code.js`, `vm.createScript` on every UI script block
