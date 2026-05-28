// Clipform — sandbox side. Talks to the Figma document, persists references
// as rectangles with image fills on a hidden "library" page so the data
// travels with the file and survives reloads. UI lives in ui.html.

const LIBRARY_PAGE_NAME = '📌 Clipform Library (plugin data — do not delete)';
const META_KEY = 'clipform';

figma.showUI(__html__, { width: 360, height: 520, themeColors: true });

// ---------- multiplayer sync ----------
// When a teammate adds a reference, reacts, or comments, Figma's multiplayer
// streams those pluginData changes to our document. Listen here and debounce-
// refresh the UI so remote edits show up without manual reload.
let _refreshTimer = null;
function scheduleRefresh() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(function () {
    _refreshTimer = null;
    pushLibrary().catch(function () {});
  }, 400);
}
try {
  figma.on('documentchange', function (event) {
    if (!event || !event.documentChanges) return;
    let touched = false;
    for (let i = 0; i < event.documentChanges.length; i++) {
      const ch = event.documentChanges[i];
      const node = ch && ch.node;
      if (!node || node.removed) continue;
      try {
        // Walk up to see if change happened inside our library page
        let p = node.type === 'PAGE' ? node : node.parent;
        while (p) {
          if (p.type === 'PAGE' && p.name === LIBRARY_PAGE_NAME) { touched = true; break; }
          p = p.parent;
        }
      } catch (e) {}
      if (touched) break;
    }
    if (touched) scheduleRefresh();
  });
} catch (e) {
  // documentchange may not be available in some editor states (e.g. FigJam);
  // single-user functionality still works without it.
}

function getLibraryPage() {
  let page = figma.root.children.find(p => p.name === LIBRARY_PAGE_NAME);
  if (!page) {
    page = figma.createPage();
    page.name = LIBRARY_PAGE_NAME;
  }
  return page;
}

function readMeta(node) {
  const raw = node.getPluginData(META_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function writeMeta(node, meta) {
  node.setPluginData(META_KEY, JSON.stringify(meta));
}

async function loadLibrary() {
  const page = getLibraryPage();
  const refs = [];
  const collections = [];
  for (const child of page.children) {
    const meta = readMeta(child);
    if (!meta) continue;
    if (meta.kind === 'reference') {
      refs.push({
        id: child.id,
        nodeId: child.id,
        name: child.name,
        width: child.width,
        height: child.height,
        imageHash: meta.imageHash,
        collectionId: meta.collectionId || null,
        tags: meta.tags || [],
        colors: meta.colors || [],
        addedAt: meta.addedAt || 0,
        embedding: meta.embedding || null,
        addedBy: meta.addedBy || null,
        reactions: meta.reactions || {},
        comments: meta.comments || [],
        sourceUrl: meta.sourceUrl || null
      });
    } else if (meta.kind === 'collection') {
      collections.push({ id: meta.id, name: meta.name });
    }
  }
  refs.sort((a, b) => b.addedAt - a.addedAt);
  return { refs, collections };
}

async function thumbnailBytes(imageHash) {
  const img = figma.getImageByHash(imageHash);
  if (!img) return null;
  try { return await img.getBytesAsync(); }
  catch (e) { return null; }
}

function currentUserPayload() {
  const u = figma.currentUser || {};
  return {
    id: u.id || '',
    name: u.name || 'You',
    photoUrl: u.photoUrl || '',
    color: u.color || ''
  };
}

async function pushLibrary() {
  const lib = await loadLibrary();
  const withBytes = await Promise.all(lib.refs.map(async function (r) {
    const out = Object.assign({}, r);
    out.bytes = await thumbnailBytes(r.imageHash);
    return out;
  }));
  figma.ui.postMessage({
    type: 'library',
    refs: withBytes,
    collections: lib.collections,
    currentUser: currentUserPayload()
  });
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'init') {
      await pushLibrary();
      const apiKey = await figma.clientStorage.getAsync('openaiApiKey');
      figma.ui.postMessage({ type: 'settings', apiKey: apiKey || '' });
      return;
    }

    if (msg.type === 'add-reference') {
      const page = getLibraryPage();
      const image = figma.createImage(new Uint8Array(msg.bytes));
      const size = await image.getSizeAsync();
      const node = figma.createRectangle();
      node.resize(size.width, size.height);
      node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];
      node.name = msg.name || 'reference';
      const author = currentUserPayload();
      writeMeta(node, {
        kind: 'reference',
        imageHash: image.hash,
        collectionId: msg.collectionId || null,
        tags: msg.tags || [],
        colors: msg.colors || [],
        addedAt: Date.now(),
        embedding: msg.embedding || null,
        addedBy: author.id || author.name ? { id: author.id, name: author.name } : null,
        reactions: {},
        comments: [],
        sourceUrl: msg.sourceUrl || null
      });
      page.appendChild(node);
      await pushLibrary();
      return;
    }

    if (msg.type === 'delete-reference') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (node) node.remove();
      await pushLibrary();
      return;
    }

    if (msg.type === 'update-reference') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) return;
      const meta = readMeta(node) || {};
      if (msg.tags !== undefined) meta.tags = msg.tags;
      if (msg.collectionId !== undefined) meta.collectionId = msg.collectionId;
      writeMeta(node, meta);
      await pushLibrary();
      return;
    }

    if (msg.type === 'create-collection') {
      const page = getLibraryPage();
      const marker = figma.createRectangle();
      marker.resize(1, 1);
      marker.visible = false;
      marker.name = `collection: ${msg.name}`;
      const id = `coll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      writeMeta(marker, { kind: 'collection', id, name: msg.name });
      page.appendChild(marker);
      await pushLibrary();
      return;
    }

    if (msg.type === 'delete-collection') {
      const page = getLibraryPage();
      for (const child of Array.from(page.children)) {
        const meta = readMeta(child);
        if (!meta) continue;
        if (meta.kind === 'collection' && meta.id === msg.id) child.remove();
        if (meta.kind === 'reference' && meta.collectionId === msg.id) {
          meta.collectionId = null;
          writeMeta(child, meta);
        }
      }
      await pushLibrary();
      return;
    }

    if (msg.type === 'place-on-canvas') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) return;
      const clone = node.clone();
      // strip plugin data so the placed copy isn't treated as part of the library
      clone.setPluginData(META_KEY, '');
      figma.currentPage.appendChild(clone);
      const center = figma.viewport.center;
      clone.x = center.x - clone.width / 2;
      clone.y = center.y - clone.height / 2;
      figma.currentPage.selection = [clone];
      figma.viewport.scrollAndZoomIntoView([clone]);
      figma.notify('Reference placed on canvas');
      return;
    }

    if (msg.type === 'notify') {
      if (msg.message) figma.notify(String(msg.message));
      return;
    }

    if (msg.type === 'update-embedding') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) return;
      const meta = readMeta(node) || {};
      meta.embedding = msg.embedding || null;
      writeMeta(node, meta);
      return;
    }

    if (msg.type === 'toggle-reaction') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) return;
      const meta = readMeta(node) || {};
      const author = currentUserPayload();
      // Per-ref reactions: { emoji: [{ userId, userName, at }] }
      const reactions = (meta.reactions && typeof meta.reactions === 'object') ? meta.reactions : {};
      const emoji = String(msg.emoji || '');
      if (!emoji) return;
      const list = Array.isArray(reactions[emoji]) ? reactions[emoji].slice() : [];
      const key = author.id || author.name;
      const idx = list.findIndex(function (r) { return (r.userId || r.userName) === key; });
      if (idx >= 0) list.splice(idx, 1);
      else list.push({ userId: author.id, userName: author.name, at: Date.now() });
      reactions[emoji] = list;
      meta.reactions = reactions;
      writeMeta(node, meta);
      await pushLibrary();
      return;
    }

    if (msg.type === 'add-comment') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) return;
      const text = String(msg.text || '').trim();
      if (!text) return;
      const meta = readMeta(node) || {};
      const author = currentUserPayload();
      const list = Array.isArray(meta.comments) ? meta.comments.slice() : [];
      list.push({
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        userId: author.id,
        userName: author.name,
        text: text.slice(0, 1000),
        at: Date.now()
      });
      meta.comments = list;
      writeMeta(node, meta);
      await pushLibrary();
      return;
    }

    if (msg.type === 'delete-comment') {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) return;
      const meta = readMeta(node) || {};
      const author = currentUserPayload();
      const list = Array.isArray(meta.comments) ? meta.comments : [];
      // Only allow the author to delete their own comment
      meta.comments = list.filter(function (c) {
        if (c.id !== msg.commentId) return true;
        const isAuthor = (author.id && c.userId === author.id) ||
                         (!author.id && c.userName === author.name);
        return !isAuthor;
      });
      writeMeta(node, meta);
      await pushLibrary();
      return;
    }

    if (msg.type === 'extract-tokens') {
      // ---- environment checks ----
      if (!figma.variables || typeof figma.variables.createVariableCollection !== 'function') {
        figma.notify('Variables API is not available in this editor');
        return;
      }
      if (typeof figma.createPaintStyle !== 'function' || typeof figma.createTextStyle !== 'function') {
        figma.notify('Styles are not available in this editor');
        return;
      }

      const node = await figma.getNodeByIdAsync(msg.id);
      if (!node) { figma.notify('Reference not found'); return; }
      const meta = readMeta(node);
      if (!meta || meta.kind !== 'reference') { figma.notify('Not a valid reference'); return; }

      // ---- color helpers ----
      function hexToRgb(hex) {
        const m = String(hex).replace('#', '').match(/.{2}/g);
        return m ? m.map(function (x) { return parseInt(x, 16); }) : [0, 0, 0];
      }
      function hexToRgbObj(hex) {
        const c = hexToRgb(hex);
        return { r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 };
      }
      function luminance(hex) {
        const c = hexToRgb(hex);
        return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      }
      function saturation(hex) {
        const c = hexToRgb(hex);
        const max = Math.max(c[0], c[1], c[2]);
        const min = Math.min(c[0], c[1], c[2]);
        return max === 0 ? 0 : (max - min) / max;
      }

      // ---- build palette: sort by luminance (lightest first), then pad ----
      const sourceColors = (meta.colors || []).slice();
      const palette = sourceColors.slice().sort(function (a, b) { return luminance(b) - luminance(a); });
      const fallbacks = ['#ffffff', '#f5f5f5', '#cccccc', '#666666', '#000000'];
      while (palette.length < 5) {
        palette.push(fallbacks[palette.length] || '#888888');
      }
      // Pick most-saturated color as accent (skip the very lightest/darkest if possible)
      const sortedBySat = sourceColors.slice().sort(function (a, b) { return saturation(b) - saturation(a); });
      const accent = sortedBySat[0] || palette[2];

      // ---- naming ----
      const refName = String(node.name || 'reference').replace(/[\/\\]/g, ' ').trim().slice(0, 40) || 'reference';
      const collName = 'Clipform — ' + refName;
      const stylePrefix = 'Clipform/' + refName + '/';

      // ---- find or create variable collection ----
      const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
      let collection = existingCollections.find(function (c) { return c.name === collName; });
      if (!collection) collection = figma.variables.createVariableCollection(collName);
      const modeId = collection.modes[0].modeId;

      // ---- variable helpers (find-or-create, then set value) ----
      const allVars = await figma.variables.getLocalVariablesAsync();
      const collectionVars = allVars.filter(function (v) { return v.variableCollectionId === collection.id; });
      function findVar(name) {
        return collectionVars.find(function (v) { return v.name === name; });
      }
      function setColor(name, hex) {
        let v = findVar(name);
        if (!v) {
          v = figma.variables.createVariable(name, collection, 'COLOR');
          collectionVars.push(v);
        }
        v.setValueForMode(modeId, hexToRgbObj(hex));
      }
      function setFloat(name, value) {
        let v = findVar(name);
        if (!v) {
          v = figma.variables.createVariable(name, collection, 'FLOAT');
          collectionVars.push(v);
        }
        v.setValueForMode(modeId, value);
      }

      // ---- color variables ----
      setColor('color/bg-base', palette[0]);
      setColor('color/bg-elevated', palette[1]);
      setColor('color/surface', palette[2]);
      setColor('color/accent', accent);
      setColor('color/text', palette[palette.length - 1]);

      // ---- spacing variables (8pt scale) ----
      setFloat('spacing/1', 4);
      setFloat('spacing/2', 8);
      setFloat('spacing/3', 12);
      setFloat('spacing/4', 16);
      setFloat('spacing/5', 24);
      setFloat('spacing/6', 32);
      setFloat('spacing/7', 48);
      setFloat('spacing/8', 64);

      // ---- radius variables ----
      setFloat('radius/sm', 4);
      setFloat('radius/md', 8);
      setFloat('radius/lg', 16);
      setFloat('radius/pill', 999);

      // ---- paint styles (parallel to color variables, named for the Styles panel) ----
      const allPaintStyles = await figma.getLocalPaintStylesAsync();
      function setPaint(name, hex) {
        let s = allPaintStyles.find(function (st) { return st.name === name; });
        if (!s) {
          s = figma.createPaintStyle();
          s.name = name;
          allPaintStyles.push(s);
        }
        s.paints = [{ type: 'SOLID', color: hexToRgbObj(hex) }];
      }
      setPaint(stylePrefix + 'Background', palette[0]);
      setPaint(stylePrefix + 'Background Elevated', palette[1]);
      setPaint(stylePrefix + 'Surface', palette[2]);
      setPaint(stylePrefix + 'Accent', accent);
      setPaint(stylePrefix + 'Text', palette[palette.length - 1]);

      // ---- text styles (Inter at a standard scale; user can swap font after) ----
      const interWeights = ['Bold', 'Semi Bold', 'Medium', 'Regular'];
      await Promise.all(interWeights.map(function (w) {
        return figma.loadFontAsync({ family: 'Inter', style: w }).catch(function () { return null; });
      }));
      const allTextStyles = await figma.getLocalTextStylesAsync();
      async function setText(name, weight, size, lineHeight) {
        let fontName = { family: 'Inter', style: weight };
        try { await figma.loadFontAsync(fontName); }
        catch (e) {
          try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); fontName = { family: 'Inter', style: 'Regular' }; }
          catch (e2) { return; }
        }
        let s = allTextStyles.find(function (st) { return st.name === name; });
        if (!s) {
          s = figma.createTextStyle();
          s.name = name;
          allTextStyles.push(s);
        }
        s.fontName = fontName;
        s.fontSize = size;
        s.lineHeight = { unit: 'PIXELS', value: lineHeight };
      }
      await setText(stylePrefix + 'Display', 'Bold', 48, 56);
      await setText(stylePrefix + 'Heading', 'Semi Bold', 32, 40);
      await setText(stylePrefix + 'Subheading', 'Medium', 20, 28);
      await setText(stylePrefix + 'Body', 'Regular', 16, 24);
      await setText(stylePrefix + 'Body Small', 'Regular', 14, 20);
      await setText(stylePrefix + 'Caption', 'Regular', 12, 16);

      figma.notify('Tokens created for "' + refName + '" — open Variables and Styles panels');
      return;
    }

    if (msg.type === 'arrange-references') {
      const layout = msg.layout || 'grid';
      const items = (msg.refs || []).filter(function (it) { return it && it.imageHash; });
      if (!items.length) {
        figma.notify('No references to arrange');
        return;
      }

      function makeCell(item, w, h, radius) {
        const r = figma.createRectangle();
        r.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
        r.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: item.imageHash }];
        r.cornerRadius = radius;
        if (item.name) r.name = item.name;
        return r;
      }

      let frame;

      if (layout === 'grid') {
        const cellSize = 280;
        const gap = 16;
        const padding = 24;
        const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)));
        frame = figma.createFrame();
        frame.name = 'Moodboard — Grid';
        frame.layoutMode = 'HORIZONTAL';
        frame.layoutWrap = 'WRAP';
        frame.itemSpacing = gap;
        frame.counterAxisSpacing = gap;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius = 12;
        frame.primaryAxisSizingMode = 'FIXED';
        frame.counterAxisSizingMode = 'AUTO';
        const frameW = cols * cellSize + (cols - 1) * gap + 2 * padding;
        frame.resize(frameW, 100);
        for (let i = 0; i < items.length; i++) {
          frame.appendChild(makeCell(items[i], cellSize, cellSize, 8));
        }
      } else if (layout === 'masonry') {
        const colCount = items.length >= 6 ? 3 : 2;
        const colW = 240;
        const gap = 12;
        const padding = 20;
        frame = figma.createFrame();
        frame.name = 'Moodboard — Masonry';
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius = 12;
        frame.layoutMode = 'HORIZONTAL';
        frame.itemSpacing = gap;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'AUTO';
        frame.counterAxisAlignItems = 'MIN';
        const cols = [];
        const colHeights = [];
        for (let i = 0; i < colCount; i++) {
          const c = figma.createFrame();
          c.name = 'col ' + (i + 1);
          c.fills = [];
          c.layoutMode = 'VERTICAL';
          c.itemSpacing = gap;
          c.primaryAxisSizingMode = 'AUTO';
          c.counterAxisSizingMode = 'AUTO';
          frame.appendChild(c);
          cols.push(c);
          colHeights.push(0);
        }
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const w = it.width > 0 ? it.width : 1;
          const h = it.height > 0 ? it.height : 1;
          const cellH = colW * (h / w);
          let minIdx = 0;
          for (let j = 1; j < colCount; j++) {
            if (colHeights[j] < colHeights[minIdx]) minIdx = j;
          }
          cols[minIdx].appendChild(makeCell(it, colW, cellH, 6));
          colHeights[minIdx] += cellH + gap;
        }
      } else if (layout === 'hero') {
        const heroW = 800;
        const heroH = 500;
        const thumbH = 110;
        const gap = 12;
        const padding = 24;
        frame = figma.createFrame();
        frame.name = 'Moodboard — Hero';
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius = 12;
        frame.layoutMode = 'VERTICAL';
        frame.itemSpacing = gap;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'AUTO';

        frame.appendChild(makeCell(items[0], heroW, heroH, 10));

        if (items.length > 1) {
          const thumbs = figma.createFrame();
          thumbs.name = 'thumbs';
          thumbs.fills = [];
          thumbs.layoutMode = 'HORIZONTAL';
          thumbs.itemSpacing = gap;
          thumbs.primaryAxisSizingMode = 'AUTO';
          thumbs.counterAxisSizingMode = 'AUTO';
          thumbs.layoutWrap = 'WRAP';
          frame.appendChild(thumbs);
          for (let i = 1; i < items.length; i++) {
            const it = items[i];
            const w = it.width > 0 ? it.width : 1;
            const h = it.height > 0 ? it.height : 1;
            const thumbW = thumbH * (w / h);
            thumbs.appendChild(makeCell(it, thumbW, thumbH, 6));
          }
        }
      } else if (layout === 'magazine') {
        // Hero on the left, 2-column wrapped grid of the rest on the right.
        const heroW = 480;
        const heroH = 600;
        const thumbSize = 180;
        const gap = 12;
        const padding = 24;
        frame = figma.createFrame();
        frame.name = 'Moodboard — Magazine';
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius = 12;
        frame.layoutMode = 'HORIZONTAL';
        frame.itemSpacing = gap;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'AUTO';
        frame.counterAxisAlignItems = 'MIN';
        frame.appendChild(makeCell(items[0], heroW, heroH, 10));
        if (items.length > 1) {
          const inner = figma.createFrame();
          inner.name = 'side grid';
          inner.fills = [];
          inner.layoutMode = 'HORIZONTAL';
          inner.layoutWrap = 'WRAP';
          inner.itemSpacing = gap;
          inner.counterAxisSpacing = gap;
          inner.primaryAxisSizingMode = 'FIXED';
          inner.counterAxisSizingMode = 'AUTO';
          inner.resize(thumbSize * 2 + gap, 10);
          frame.appendChild(inner);
          for (let i = 1; i < items.length; i++) {
            inner.appendChild(makeCell(items[i], thumbSize, thumbSize, 6));
          }
        }
      } else if (layout === 'filmstrip') {
        // Single vertical column, equal width, height keeps aspect ratio.
        const cellW = 320;
        const gap = 8;
        const padding = 16;
        frame = figma.createFrame();
        frame.name = 'Moodboard — Filmstrip';
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius = 12;
        frame.layoutMode = 'VERTICAL';
        frame.itemSpacing = gap;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'AUTO';
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const w = it.width > 0 ? it.width : 1;
          const h = it.height > 0 ? it.height : 1;
          const cellH = cellW * (h / w);
          frame.appendChild(makeCell(it, cellW, cellH, 6));
        }
      } else if (layout === 'row') {
        // Single horizontal row, equal height, width keeps aspect ratio.
        const cellH = 260;
        const gap = 12;
        const padding = 20;
        frame = figma.createFrame();
        frame.name = 'Moodboard — Row';
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius = 12;
        frame.layoutMode = 'HORIZONTAL';
        frame.itemSpacing = gap;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'AUTO';
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const w = it.width > 0 ? it.width : 1;
          const h = it.height > 0 ? it.height : 1;
          const cellW = cellH * (w / h);
          frame.appendChild(makeCell(it, cellW, cellH, 8));
        }
      } else if (layout === 'polaroid') {
        // Manually-positioned polaroids with white borders, drop shadows,
        // slight rotation. Not auto-layout — by design.
        const photoW = 220;
        const photoH = 220;
        const borderSides = 14;
        const borderBottom = 50;
        const cardW = photoW + borderSides * 2;
        const cardH = photoH + borderSides + borderBottom;
        const overlap = Math.round(cardW * 0.55);
        const pageX = 80;
        const pageY = 60;
        const totalW = pageX * 2 + cardW + Math.max(0, items.length - 1) * overlap + 40;
        const totalH = pageY * 2 + cardH + 80;
        frame = figma.createFrame();
        frame.name = 'Moodboard — Polaroid';
        frame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.95, b: 0.92 } }];
        frame.cornerRadius = 12;
        frame.resize(totalW, totalH);
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const card = figma.createFrame();
          card.name = (it.name || 'polaroid') + ' ' + (i + 1);
          card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          card.cornerRadius = 2;
          card.resize(cardW, cardH);
          card.effects = [{
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.22 },
            offset: { x: 4, y: 6 },
            radius: 14,
            spread: 0,
            visible: true,
            blendMode: 'NORMAL'
          }];
          const photo = makeCell(it, photoW, photoH, 0);
          card.appendChild(photo);
          photo.x = borderSides;
          photo.y = borderSides;
          frame.appendChild(card);
          card.x = pageX + i * overlap;
          card.y = pageY + (i % 2 === 0 ? 0 : 22);
          // gentle alternating tilt
          card.rotation = (i % 2 === 0 ? -4 : 5) + (i * 0.6);
        }
      } else {
        figma.notify('Unknown layout: ' + layout);
        return;
      }

      figma.currentPage.appendChild(frame);
      const center = figma.viewport.center;
      frame.x = Math.round(center.x - frame.width / 2);
      frame.y = Math.round(center.y - frame.height / 2);
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
      figma.notify('Moodboard created with ' + items.length + ' reference' + (items.length === 1 ? '' : 's'));
      return;
    }

    if (msg.type === 'save-selection') {
      const sel = figma.currentPage.selection;
      if (!sel.length) {
        figma.notify('Select a frame, group, or image on the canvas first');
        return;
      }
      const exports = [];
      for (const node of sel) {
        try {
          const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
          exports.push({ name: node.name, bytes });
        } catch (e) {
          figma.notify(`Couldn't export "${node.name}": ${e.message}`);
        }
      }
      if (exports.length) {
        figma.ui.postMessage({ type: 'selection-exports', exports });
      }
      return;
    }

    if (msg.type === 'save-api-key') {
      await figma.clientStorage.setAsync('openaiApiKey', msg.apiKey || '');
      figma.notify(msg.apiKey ? 'API key saved' : 'API key cleared');
      return;
    }
  } catch (e) {
    figma.notify(`Clipform error: ${e.message}`);
    figma.ui.postMessage({ type: 'error', message: String(e && e.message || e) });
  }
};
