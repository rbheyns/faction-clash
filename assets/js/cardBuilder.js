/*
 * cardBuilder.js — the single source of truth for turning a card JSON object
 * into a rendered SVG. Extracted from card_renderer.html so that
 * card_renderer.html (the gallery) and card_editor.html (the add/edit tool +
 * live preview) render pixel-identical cards from one place instead of two
 * copies that can quietly drift apart.
 *
 * Anchors/colors/curve below are the same locked values as
 * cards/card_template_v0.10.svg — measured, not guessed (see that file's
 * header comments and project memory for the "why" on each one). If you
 * change a value here, mirror it in card_template_v0.10.svg too — but
 * that file is LOCKED, so any real change starts a new version instead
 * of overwriting it (see CLAUDE.md's "Conventions" section).
 *
 * Usage:
 *   const { svg, warnings } = CardBuilder.buildCard(card, keywordNames, {
 *     onWarning: (uid, warnings) => { ... }
 *   });
 *   someContainer.appendChild(svg);
 *
 * Requires the card-text CSS classes (.cardName/.effectText/.flavorText/
 * .statNumber) and the local @font-face rules to be loaded on the page —
 * see assets/css/card_render.css.
 */
(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  // ---- Locked layout anchors, from cards/card_template_v0.10.svg / CLAUDE.md. Don't guess — these are measured. ----
  const CANVAS = { w: 2000, h: 3000 };
  // 2026-08-20: the user reworked the full-card frames the same way as the board frames
  // earlier today — split the baked-in name/effect/flavor parchment out into its own asset
  // (assets/nameplate/nameplate.png) and redrew frame_<rarity>.png as just the border ring +
  // cost gem + corner badge socket, now genuinely transparent through both the art window and
  // the parchment area (not baked together into one image the way the old frames were). New
  // frame files are 1400x2100 (old ones were 2000x3000), same convention as the board-frame
  // rework — every anchor below is re-measured against the new art and already scaled up by
  // CANVAS.w/1400 (~1.42857) to this file's 2000x3000 canvas. ART_BOX is the tightest
  // rectangle inscribed in frame_common.png's transparent hole (sampled across several rows/
  // columns, away from the corner curves and the small top/bottom-center ornament points that
  // intrude slightly further in than the straight edges) — connected-component / cross-section
  // measurement, same method as every other anchor in this file.
  const ART_BOX = { x: 225, y: 170, w: 1550, h: 2450 };
  // Cost gem socket center, per rarity. First pass used color-threshold blob detection (blue
  // gem pixels) restricted to the top-left corner of each frame — that broke on Rare and Epic,
  // whose frame metal itself is blue-tinted, so the blob bled into the ornament/bar and dragged
  // the measured center off by dozens of px (visually confirmed: cost number "moved drastically"
  // between rarities). Re-measured with a Hough circle transform against each frame's grayscale
  // corner crop instead (finds the gem's circular edge directly, immune to metal tint) — all
  // four rarities land within ~4px native (~5-6px scaled) of each other, i.e. the sockets really
  // are consistent across rarities as designed. Kept as a per-rarity table (rather than one
  // shared constant) so a future frame redesign that genuinely shifts one rarity's socket doesn't
  // require restructuring this or the COST_XY_BY_RARITY[rarity]-with-Common-fallback code/tests.
  const COST_XY_BY_RARITY = {
    common: [293, 311],
    rare: [293, 311],
    epic: [293, 311],
    legendary: [293, 311],
  };
  const ATTACK_XY = [296, 2635];
  const HEALTH_XY = [1726, 2650];
  const DURATION_XY = [1000, 2800];
  // Name/effect/flavor text now sits on the nameplate asset instead of directly on the old
  // frame's baked-in parchment — re-measured against assets/nameplate/nameplate.png (also
  // 1400x2100, scaled the same way as ART_BOX above). The scroll ribbon (name) and parchment
  // panel (effect/flavor) sit noticeably higher and taller than the old template's fixed
  // parchment area, and there's a painted divider ornament partway down the panel (a thin dark
  // line, located via row-by-row pixel-count spikes on the nameplate's alpha-masked content —
  // it reads as a sharp 2-3px-tall band with 2-3x the pixel count of the surrounding rows) that
  // marks the natural effect/flavor boundary, same role the old template's fixed 2445 flavor-
  // top boundary played. maxHeight keeps the same "symmetric growth around anchorY" meaning as
  // before.
  const EFFECT = { x: 1000, anchorY: 2266, boxW: 1120, lineHeight: 70, fontSize: 60, fill: '#1C1006', maxHeight: 560 };
  const FLAVOR = { x: 1000, anchorY: 2590, boxW: 1120, lineHeight: 60, fontSize: 55, fill: '#1C1006', maxHeight: 180 };
  // Ribbon curve re-traced against the nameplate's actual banner shape (topmost-opaque-y per
  // x-column across the ribbon, excluding its curled end-caps) — a shallower, higher arc than
  // the old frame's baked-in curve, starting point/values chosen to sit inside the ribbon's
  // visible band rather than right on its top edge; nudge if a real name visibly rides high or
  // low on the ribbon once real cards are checked.
  // Kept as a mutable point object (not a fixed path string) so a live tuning tool can adjust
  // each point and see buildCard() pick up the change on its next render — nameCurveD() below
  // builds the actual SVG path 'd' attribute from these points at render time, every time,
  // rather than baking a string once at module load.
  const NAME_CURVE = { x1: 560, y1: 1880, cx: 1000, cy: 1835, x2: 1440, y2: 1896 };
  function nameCurveD() {
    const c = NAME_CURVE;
    return `M ${c.x1} ${c.y1} Q ${c.cx} ${c.cy} ${c.x2} ${c.y2}`;
  }
  const NAME_FONT_SIZE = 94;
  const NAME_FILL = '#230B00';
  const NAME_WARN_LEN = 920;
  // The nameplate's own parchment art now provides the light background text needs to read
  // against (previously this scrim was standing in for that, blurred behind text sitting
  // directly on the illustration). Left in place, disabled, rather than deleted — re-enable if
  // a future nameplate variant ever needs the extra contrast boost.
  const SCRIM = { enabled: false, x: 520, y: 2060, w: 960, h: 560, rx: 60, fill: '#EDE0C0', opacity: 0.42, blur: 45 };
  // Nameplate art (name ribbon + effect/flavor parchment panel) — pre-positioned on the same
  // 1400x2100 canvas as the frame, same "already exported in place" convention as the board
  // gems: drawn as a plain full-canvas overlay, no repositioning transform.
  const NAMEPLATE_SRC = 'assets/nameplate/nameplate.png';

  // ---- Auto-fit floors. Text shrinks by 1px at a time until it fits its box; these are the
  // smallest size it's allowed to shrink to before giving up and just warning instead (picked
  // for readability, not measured like the layout anchors above — tune if a real card needs it).
  const NAME_MIN_FONT_SIZE = 40;
  const EFFECT_MIN_FONT_SIZE = 28;
  const FLAVOR_MIN_FONT_SIZE = 24;

  // ---- Stat numbers (cost/attack/health/duration). 1-2 digit values fit fine at the fixed
  // 130px size; 3-digit values can visibly overflow their gem socket (user-reported: an attack
  // of 999 measured wider than the attack gem). 4+ digit values are abbreviated (1k, 9.9k, ...)
  // rather than shrunk further — a tiny 4-digit numeral in a small gem socket reads worse than a
  // short abbreviation, matching the "Width-based number auto-fit / abbreviation" gap already
  // flagged in CLAUDE.md.
  const NUMBER_FONT_SIZE = 130;
  const NUMBER_MIN_FONT_SIZE = 60;
  // Measured via connected-component analysis on the real gem/socket art (same method used for
  // the cost-gem rarity-offset fix) — raw socket cross-section width at each number's anchor row:
  // attack ~174px, health ~188px, duration ~157px, cost ~310px. The values below are those
  // measured widths with a ~10% safety margin, so a number's stroke outline doesn't visually
  // touch the socket edge. (Cost's socket is big enough that cost numbers essentially never need
  // to shrink in practice — mana costs stay small — but it gets the same treatment for consistency.)
  const NUMBER_MAX_WIDTH = { cost: 280, attack: 160, health: 172, duration: 140 };

  // ---- Locked BOARD-frame anchors, from assets/frames/board/*.png. Same "measured, not
  // guessed" convention as the card-frame anchors above — see project memory's "BOARD-FRAME
  // + CARD-BACK ASSET REVIEW" entry for the full connected-component measurement writeup.
  // These are a completely separate template from the card-frame one above: board frames are
  // an oval portrait window + baked-in gem sockets, no name/rules/flavor text at all (board
  // cards render too small for body text to ever be legible — that's what the hover/hold
  // preview, which still uses the full card-frame template, is for).
  //
  // 2026-08-20: the user replaced all 4 board frames with new, standardized art — a single
  // shared oval window shape, the same baked-in attack/health gem sockets bottom-left/
  // bottom-right, and (new) a shared pentagon-ring gem socket at top-center that the old
  // frames never had (only the old supportCard frame had anything there — a baked-in amber
  // gem, unique to that one variant). Every anchor below was re-measured against the new
  // files: connected-component analysis on each frame's alpha channel for the oval window and
  // the top socket (both are real cut-out transparency in the new export — the first export
  // pass wasn't, see CROSS_AGENT_LOG.md), and color-channel thresholding for the red/blue
  // gem blobs, same methodology as the original pass just re-run against the new source art.
  // All 4 variants landed on the same pixel geometry to within 1-2px, so this is now ONE
  // shared shape/socket instead of a per-frame table — kept as a per-key object anyway since
  // that's what buildBoardCard() already reads, and a future frame variant breaking the
  // pattern would only need its own key added back.
  //
  // The new frames were exported at 1400x2100 (old ones were 2000x3000) — same 2:3 aspect
  // ratio, so it's not a layout problem, just a different source resolution; every number
  // below is already scaled up by CANVAS.w/1400 (~1.42857) to match the 2000x3000 render
  // canvas the rest of this file works in.
  //
  // 2026-08-22: the frame art was replaced again at some point after the pass above, and this
  // table was never re-measured against it — the oval clip ended up noticeably smaller than
  // the frame's actual cutout (its top edge sat ~280px too low in canvas space), leaving a
  // visible gap of empty space between the painted illustration and the frame's real window
  // (bug reported from a real screenshot: "the current oval isn't filling the entire frame
  // inside"). Re-measured with the same connected-component approach as the note above, this
  // time via a flood-fill from the canvas edge across transparent pixels to isolate the
  // enclosed oval hole from the transparent margin around the frame's own outer silhouette —
  // all 4 variants again land within a few px of each other. The bottom edge barely moved; the
  // top edge moved up by ~280px (canvas space), so the window is now taller, not just shifted.
  const BOARD_ART_ELLIPSE_BY_KEY = {
    attack:      { cx: 992, cy: 1351, rx: 618, ry: 1152 },
    defense:     { cx: 992, cy: 1351, rx: 618, ry: 1152 },
    supportUnit: { cx: 992, cy: 1351, rx: 618, ry: 1152 },
    supportCard: { cx: 992, cy: 1351, rx: 618, ry: 1152 },
  };
  // Top-center gem socket — new in the standardized frames (the old ones had no shared socket
  // here). All 4 variants land on the same position/size. Also the anchor for the duration
  // number on supportCard board cards (BOARD_DURATION_XY below), and confirmed (2026-08-20
  // second pass) to be where each dedicated board-gem asset's own art is centered too — see
  // BOARD_GEM_SRC_BY_KEY below.
  const BOARD_GEM_SOCKET = { cx: 994, cy: 337, w: 264, h: 274 };
  // Attack/Health gem-socket centers: measured via connected-component analysis on the real
  // frame_attack/frame_defense/frame_supportUnit PNGs (largest red/blue blob in the bottom-left/
  // bottom-right region of each). All three frames landed on the EXACT same pixel center for
  // both sockets — confirms the user's statement that gem positions were kept identical across
  // frame variants on purpose. frame_supportCard has neither socket (duration-only, no stats).
  const BOARD_ATTACK_XY = [541, 2380];
  const BOARD_HEALTH_XY = [1419, 2377];
  // Duration number sits directly on the duration gem in the shared top socket
  // (durationGem_board.png — see BOARD_GEM_SRC_BY_KEY below) instead of the old frame's own
  // baked-in amber gem, so it shares BOARD_GEM_SOCKET's center rather than having its own anchor.
  const BOARD_DURATION_XY = [BOARD_GEM_SOCKET.cx, BOARD_GEM_SOCKET.cy];
  // Re-measured cross-section widths against the new sockets, same ~85% safety-margin
  // convention as before (attack/health barely moved). Duration's kept conservative at 140 so
  // the number stays well clear of durationGem_board.png's painted edge — revisit with a wider
  // budget if a real duration value ever looks visually cramped on the new round gem.
  const BOARD_NUMBER_MAX_WIDTH = { attack: 240, health: 220, duration: 140 };
  // Board numbers get their own start/floor sizes (2026-08-13), decoupled from the full card
  // template's NUMBER_FONT_SIZE/NUMBER_MIN_FONT_SIZE so bumping them for board legibility doesn't
  // also change the full-size card view. ~15% larger than the previous shared 130/60 start/floor.
  const BOARD_NUMBER_FONT_SIZE = 150;
  const BOARD_NUMBER_MIN_FONT_SIZE = 70;
  // The oval art window's bounding box is nearly as tall (relative to its width)
  // as a full 1400x2100 illustration is, so a plain top-anchored cover-crop
  // (see buildBoardCard below) still shows almost the ENTIRE image — subject
  // included, but buried under however much quiet bottom-40% background the
  // piece happens to have (bug reported 2026-08-22 from a real screenshot of
  // ASH081's board card: "you can barely see the village", where the walled
  // encampment only fills the top ~45% of the source art and the rest is
  // empty foreground sand). Every illustration is composed with its subject
  // in the top 60% (Art_Direction.md), so the board art is deliberately
  // zoomed to fill the oval with just that top 60% instead of the whole
  // image — see BOARD_ART_TOP_FRACTION's use below.
  const BOARD_ART_TOP_FRACTION = 0.6;

  // Top-center gem art for the board frame's socket (2026-08-20, second pass). The first pass
  // reused the full card's type_<row>.png badges (plus a repurposed amber medallion for
  // supportCard) scaled/translated into BOARD_GEM_SOCKET, because those were the only assets
  // that existed yet and none of them were positioned for this socket. The user then hand-made 4
  // dedicated board-gem assets instead, one per frame variant, exported on the SAME 1400x2100
  // canvas as the board frames themselves and already centered on the shared top socket —
  // confirmed via connected-component analysis on each one's alpha channel: content center lands
  // at (694-697, 233-239) in native 1400x2100 coordinates, which is (991-996, 333-341) once
  // scaled to this file's 2000x3000 canvas — i.e. BOARD_GEM_SOCKET's (994, 337) to within a few
  // px, same as the frame's own socket. So these drop straight in as a plain full-canvas overlay,
  // same convention as the frame image itself — no repositioning transform needed, unlike the
  // interim type-gem reuse.
  const BOARD_GEM_SRC_BY_KEY = {
    attack: 'assets/gems/attackGem_board.png',
    defense: 'assets/gems/defenseGem_board.png',
    supportUnit: 'assets/gems/supportGem_board.png',
    supportCard: 'assets/gems/durationGem_board.png',
  };
  function boardGemSrc(card) { return BOARD_GEM_SRC_BY_KEY[boardFrameKey(card)]; }

  function el(tag, attrs, ns) {
    const e = document.createElementNS(ns || SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function setHref(imgEl, href) {
    imgEl.setAttributeNS(XLINK_NS, 'xlink:href', href);
    imgEl.setAttribute('href', href);
  }

  // ---- Asset path resolution ----
  function artCandidates(card) {
    const id = card.id; // e.g. "ASH002"
    const num = id.slice(3); // "002"
    const out = [];
    // The committed playtest bundle contains 2x-display WebP derivatives.
    // Masters stay in assets/art (ignored by Git) and remain the fallback for local work.
    if (card.art && card.art.startsWith('assets/art/') && /\.png$/i.test(card.art)) {
      out.push(card.art.replace(/^assets\/art\//, 'assets/web-art/').replace(/\.png$/i, '.webp'));
    }
    if (card.art) out.push(card.art);
    out.push(`assets/art/${card.faction}/${id}.png`);            // ASH002.png
    out.push(`assets/art/${card.faction}/ASH ${num}.png`);        // "ASH 002.png" — on-disk naming is inconsistent for at least one legacy file
    out.push(`assets/art/${card.faction}/${id.toLowerCase()}.png`);
    return [...new Set(out)];
  }
  function frameSrc(card) { return `assets/frames/card/frame_${(card.rarity || 'Common').toLowerCase()}.png`; }
  // Board-frame selection: 4 variants total, keyed off type+row (not rarity — no per-rarity
  // board frames exist, unlike the card frame). Support cards (type:'support', duration-only,
  // no stats) get 'supportCard'; Support Units (type:'unit', row:'support', has stats) get
  // 'supportUnit' — the two-tier Support distinction from CLAUDE.md, same split the frame art
  // itself encodes (see project memory). Spells never reach this — they resolve on play and
  // never occupy a board slot, so there's no frame_spell variant.
  function boardFrameKey(card) {
    if (card.type === 'support') return 'supportCard';
    if (card.row === 'attack') return 'attack';
    if (card.row === 'defense') return 'defense';
    return 'supportUnit'; // type:'unit', row:'support'
  }
  function boardFrameSrc(card) { return `assets/frames/board/frame_${boardFrameKey(card)}.png`; }
  function gemKey(card) { return card.type === 'spell' ? 'spell' : card.row; }
  function gemSrc(card) { return `assets/gems/type_${gemKey(card)}.png`; }
  // unitType gem (top-center, y≈45-298) — separate overlay art per type, all sharing the same
  // baked-in socket position (measured: bbox (875,45)-(1124,298) identical across Human/Animal/
  // Construct), same convention as the existing row/type gem. Filename convention set by the
  // real asset files: assets/gems/unitType_<lowercase name>.png.
  function unitTypeGemSrc(card) {
    return `assets/gems/unitType_${String(card.unitType || '').toLowerCase().replace(/\s+/g, '_')}.png`;
  }
  function bottomKind(card) {
    if (card.attack !== undefined && card.health !== undefined) return 'unit';
    if (card.duration !== undefined) return 'support';
    return null; // spells: no bottom module, matches the locked template's spell test card
  }
  // ---- Text measuring / wrapping. Uses a lazily-created offscreen <text> so any page
  // that loads this file gets real measurement without having to add its own markup. ----
  let measureEl = null;
  function getMeasureEl() {
    if (measureEl && document.body.contains(measureEl)) return measureEl;
    const svg = el('svg', { width: 1, height: 1, style: 'position:absolute; visibility:hidden;' });
    measureEl = el('text', { id: 'cardbuilder-measure' });
    svg.appendChild(measureEl);
    document.body.appendChild(svg);
    return measureEl;
  }

  // Keywords can be multi-word phrases (e.g. "Start of Turn"), not just single words
  // like "Invoke" — so this matches consecutive runs of words against each keyword's own
  // word sequence, not just one word at a time. Longest-phrase-first so a multi-word
  // keyword wins over any shorter keyword that happens to be a prefix of it.
  function tokenize(text, keywords) {
    const words = text.split(/\s+/).filter(Boolean);
    const bareWords = words.map(w => w.replace(/[^A-Za-z']/g, ''));
    const phrases = (keywords || [])
      .map(k => k.split(/\s+/).filter(Boolean))
      .filter(p => p.length > 0)
      .sort((a, b) => b.length - a.length);

    const tokens = [];
    let i = 0;
    while (i < words.length) {
      let matchLen = 0;
      for (const phrase of phrases) {
        if (i + phrase.length > words.length) continue;
        let ok = true;
        for (let j = 0; j < phrase.length; j++) {
          if (bareWords[i + j] !== phrase[j]) { ok = false; break; }
        }
        if (ok) { matchLen = phrase.length; break; }
      }
      if (matchLen > 0) {
        for (let j = 0; j < matchLen; j++) tokens.push({ word: words[i + j], bold: true });
        i += matchLen;
      } else {
        tokens.push({ word: words[i], bold: false });
        i += 1;
      }
    }
    return tokens;
  }
  function buildInline(container, tokens) {
    while (container.firstChild) container.removeChild(container.firstChild);
    tokens.forEach((tok, i) => {
      if (i > 0) container.appendChild(document.createTextNode(' '));
      if (tok.bold) {
        const tspan = el('tspan', { class: 'kw' });
        tspan.textContent = tok.word;
        container.appendChild(tspan);
      } else {
        container.appendChild(document.createTextNode(tok.word));
      }
    });
  }
  function measureWidth(tokens, cls, fontSize) {
    const m = getMeasureEl();
    m.setAttribute('class', cls);
    m.setAttribute('font-size', fontSize);
    buildInline(m, tokens);
    return m.getComputedTextLength();
  }
  function wrapTokens(tokens, maxWidth, cls, fontSize) {
    const lines = [];
    let current = [];
    for (const tok of tokens) {
      const tentative = current.concat([tok]);
      const w = measureWidth(tentative, cls, fontSize);
      if (w <= maxWidth || current.length === 0) {
        current = tentative;
      } else {
        lines.push(current);
        current = [tok];
      }
    }
    if (current.length) lines.push(current);
    return lines;
  }
  // ---- Auto-fit: shrink font size by 1 and re-check until text fits its box, matching how
  // over-length names/effects/flavor text should behave everywhere instead of clipping.

  // Single-line auto-fit (used for the name, which sits on a curve with no wrapping).
  // Measures the plain joined text (not the curved textPath) — the curve is a shallow arc so
  // its arc length is a close enough stand-in for the horizontal box width it needs to fit.
  function fitSingleLine(text, cls, maxWidth, startSize, minSize) {
    const tokens = String(text || '').split(/\s+/).filter(Boolean).map(w => ({ word: w, bold: false }));
    let size = startSize;
    while (size > minSize && measureWidth(tokens, cls, size) > maxWidth) size -= 1;
    return { fontSize: size, fits: measureWidth(tokens, cls, size) <= maxWidth };
  }

  // Multi-line auto-fit (used for effect/flavor). Re-wraps at each candidate font size (smaller
  // font = shorter lines = possibly fewer lines) and keeps shrinking until the resulting block
  // height (lines * lineHeight, lineHeight scaled down with the font at its original ratio)
  // fits inside maxHeight, or the size floor is hit.
  function fitWrappedBlock(paragraphTexts, spec, maxHeight, startSize, minSize, keywordNames) {
    const lineHeightRatio = spec.lineHeight / spec.fontSize;
    let size = startSize;
    let lineHeight, allLines, paragraphTokens;
    while (true) {
      paragraphTokens = paragraphTexts.map(t => tokenize(t, keywordNames || []));
      allLines = [];
      paragraphTokens.forEach(tokens => allLines.push(...wrapTokens(tokens, spec.boxW, spec.cls, size)));
      lineHeight = size * lineHeightRatio;
      const blockHeight = allLines.length * lineHeight;
      if (blockHeight <= maxHeight || size <= minSize) {
        return { fontSize: size, lineHeight, paragraphTokens, fits: blockHeight <= maxHeight };
      }
      size -= 1;
    }
  }

  // Abbreviates 1000+ into "1k" / "9.9k" / "12k" style — one decimal place, trailing ".0" dropped.
  function formatStatNumber(n) {
    if (typeof n !== 'number' || !isFinite(n)) return String(n);
    if (Math.abs(n) < 1000) return String(n);
    let s = (n / 1000).toFixed(1);
    if (s.endsWith('.0')) s = s.slice(0, -2);
    return s + 'k';
  }

  // paragraphs: array of token-arrays. Each paragraph is word-wrapped independently (so an
  // explicit line break the caller put in — e.g. one keyword ability per line — survives
  // instead of being merged into one flowing block), then every resulting line across all
  // paragraphs is vertically centered together using the existing outward-grow-from-anchor
  // model, so the whole text block stays centered in its box regardless of paragraph count.
  function renderWrapped(parentG, spec, paragraphs) {
    const allLines = [];
    paragraphs.forEach(tokens => {
      allLines.push(...wrapTokens(tokens, spec.boxW, spec.cls, spec.fontSize));
    });
    const N = allLines.length;
    allLines.forEach((lineTokens, i) => {
      const y = spec.anchorY - (N - 1) * spec.lineHeight / 2 + i * spec.lineHeight;
      const t = el('text', {
        class: spec.cls, x: spec.x, y: y,
        'text-anchor': 'middle', 'font-size': spec.fontSize, fill: spec.fill
      });
      buildInline(t, lineTokens);
      parentG.appendChild(t);
    });
    return N;
  }

  // ---- Per-card SVG build ----
  // opts.onWarning(uid, warnings[]) is called whenever the warnings list changes,
  // including asynchronously (art-not-found, name-overflow-risk checked next frame).
  function buildCard(card, keywordNames, opts) {
    opts = opts || {};
    const onWarning = opts.onWarning || function () {};
    const uid = (card.id || 'preview') + '-' + Math.random().toString(36).slice(2, 8);
    const svg = el('svg', { xmlns: SVG_NS, viewBox: `0 0 ${CANVAS.w} ${CANVAS.h}`, width: CANVAS.w, height: CANVAS.h });

    const defs = el('defs');
    const clip = el('clipPath', { id: `ArtworkMask-${uid}` });
    clip.appendChild(el('rect', { x: ART_BOX.x, y: ART_BOX.y, width: ART_BOX.w, height: ART_BOX.h }));
    defs.appendChild(clip);
    const curve = el('path', { id: `NameCurve-${uid}`, d: nameCurveD(), fill: 'none' });
    defs.appendChild(curve);
    const filter = el('filter', { id: `nameShadow-${uid}`, x: '-30%', y: '-30%', width: '160%', height: '160%' });
    filter.appendChild(el('feDropShadow', { dx: 0, dy: 4, stdDeviation: 2.5, 'flood-color': '#000000', 'flood-opacity': 0.75 }));
    defs.appendChild(filter);
    if (SCRIM.enabled) {
      const scrimFilter = el('filter', { id: `scrimBlur-${uid}`, x: '-50%', y: '-50%', width: '200%', height: '200%' });
      scrimFilter.appendChild(el('feGaussianBlur', { stdDeviation: SCRIM.blur }));
      defs.appendChild(scrimFilter);
    }
    svg.appendChild(defs);

    const warnings = [];

    // Layer 1: illustration
    const illGroup = el('g', { 'clip-path': `url(#ArtworkMask-${uid})` });
    const artImg = el('image', { x: ART_BOX.x, y: ART_BOX.y, width: ART_BOX.w, height: ART_BOX.h, preserveAspectRatio: 'xMidYMid meet' });
    const candidates = artCandidates(card);
    let ci = 0;
    setHref(artImg, candidates[ci]);
    artImg.addEventListener('error', function onErr() {
      ci++;
      if (ci < candidates.length) { setHref(artImg, candidates[ci]); }
      else { artImg.removeEventListener('error', onErr); artImg.setAttribute('opacity', '0'); warnings.push('art image not found (tried: ' + candidates.join(', ') + ')'); onWarning(uid, warnings); }
    });
    illGroup.appendChild(artImg);
    svg.appendChild(illGroup);

    // Layer 1.5: nameplate (name ribbon + effect/flavor parchment) — sits on top of the
    // illustration but under the frame, so the frame's border draws over both of them and the
    // art still shows through everywhere the nameplate doesn't cover (2026-08-20 rework: see
    // NAMEPLATE_SRC above).
    const nameplateImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
    setHref(nameplateImg, NAMEPLATE_SRC);
    svg.appendChild(nameplateImg);

    // Layer 2: frame
    const frameImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
    setHref(frameImg, frameSrc(card));
    svg.appendChild(frameImg);

    // Layer 3: type gem
    const gemImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
    setHref(gemImg, gemSrc(card));
    svg.appendChild(gemImg);

    // Layer 4: bottom module
    const bk = bottomKind(card);
    if (bk) {
      const bottomImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
      setHref(bottomImg, `assets/bottoms/${bk}_bottom.png`);
      svg.appendChild(bottomImg);
    }

    // Layer 4.2: unit-type gem (top-center) — Unit cards only (attack/defense/support rows all
    // qualify, since bk === 'unit' covers all of them), and only once a unitType is actually set.
    // Drawn after the frame so it isn't covered by the frame's border art, same as the row/type
    // gem above. NOTE: like the row/type gem, this hasn't been rarity-offset-checked the way the
    // cost gem was — if Rare/Epic/Legendary frames turn out to have their top-center socket in a
    // slightly different spot the way the cost-gem sockets did, measure and add an offset then.
    if (bk === 'unit' && card.unitType) {
      const utImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
      const utSrc = unitTypeGemSrc(card);
      setHref(utImg, utSrc);
      utImg.addEventListener('error', function onErr() {
        utImg.removeEventListener('error', onErr);
        utImg.setAttribute('opacity', '0');
        warnings.push(`unit-type gem not found for unitType "${card.unitType}" (tried: ${utSrc})`);
        onWarning(uid, warnings);
      });
      svg.appendChild(utImg);
    }

    // Layer 4.5: soft brightness scrim behind effect+flavor text
    if (SCRIM.enabled) {
      const scrimRect = el('rect', {
        x: SCRIM.x, y: SCRIM.y, width: SCRIM.w, height: SCRIM.h, rx: SCRIM.rx,
        fill: SCRIM.fill, 'fill-opacity': SCRIM.opacity, filter: `url(#scrimBlur-${uid})`
      });
      svg.appendChild(scrimRect);
    }

    // Layer 5-7: text
    const textLayer = el('g');

    // Stat numbers: format (abbreviate 1000+) then auto-fit against that position's measured
    // socket width, shrinking from NUMBER_FONT_SIZE down to NUMBER_MIN_FONT_SIZE if needed.
    function addStatNumber(value, x, y, maxWidth, label, extraClass) {
      const display = formatStatNumber(value);
      const fit = fitSingleLine(display, 'statNumber', maxWidth, NUMBER_FONT_SIZE, NUMBER_MIN_FONT_SIZE);
      const cls = extraClass ? `statNumber ${extraClass}` : 'statNumber';
      const t = el('text', { class: cls, x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fit.fontSize });
      t.textContent = display;
      textLayer.appendChild(t);
      if (!fit.fits) {
        warnings.push(`${label} "${display}" still doesn't fit at the ${NUMBER_MIN_FONT_SIZE}px auto-fit floor (socket is ~${maxWidth}px wide)`);
        onWarning(uid, warnings);
      }
    }

    // Cost — position is per-rarity to match where each frame's gem socket actually is (see COST_XY_BY_RARITY above)
    const costRarityKey = (card.rarity || 'Common').toLowerCase();
    const costXY = COST_XY_BY_RARITY[costRarityKey] || COST_XY_BY_RARITY.common;
    // opts.costModified: 'lower'/'higher' when the caller's effective cost differs from the
    // card's base cost (a discount/increase effect) — green for lower, red for higher, plain
    // white otherwise. See .statNumber-cost-lower/-higher in card_render.css.
    const costClass = opts.costModified === 'lower' ? 'statNumber-cost-lower'
      : opts.costModified === 'higher' ? 'statNumber-cost-higher' : null;
    addStatNumber(card.cost, costXY[0], costXY[1], NUMBER_MAX_WIDTH.cost, 'cost number', costClass);

    if (bk === 'unit') {
      addStatNumber(card.attack, ATTACK_XY[0], ATTACK_XY[1], NUMBER_MAX_WIDTH.attack, 'attack number');
      // opts.healthDamaged: caller (board unit hover preview) tells us the unit's current
      // health is below its max so the number reads red here too, same as the board card.
      addStatNumber(card.health, HEALTH_XY[0], HEALTH_XY[1], NUMBER_MAX_WIDTH.health, 'health number', opts.healthDamaged ? 'statNumber-damaged' : null);
    } else if (bk === 'support') {
      addStatNumber(card.duration, DURATION_XY[0], DURATION_XY[1], NUMBER_MAX_WIDTH.duration, 'duration number');
    }

    // Name (single line on the curve). fitSingleLine() gives a fast first-pass size by measuring
    // the name as straight text (cheap, works before the element is even in the DOM) — but the
    // real name renders on a curved textPath, and curved text-on-a-path layout can measure a bit
    // differently from straight text depending on the browser/OS font-rendering stack (seen in
    // practice: fit fine on one machine, ~20px over on another for the same card). So this is a
    // starting point, not the final answer — see the post-render correction loop below, which is
    // the one that actually decides the rendered size.
    const nameStartFit = fitSingleLine(card.name || '', 'cardName', NAME_WARN_LEN, NAME_FONT_SIZE, NAME_MIN_FONT_SIZE);
    const nameText = el('text', { class: 'cardName', 'font-size': nameStartFit.fontSize, fill: NAME_FILL, filter: `url(#nameShadow-${uid})` });
    const textPath = el('textPath', { 'text-anchor': 'middle', startOffset: '50%' });
    textPath.setAttributeNS(XLINK_NS, 'xlink:href', `#NameCurve-${uid}`);
    textPath.setAttribute('href', `#NameCurve-${uid}`);
    textPath.textContent = card.name || '';
    nameText.appendChild(textPath);
    textLayer.appendChild(nameText);

    // Effect text (keywords bolded inline). Split on explicit line breaks first — e.g.
    // multiple keyword abilities, each on its own line — so they stack instead of wrapping
    // together as one paragraph; each line is then still auto-wrapped if it's too wide.
    // Auto-fit: shrink font size (and proportionally line-height) until the wrapped block's
    // height fits the effect box, instead of overflowing it.
    if (card.rulesText) {
      const paragraphTexts = card.rulesText.split('\n');
      const fit = fitWrappedBlock(paragraphTexts, { ...EFFECT, cls: 'effectText' }, EFFECT.maxHeight, EFFECT.fontSize, EFFECT_MIN_FONT_SIZE, keywordNames);
      renderWrapped(textLayer, { ...EFFECT, cls: 'effectText', fontSize: fit.fontSize, lineHeight: fit.lineHeight }, fit.paragraphTokens);
      if (!fit.fits) {
        warnings.push(`effect text still doesn't fit at the ${EFFECT_MIN_FONT_SIZE}px auto-fit floor — consider shorter rules text`);
        onWarning(uid, warnings);
      }
    }

    // Flavor text (quoted, per the locked template's example) — single paragraph, no hard breaks.
    // Same auto-fit treatment as effect text, against the (smaller) flavor box.
    if (card.flavorText) {
      const quoted = `“${card.flavorText}”`;
      const fit = fitWrappedBlock([quoted], { ...FLAVOR, cls: 'flavorText' }, FLAVOR.maxHeight, FLAVOR.fontSize, FLAVOR_MIN_FONT_SIZE, []);
      renderWrapped(textLayer, { ...FLAVOR, cls: 'flavorText', fontSize: fit.fontSize, lineHeight: fit.lineHeight }, fit.paragraphTokens);
      if (!fit.fits) {
        warnings.push(`flavor text still doesn't fit at the ${FLAVOR_MIN_FONT_SIZE}px auto-fit floor — consider shorter flavor text`);
        onWarning(uid, warnings);
      }
    }

    svg.appendChild(textLayer);

    // Post-render auto-fit: this is the real, authoritative pass for the name — it measures the
    // actual curved textPath (only possible once the element is attached and laid out, hence
    // requestAnimationFrame) and keeps shrinking font-size 1px at a time against that real number,
    // instead of trusting the straight-text estimate above. This is what actually corrects cases
    // where straight-text and curved-text measurement diverge (seen in practice: a name that
    // measured as fitting on one machine rendered ~20px over on another — different browser/OS
    // font-rendering stacks measure curved text-on-a-path slightly differently). Only warn if it
    // still doesn't fit once shrunk all the way to the floor.
    requestAnimationFrame(() => {
      try {
        let size = nameStartFit.fontSize;
        let len = nameText.getComputedTextLength();
        while (len > NAME_WARN_LEN && size > NAME_MIN_FONT_SIZE) {
          size -= 1;
          nameText.setAttribute('font-size', size);
          len = nameText.getComputedTextLength();
        }
        if (len > NAME_WARN_LEN) {
          warnings.push(`name still doesn't fit at the ${NAME_MIN_FONT_SIZE}px auto-fit floor (renders at ${Math.round(len)}px) — consider a shorter name`);
          onWarning(uid, warnings);
        }
      } catch (e) { /* ignore in browsers that don't support this on textPath text */ }
    });

    return { svg, warnings, uid };
  }

  // ---- Per-card BOARD-frame SVG build. Much simpler than buildCard() above: no name/rules/
  // flavor text (board cards render far too small for body text — that's what the hover/hold
  // preview is for, and it still uses the full buildCard() template), just illustration +
  // frame + the 1-2 stat numbers that fit in the frame's baked-in gem sockets.
  function buildBoardCard(card, opts) {
    opts = opts || {};
    const onWarning = opts.onWarning || function () {};
    const uid = (card.id || 'board') + '-' + Math.random().toString(36).slice(2, 8);
    const svg = el('svg', { xmlns: SVG_NS, viewBox: `0 0 ${CANVAS.w} ${CANVAS.h}`, width: CANVAS.w, height: CANVAS.h });
    const warnings = [];

    // Ellipse is per-frame-variant, not shared — see BOARD_ART_ELLIPSE_BY_KEY's comment above
    // for why (Defense's real hole is shorter and lower than the others; a shared crop clipped
    // character heads under Defense specifically).
    const frameKey = boardFrameKey(card);
    const ellipse = BOARD_ART_ELLIPSE_BY_KEY[frameKey];

    const defs = el('defs');
    const clip = el('clipPath', { id: `BoardArtMask-${uid}` });
    clip.appendChild(el('ellipse', { cx: ellipse.cx, cy: ellipse.cy, rx: ellipse.rx, ry: ellipse.ry }));
    defs.appendChild(clip);
    svg.appendChild(defs);

    // Layer 1: illustration, elliptically clipped. Fit box is the ellipse's own bounding
    // box (slice/cover, not contain — an ellipse crop should fill its window edge-to-edge
    // the way the rectangular ART_BOX does on the main card, not letterbox inside it).
    // Zoomed to BOARD_ART_TOP_FRACTION and anchored to the top (YMin), not a plain cover fit
    // centered (YMid) or even top-anchored across the FULL image height — the oval's bounding
    // box is tall enough relative to a 1400x2100 illustration that either of those still shows
    // nearly the entire image, subject and all, but buried under however much quiet bottom-40%
    // background the piece happens to have (bug reported 2026-08-22 from a real screenshot of
    // ASH081's board card: "you can barely see the village"). Achieved by fitting the image
    // into a virtual box BOARD_ART_TOP_FRACTION times taller than the real one, anchored to the
    // real box's top-left — the real box (and the ellipse clip-path applied to it) then only
    // ever reveals that top fraction of the image, cover-scaled to fill the oval's width, which
    // is exactly the subject region every illustration is composed around (Art_Direction.md).
    const illGroup = el('g', { 'clip-path': `url(#BoardArtMask-${uid})` });
    const boxX = ellipse.cx - ellipse.rx;
    const boxY = ellipse.cy - ellipse.ry;
    const boxW = ellipse.rx * 2;
    const boxH = ellipse.ry * 2;
    const artImg = el('image', {
      x: boxX, y: boxY, width: boxW, height: boxH / BOARD_ART_TOP_FRACTION,
      preserveAspectRatio: 'xMidYMin slice',
    });
    const candidates = artCandidates(card);
    let ci = 0;
    setHref(artImg, candidates[ci]);
    artImg.addEventListener('error', function onErr() {
      ci++;
      if (ci < candidates.length) { setHref(artImg, candidates[ci]); }
      else { artImg.removeEventListener('error', onErr); artImg.setAttribute('opacity', '0'); warnings.push('art image not found (tried: ' + candidates.join(', ') + ')'); onWarning(uid, warnings); }
    });
    illGroup.appendChild(artImg);
    svg.appendChild(illGroup);

    // Layer 2: board frame (oval window + attack/health gem sockets, all painted into the PNG)
    const frameImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
    setHref(frameImg, boardFrameSrc(card));
    svg.appendChild(frameImg);

    // Layer 2.5: top-center gem, dropped into the frame's shared socket (see BOARD_GEM_SOCKET).
    // Each frame variant has its own dedicated board-gem PNG (BOARD_GEM_SRC_BY_KEY above),
    // already pre-positioned on the same canvas as the frame — a plain full-canvas overlay, same
    // as the frame image itself, no scale/translate needed.
    const gemImg = el('image', { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h });
    setHref(gemImg, boardGemSrc(card));
    svg.appendChild(gemImg);

    // Layer 3: stat number(s) dropped into whichever sockets this frame variant actually has.
    const textLayer = el('g');
    function addStat(value, xy, maxWidth, label, extraClass) {
      if (value === undefined || value === null) return;
      const display = formatStatNumber(value);
      const fit = fitSingleLine(display, 'statNumber', maxWidth, BOARD_NUMBER_FONT_SIZE, BOARD_NUMBER_MIN_FONT_SIZE);
      const cls = extraClass ? `statNumber ${extraClass}` : 'statNumber';
      const t = el('text', { class: cls, x: xy[0], y: xy[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fit.fontSize });
      t.textContent = display;
      textLayer.appendChild(t);
      if (!fit.fits) {
        warnings.push(`${label} "${display}" still doesn't fit at the ${BOARD_NUMBER_MIN_FONT_SIZE}px auto-fit floor (board socket is ~${maxWidth}px wide)`);
        onWarning(uid, warnings);
      }
    }
    if (frameKey === 'supportCard') {
      addStat(card.duration, BOARD_DURATION_XY, BOARD_NUMBER_MAX_WIDTH.duration, 'board duration number');
    } else {
      addStat(card.attack, BOARD_ATTACK_XY, BOARD_NUMBER_MAX_WIDTH.attack, 'board attack number');
      // opts.healthDamaged (set by the caller from curHp < maxHp): health reads red below
      // full health, white at full health — see .statNumber-damaged in card_render.css.
      addStat(card.health, BOARD_HEALTH_XY, BOARD_NUMBER_MAX_WIDTH.health, 'board health number', opts.healthDamaged ? 'statNumber-damaged' : null);
    }
    svg.appendChild(textLayer);

    return { svg, warnings, uid };
  }

  global.CardBuilder = {
    SVG_NS, XLINK_NS,
    CANVAS, ART_BOX, COST_XY_BY_RARITY, ATTACK_XY, HEALTH_XY, DURATION_XY, EFFECT, FLAVOR,
    NAME_CURVE, nameCurveD, NAME_FONT_SIZE, NAME_FILL, NAME_WARN_LEN, SCRIM, NAMEPLATE_SRC,
    NAME_MIN_FONT_SIZE, EFFECT_MIN_FONT_SIZE, FLAVOR_MIN_FONT_SIZE,
    NUMBER_FONT_SIZE, NUMBER_MIN_FONT_SIZE, NUMBER_MAX_WIDTH,
    BOARD_ART_ELLIPSE_BY_KEY, BOARD_ATTACK_XY, BOARD_HEALTH_XY, BOARD_DURATION_XY, BOARD_NUMBER_MAX_WIDTH,
    BOARD_NUMBER_FONT_SIZE, BOARD_NUMBER_MIN_FONT_SIZE,
    BOARD_GEM_SOCKET, BOARD_GEM_SRC_BY_KEY,
    el, setHref, artCandidates, frameSrc, gemKey, gemSrc, unitTypeGemSrc, bottomKind,
    boardFrameKey, boardFrameSrc, boardGemSrc,
    tokenize, buildInline, measureWidth, wrapTokens, renderWrapped,
    fitSingleLine, fitWrappedBlock, formatStatNumber,
    buildCard, buildBoardCard,
  };
})(window);
