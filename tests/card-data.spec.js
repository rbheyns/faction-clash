// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { openGame } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const CARD_SOURCES = [
  'ashborn_cards_batch1.json',
  'verdant_cards_batch1.json',
  'neutral_cards_batch1.json',
  'token_cards_batch1.json',
];

test.describe('card data integrity', () => {
  test('canonical JSON files parse and have no duplicate ids across the whole pool', () => {
    const seen = new Map();
    let total = 0;
    for (const file of CARD_SOURCES) {
      const doc = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf-8'));
      const cards = Array.isArray(doc) ? doc : doc.cards;
      expect(Array.isArray(cards), `${file} should contain a "cards" array`).toBeTruthy();
      total += cards.length;
      for (const c of cards) {
        expect(seen.has(c.id), `duplicate card id ${c.id} (first seen in ${seen.get(c.id)}, again in ${file})`).toBeFalsy();
        seen.set(c.id, file);
        expect(c.cost, `${c.id} in ${file} is missing cost`).not.toBeUndefined();
        expect(c.type, `${c.id} in ${file} is missing type`).toBeTruthy();
      }
    }
    // Not a hardcoded magic number check — just confirms the sum of per-file
    // counts matches what CARD_BY_ID sees at runtime (checked below), so this
    // test documents "how many cards exist right now" for anyone reading output.
    expect(total).toBeGreaterThan(0);
  });

  test('runtime CARD_BY_ID matches the sum of canonical JSON files, and every card with rulesText has a wired ABILITIES entry', async ({ page }) => {
    let expectedTotal = 0;
    for (const file of CARD_SOURCES) {
      const doc = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf-8'));
      const cards = Array.isArray(doc) ? doc : doc.cards;
      expectedTotal += cards.length;
    }

    await openGame(page);
    const result = await page.evaluate(() => {
      const allCards = Object.values(CARD_BY_ID);
      const missingAbility = allCards
        .filter(c => (c.rulesText && c.rulesText.trim()) && !ABILITIES[c.id])
        .map(c => `${c.id} ${c.name}`);
      return { total: allCards.length, missingAbility };
    });

    expect(result.total, 'index.html\'s embedded/fetched card data drifted from the canonical JSON file count — run `python build_embedded_data.py --update-index` after any card-data edit').toBe(expectedTotal);
    expect(result.missingAbility, 'cards with rulesText but no matching ABILITIES[id] entry — the ability is documented on the card but never implemented').toEqual([]);
  });

  test('Boss Rush deck ids are all real, valid cards (catches a card-redesign batch renaming/removing an id a boss deck depends on)', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const problems = [];
      Object.values(BOSS_DEFINITIONS).forEach(def => {
        const total = Object.values(def.deck).reduce((a, b) => a + b, 0);
        if (total !== 15) problems.push(`${def.id}: deck totals ${total}, expected 15`);
        Object.entries(def.deck).forEach(([id, n]) => {
          if (!CARD_BY_ID[id]) problems.push(`${def.id}: references missing card id ${id}`);
          if (n > 2) problems.push(`${def.id}: ${id} has ${n} copies (max 2)`);
        });
        (def.triggers || []).forEach(t => {
          (t.summonTable || []).forEach(entry => {
            if (!CARD_BY_ID[entry.cardId]) problems.push(`${def.id}: reinforcement table references missing card id ${entry.cardId}`);
          });
        });
      });
      return problems;
    });
    expect(result).toEqual([]);
  });

  test('ABILITIES has no duplicate keys (regression guard)', async ({ page }) => {
    // Several 2026-08-18/19 card-redesign batches appended a NEW `ASH014:
    // {...}` (etc.) entry to the ABILITIES object literal instead of editing
    // the existing one in place — object literals resolve duplicate keys to
    // the LAST occurrence, so this never changed behavior, but it left ~130
    // ids with silent dead code and a landmine for future edits (easy to
    // accidentally edit the shadowed, never-executed earlier occurrence).
    // Cleaned up 2026-08-19 (see CROSS_AGENT_LOG.md) via an AST-based script
    // that removed every shadowed occurrence, verified byte-for-byte
    // functionally identical before/after. This test now enforces zero
    // duplicates going forward instead of just capping the backlog.
    await openGame(page);
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    const abilitiesStart = html.indexOf('const ABILITIES = {');
    expect(abilitiesStart, 'could not locate "const ABILITIES = {" in index.html — has it been renamed?').toBeGreaterThan(-1);
    // Find the matching closing "};" for the object literal by brace counting
    // from the opening "{" (simple and robust enough for this one well-formed
    // top-level declaration; not a general JS parser).
    let depth = 0, i = abilitiesStart + 'const ABILITIES = '.length, end = -1;
    for (; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    expect(end, 'could not find the end of the ABILITIES object literal').toBeGreaterThan(-1);
    const body = html.slice(abilitiesStart, end);
    const keys = [...body.matchAll(/^\s{2}([A-Z]+\d+):/gm)].map(m => m[1]);
    const counts = new Map();
    keys.forEach(k => counts.set(k, (counts.get(k) || 0) + 1));
    const dupeKeys = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    expect(dupeKeys, `duplicate ABILITIES entries found for: ${dupeKeys.join(', ')} — edit the existing entry in place instead of appending a new one (the new one silently wins and the old one becomes dead code)`).toEqual([]);
  });
});
