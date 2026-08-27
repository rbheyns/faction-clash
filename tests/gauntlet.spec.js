// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame, fastForwardTimers } = require('./helpers');

test.describe('Boss Gauntlet', () => {
  test('the start-screen mode button wires up chosenMode and the deck picker like Boss Rush does', async ({ page }) => {
    // Every other test in this file drives beginBossGauntlet()/advanceGauntletToNextBoss()
    // directly, which never touches the actual start-screen click handlers — this
    // catches a typo'd data-mode attribute or a refreshDeckPicker/updateStartBtn
    // branch that only checks for 'boss' and silently misses 'gauntlet'. No saved
    // Boss deck exists in a fresh test profile, so this doesn't attempt a full
    // beginBossGauntlet() launch through the UI — just the picker wiring.
    await openGame(page);
    await page.click('.faction-card[data-faction="ashborn"]');
    await page.click('.mode-btn[data-mode="gauntlet"]');
    const result = await page.evaluate(() => ({
      chosenMode: chosenMode,
      modeBtnSelected: document.querySelector('.mode-btn[data-mode="gauntlet"]').classList.contains('selected'),
      deckPickLabel: document.getElementById('deckPickLabel').textContent,
      deckPickerVisible: document.getElementById('deckPicker').style.display !== 'none',
      noQuickPlayChip: !document.querySelector('#deckPicker .deck-chip[data-deck-id=""]'),
    }));
    expect(result.chosenMode).toBe('gauntlet');
    expect(result.modeBtnSelected).toBe(true);
    expect(result.deckPickLabel).toBe('Choose your 15-card Boss deck');
    expect(result.deckPickerVisible).toBe(true);
    expect(result.noQuickPlayChip).toBe(true); // Gauntlet, like Boss Rush, has no "Quick Play" fallback
  });

  test('a full gauntlet playthrough (bot vs both bosses) runs to completion with zero page errors', async ({ page }) => {
    // End-to-end smoke test: unlike the other tests here (which force a boss's
    // HP to 0 to test checkWinLoss()'s branching directly), this drives a real
    // AI-vs-AI game through the actual mulligan/turn/attack loop across BOTH
    // legs, clicking through the gauntlet transition overlay like a real player
    // would — the shortcut-based tests above never actually exercise
    // advanceGauntletToNextBoss() via its real UI trigger in a live game.
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await openGame(page);
    await fastForwardTimers(page);

    const result = await page.evaluate(async () => {
      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
      beginBossGauntlet('ashborn', null, 'classic');
      document.getElementById('mulliganConfirmBtn').click();
      await sleep(20);

      let guard = 0, transitions = 0;
      while (guard < 2000) {
        guard++;
        if (state.gameOver) {
          await sleep(30); // let the 350ms (fast-forwarded) setTimeout show whichever overlay applies
          const gOverlay = document.getElementById('gauntletOverlay');
          const eOverlay = document.getElementById('endOverlay');
          if (gOverlay && !gOverlay.classList.contains('hidden')) {
            document.getElementById('gauntletContinueBtn').click();
            transitions++;
            await sleep(20);
            document.getElementById('mulliganConfirmBtn').click();
            await sleep(20);
            continue;
          }
          if (eOverlay && !eOverlay.classList.contains('hidden')) break;
          continue; // neither overlay up yet — keep waiting
        }
        if (state.boss.turnCounter > 40) break; // per-leg runaway guard, mirrors boss-rush.spec.js's turn cap
        if (state.active === 'A') {
          // Naive bot: play whatever's affordable, attack with anything ready — same heuristic as boss-rush.spec.js.
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
      return {
        endShown: !document.getElementById('endOverlay').classList.contains('hidden'),
        transitions,
        guard,
        totalLegs: GAUNTLET_DEFINITIONS.classic.bossOrder.length,
      };
    });

    expect(pageErrors).toEqual([]);
    expect(result.guard).toBeLessThan(2000); // didn't hit the runaway-loop guard
    expect(result.endShown).toBe(true); // the run reached a real, terminal outcome
    // At most one transition can fire (2 bosses => at most 1 leg boundary) — a
    // win on leg 1 fires exactly 1; a loss on either leg, or a leg-1 loss,
    // fires 0. More than (totalLegs - 1) would mean the run looped somehow.
    expect(result.transitions).toBeLessThanOrEqual(result.totalLegs - 1);
  });
  test('starting a gauntlet begins on the first boss in bossOrder', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      beginBossGauntlet('ashborn', null, 'classic');
      return {
        mode: state.mode,
        bossActive: state.boss.active,
        defId: state.boss.defId,
        gauntletId: state.boss.gauntletId,
        gauntletIndex: state.boss.gauntletIndex,
        expectedFirstBoss: GAUNTLET_DEFINITIONS.classic.bossOrder[0],
        bHealth: state.players.B.health,
        expectedHealth: BOSS_DEFINITIONS[GAUNTLET_DEFINITIONS.classic.bossOrder[0]].health,
      };
    });
    expect(result.mode).toBe('ai');
    expect(result.bossActive).toBe(true);
    expect(result.defId).toBe(result.expectedFirstBoss);
    expect(result.gauntletId).toBe('classic');
    expect(result.gauntletIndex).toBe(0);
    expect(result.bHealth).toBe(result.expectedHealth);
  });

  test('defeating the first boss shows the gauntlet transition (not the end screen) and carries HP forward', async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      beginBossGauntlet('ashborn', null, 'classic');
      document.getElementById('mulliganConfirmBtn').click();
      state.players.A.health = 17; // arbitrary partial HP, distinct from any maxHealth default
      state.players.B.health = 0;
      checkWinLoss();
    });
    // checkWinLoss()'s gauntlet branch shows the transition via the same 350ms
    // setTimeout pattern as showEndScreen — wait on the overlay's hidden class
    // rather than racing the timer (same rationale as boss-rush.spec.js).
    await page.waitForFunction(() => !document.getElementById('gauntletOverlay').classList.contains('hidden'));
    const midTransition = await page.evaluate(() => ({
      endOverlayHidden: document.getElementById('endOverlay').classList.contains('hidden'),
      gauntletText: document.getElementById('gauntletText').textContent,
      firstBossDefeated: BOSS_DEFINITIONS[GAUNTLET_DEFINITIONS.classic.bossOrder[0]].name,
      secondBossName: BOSS_DEFINITIONS[GAUNTLET_DEFINITIONS.classic.bossOrder[1]].name,
    }));
    // The terminal end screen must NOT have fired — this is a mid-run transition, not a game over.
    expect(midTransition.endOverlayHidden).toBe(true);
    expect(midTransition.gauntletText).toContain(midTransition.firstBossDefeated);
    expect(midTransition.gauntletText).toContain(midTransition.secondBossName);
    expect(midTransition.gauntletText).toContain('17');

    await page.evaluate(() => {
      document.getElementById('gauntletContinueBtn').click();
      document.getElementById('mulliganConfirmBtn').click();
    });
    const afterAdvance = await page.evaluate(() => ({
      defId: state.boss.defId,
      gauntletIndex: state.boss.gauntletIndex,
      expectedSecondBoss: GAUNTLET_DEFINITIONS.classic.bossOrder[1],
      aHealth: state.players.A.health,
      bossActive: state.boss.active,
      gameOver: state.gameOver,
    }));
    expect(afterAdvance.defId).toBe(afterAdvance.expectedSecondBoss);
    expect(afterAdvance.gauntletIndex).toBe(1);
    expect(afterAdvance.aHealth).toBe(17); // carried over from the first fight, not reset to full
    expect(afterAdvance.bossActive).toBe(true);
    expect(afterAdvance.gameOver).toBe(false); // the new leg is a fresh, live encounter
  });

  test('defeating the final boss ends the whole gauntlet with a conquest-flavored victory screen', async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      // Jump straight to the last leg via the real advance function (same path
      // showGauntletTransition()'s Continue button uses) rather than re-playing
      // the first fight — exercises the actual transition code, not a hand-rolled
      // stand-in for it.
      const gdef = GAUNTLET_DEFINITIONS.classic;
      const lastIndex = gdef.bossOrder.length - 1;
      advanceGauntletToNextBoss('classic', lastIndex, 'ashborn', null, 12);
      document.getElementById('mulliganConfirmBtn').click();
      state.players.B.health = 0;
      checkWinLoss();
    });
    await page.waitForFunction(() => !document.getElementById('endOverlay').classList.contains('hidden'));
    const result = await page.evaluate(() => ({
      title: document.getElementById('endTitle').textContent,
      text: document.getElementById('endText').textContent,
      gauntletOverlayHidden: document.getElementById('gauntletOverlay').classList.contains('hidden'),
    }));
    expect(result.title).toBe('Victory');
    expect(result.text).toContain('The Classic Gauntlet');
    expect(result.gauntletOverlayHidden).toBe(true); // never showed a "next boss" interstitial — this was the last one
  });

  test('losing at any stage of a gauntlet ends the whole run as a defeat, not a transition', async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      beginBossGauntlet('ashborn', null, 'classic');
      document.getElementById('mulliganConfirmBtn').click();
      state.players.A.health = 0;
      checkWinLoss();
    });
    await page.waitForFunction(() => !document.getElementById('endOverlay').classList.contains('hidden'));
    const result = await page.evaluate(() => ({
      title: document.getElementById('endTitle').textContent,
      gauntletOverlayHidden: document.getElementById('gauntletOverlay').classList.contains('hidden'),
    }));
    expect(result.title).toBe('Defeat');
    expect(result.gauntletOverlayHidden).toBe(true);
  });
});
