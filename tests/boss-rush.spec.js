// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame, fastForwardTimers } = require('./helpers');

test.describe('Boss Rush', () => {
  test('starting an encounter sets Boss HP, deck, and turn counter correctly', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      beginBossFight('verdant', null, 'ashen_warlord');
      return {
        mode: state.mode,
        bossActive: state.boss && state.boss.active,
        bHealth: state.players.B.health,
        bMaxHealth: state.players.B.maxHealth,
        bDeckLen: state.players.B.deck.length,
        bHandLen: state.players.B.hand.length,
      };
    });
    expect(result.mode).toBe('ai');
    expect(result.bossActive).toBe(true);
    expect(result.bHealth).toBe(100);
    expect(result.bMaxHealth).toBe(100);
    // 15-card deck minus opening hand (mulligan hasn't run yet at this point).
    expect(result.bDeckLen + result.bHandLen).toBe(15);
  });

  test('a full playthrough (bot vs Boss AI) runs to completion with zero page errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await openGame(page);
    await fastForwardTimers(page);

    const result = await page.evaluate(async () => {
      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
      beginBossFight('ashborn', null, 'ancient_grove');
      document.getElementById('mulliganConfirmBtn').click();
      await sleep(20);

      let guard = 0;
      while (!state.gameOver && state.boss.turnCounter <= 25 && guard < 500) {
        guard++;
        if (state.active === 'A') {
          // Naive bot: play whatever's affordable, attack with anything ready.
          const p = state.players.A;
          for (let i = 0; i < 20; i++) {
            const hand = p.hand.slice().sort((a, b) => b.cost - a.cost);
            const card = hand.find(c => c.cost <= p.ap && (c.type !== 'unit' || p.board.some(s => s === null)));
            if (!card) break;
            playCard('A', p.hand.indexOf(card));
          }
          allUnits('A').filter(u => u.row !== 'support' && !u.hasAttacked && !u.summoningSick).forEach(u => {
            const vt = validTargetsFor('A');
            if (vt.faceAllowed) attackAction('A', u.uid, 'face');
            else if (vt.units.length) attackAction('A', u.uid, 'unit', vt.units[0].uid);
          });
          if (!state.gameOver) endTurn();
        }
        await sleep(5);
      }
      return { gameOver: state.gameOver, turn: state.boss.turnCounter, guard };
    });

    expect(pageErrors).toEqual([]);
    expect(result.guard).toBeLessThan(500); // didn't hit the runaway-loop guard
    expect(result.gameOver).toBe(true);
  });

  test('win/loss messaging uses the Boss name once the encounter ends', async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      beginBossFight('ashborn', null, 'ancient_grove');
      document.getElementById('mulliganConfirmBtn').click();
      state.players.B.health = 0;
      checkWinLoss();
    });
    // checkWinLoss() shows the end screen via a 350ms setTimeout (lets combat
    // FX finish first) rather than synchronously — wait for it instead of
    // racing it. #endTitle has static placeholder text ("Victory") in the
    // markup even before JS ever touches it, so waiting on its textContent
    // would resolve immediately without actually waiting — wait on the
    // overlay's hidden class instead, which only changes inside showEndScreen().
    await page.waitForFunction(() => !document.getElementById('endOverlay').classList.contains('hidden'));
    const result = await page.evaluate(() => ({
      title: document.getElementById('endTitle').textContent,
      text: document.getElementById('endText').textContent,
    }));
    expect(result.title).toBe('Victory');
    expect(result.text).toContain('Ancient Grove');
  });

  test('the Boss UI status panel renders trigger countdowns without exceptions', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await openGame(page);
    // The mulligan confirm flow now plays a short async deal/collapse
    // animation before it hands off to finalizeGameStart() (which is what
    // actually populates #enemyStrip via render()) — fast-forward timers so
    // that handoff still lands before the very next evaluate() reads it,
    // same as the other timing-sensitive tests in this file.
    await fastForwardTimers(page);
    await page.evaluate(() => {
      beginBossFight('verdant', null, 'ashen_warlord');
      document.getElementById('mulliganConfirmBtn').click();
    });
    const text = await page.evaluate(() => document.getElementById('enemyStrip').innerText);
    expect(pageErrors).toEqual([]);
    expect(text).toContain('THE ASHEN WARLORD');
    expect(text).toMatch(/REINFORCEMENTS/);
    expect(text).toMatch(/WAR CRY/);
  });
});
