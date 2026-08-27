// Shared test helpers. Kept deliberately close to the ad-hoc Playwright
// scripts used during development (see CROSS_AGENT_LOG.md's Boss Rush
// balance-pass entry) — this file formalizes that pattern into something
// committed and reusable instead of living only in /tmp.
const path = require('path');

const INDEX_HTML_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/** Navigate to the game and wait for card data to finish loading (the game
 * has no explicit "ready" event, so this waits for CARD_BY_ID to be
 * populated, which only happens once DataLoader.loadAll() resolves). */
async function openGame(page) {
  await page.goto(INDEX_HTML_URL);
  await page.waitForFunction(() => typeof CARD_BY_ID !== 'undefined' && Object.keys(CARD_BY_ID).length > 0, { timeout: 15_000 });
}

/** Installs the same setTimeout fast-forward shim used throughout this
 * session's balance testing — clamps every setTimeout to ~1ms so the AI's
 * animation-paced play/attack loop (aiTakeTurn's internal 300-450ms steps)
 * resolves almost instantly. Test-only; nothing in the shipped game changes. */
async function fastForwardTimers(page) {
  await page.evaluate(() => {
    if (window.__ffInstalled) return;
    window.__ffInstalled = true;
    const realSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, Math.min(ms, 1), ...args);
  });
}

module.exports = { INDEX_HTML_URL, openGame, fastForwardTimers };
