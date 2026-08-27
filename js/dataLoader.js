/* =========================================================================
   dataLoader.js
   Loads the new card-pipeline data: one or more per-faction card files
   (ashborn_cards_batch1.json, verdant_cards_batch1.json, and
   neutral_cards_batch1.json as of 2026-08-17 — add more filenames to
   CARD_SOURCES as new batches are written, no other code needs to change),
   cards/factions.json, cards/keywords.json.

   Browsers block fetch() of local files when a page is opened directly
   from disk (file://) rather than served over http — there's no way
   around that from JS. To keep this project fully "double-click and it
   works" while still keeping the real .json files as the canonical data
   source, this loader:
     1. Tries fetch() first — this is what actually runs when the project
        is served over http(s), e.g. `python3 -m http.server`.
     2. Falls back to reading matching <script type="application/json">
        tags embedded in index.html if fetch fails or isn't available.
   Both sources contain identical data — the embedded copies are generated
   from the same files (see build_embedded_data.py) so there is still one
   true source of truth at authoring time.
   ========================================================================= */
const DataLoader = (function () {
  // Add new per-faction card files here as they're written — loadAll()
  // concatenates every file's "cards" array. Order matters only for the
  // embedded-JSON fallback IDs below (index 0 = 'embedded-cards-data',
  // index N = 'embedded-cards-data-N') — keep in sync with
  // build_embedded_data.py's card_sources list.
  const CARD_SOURCES = ['ashborn_cards_batch1.json', 'verdant_cards_batch1.json', 'neutral_cards_batch1.json', 'token_cards_batch1.json'];

  async function loadJSON(path, embeddedId) {
    try {
      const res = await fetch(path);
      if (res.ok) return await res.json();
    } catch (e) {
      /* fetch blocked (likely file://) — fall through to embedded copy */
    }
    const el = document.getElementById(embeddedId);
    if (el) {
      try { return JSON.parse(el.textContent); }
      catch (e) { console.warn(`DataLoader: embedded JSON for #${embeddedId} failed to parse`, e); }
    }
    console.warn(`DataLoader: could not load ${path} (fetch failed and no #${embeddedId} fallback found)`);
    return null;
  }

  async function loadAll() {
    const cardDocs = await Promise.all(
      CARD_SOURCES.map((path, i) => loadJSON(path, i === 0 ? 'embedded-cards-data' : `embedded-cards-data-${i}`))
    );
    const [factions, keywords] = await Promise.all([
      loadJSON('cards/factions.json', 'embedded-factions-data'),
      loadJSON('cards/keywords.json', 'embedded-keywords-data'),
    ]);
    const cards = [];
    cardDocs.forEach(doc => { if (doc && Array.isArray(doc.cards)) cards.push(...doc.cards); });
    return {
      cards,
      factions: factions || {},
      keywords: keywords || {},
    };
  }

  return { loadAll, loadJSON };
})();
