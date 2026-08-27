/* =========================================================================
   cardRenderer.js
   Thin adapter around the real painted-card pipeline (assets/js/cardBuilder.js)
   so the rest of the game (hand, board, mulligan, draw animation, hover
   preview) can keep calling CardRenderer.createCard(card, opts) exactly as
   before — only what's *inside* the returned element changed, not the API.

   Usage (unchanged from the old vector-card version):
     CardRenderer.init(factions, keywords);          // once, after data loads
     const el = CardRenderer.createCard(cardData, {  // per card, anywhere
       size: 'sm'|'md'|'lg'|'xl',
       interactive: true,
       selected: false,
       disabled: false,
       uid: 123,               // optional — stamped as data-uid for lookups
       overrideStats: {attack, health, duration}, // live/buffed values, if
                                                    // different from base data
       healthDamaged: true,     // board unit's current health < its max — renders the
                                  // health number red instead of white (see card_render.css
                                  // .statNumber-damaged); omit/false for full health
       costModified: 'lower'|'higher', // effective cost differs from the card's base cost —
                                         // green/red cost number (see .statNumber-cost-lower/-higher);
                                         // omit for the plain white unmodified cost
       boardMode: true,        // renders via CardBuilder.buildBoardCard() instead of
                                // buildCard() — the oval board-frame template (2026-08-13),
                                // no name/rules/flavor text. Used for cards actually placed
                                // on the board; everywhere else (hand, mulligan, preview,
                                // gallery) omits this and gets the normal card-frame template.
       onClick, onMouseEnter, onMouseLeave, onTouchStart, onTouchEnd, onTouchMove
     });

   createCard() returns a single finished, detached DOM element — the
   caller appends it wherever it's needed. Internally this now builds the
   real 2000x3000 painted SVG card via CardBuilder.buildCard() (the same
   engine card_renderer.html/card_editor.html use) and scales it to fit
   the wrapper via CSS, instead of the old CSS/SVG vector-drawn card.
   ========================================================================= */
const CardRenderer = (function () {
  let KEYWORD_NAMES = [];

  function init(factions, keywords) {
    KEYWORD_NAMES = Object.keys(keywords || {}).filter(k => !k.startsWith('_'));
  }

  function categoryOf(card) {
    if (card.type === 'spell') return 'spell';
    if (card.type === 'support') return 'support';
    return card.row || 'attack'; // unit: 'attack' / 'defense' / 'support'
  }

  /**
   * Build one fully assembled card element from data.
   * `card` should be a merged record: the visual fields from the card JSON
   * (id, name, faction, type, row, cost, attack/health/duration, unitType,
   * keywords, rulesText, flavorText, rarity, art) plus whatever engine-only
   * fields the caller wants carried along — CardBuilder only reads the
   * documented visual fields.
   */
  function createCard(card, opts) {
    opts = opts || {};
    const size = opts.size || 'md';
    const category = categoryOf(card);
    const stats = Object.assign(
      { attack: card.attack, health: card.health, duration: card.duration },
      opts.overrideStats || {}
    );
    // CardBuilder reads attack/health/duration straight off the card object,
    // so live/buffed values need a shallow clone rather than a mutation of
    // the shared catalog record.
    const renderCard = Object.assign({}, card, stats);

    const el = document.createElement('div');
    el.className = 'card-frame' + (opts.extraClass ? ' ' + opts.extraClass : '');
    if (opts.interactive) el.classList.add('is-interactive');
    if (opts.selected) el.classList.add('is-selected');
    if (opts.disabled) el.classList.add('is-disabled');
    if (card.rarity === 'Legendary') el.classList.add('is-legendary');
    el.dataset.faction = card.faction || 'neutral';
    el.dataset.size = size;
    el.dataset.rarity = card.rarity || 'Common';
    el.dataset.cardId = card.id;
    el.dataset.category = category;
    if (opts.uid !== undefined && opts.uid !== null) el.dataset.uid = opts.uid;
    el.title = card.rulesText || card.name;

    const wrap = document.createElement('div');
    wrap.className = 'card-painted-wrap';
    if (opts.boardMode) el.classList.add('is-board-card');
    if (window.CardBuilder) {
      const onWarning = (_uid, warns) => {
        if (warns && warns.length) console.warn('[card render]', card.id, warns[warns.length - 1]);
      };
      const built = opts.boardMode
        ? CardBuilder.buildBoardCard(renderCard, { onWarning, healthDamaged: opts.healthDamaged })
        : CardBuilder.buildCard(renderCard, KEYWORD_NAMES, { onWarning, healthDamaged: opts.healthDamaged, costModified: opts.costModified });
      const { svg, uid, warnings } = built;
      svg.dataset.builderUid = uid;
      if (warnings && warnings.length) console.warn('[card render]', card.id, warnings);
      wrap.appendChild(svg);
    } else {
      wrap.textContent = card.name || card.id || '?';
    }
    el.appendChild(wrap);

    // ---- event wiring (all optional) ----
    ['onClick', 'onMouseEnter', 'onMouseLeave', 'onTouchStart', 'onTouchEnd', 'onTouchMove'].forEach(key => {
      if (typeof opts[key] === 'function') {
        const evt = key.slice(2).toLowerCase();
        const listenerOpts = evt === 'touchstart' ? { passive: true } : undefined;
        el.addEventListener(evt, opts[key], listenerOpts);
      }
    });

    return el;
  }

  return { init, createCard, categoryOf };
})();
