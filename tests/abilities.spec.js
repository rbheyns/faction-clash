// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

/** Sets up a bare 2-player game with an empty board on both sides. Same
 * pattern as combat.spec.js's setupBareGame — these are unit-level tests of
 * individual ABILITIES[id].onPlay/onDeath/etc handlers, not full playthroughs. */
async function setupBareGame(page) {
  await page.evaluate(() => {
    beginGame('ashborn', '2p', null);
    document.getElementById('mulliganConfirmBtn').click();
    state.players.A.board = new Array(8).fill(null);
    state.players.B.board = new Array(8).fill(null);
  });
}

test.describe('ability edge cases', () => {
  test('VER010 (Nourishing Rain) does not throw when there is no friendly damage to heal and no enemy unit to redirect leftover damage to', async ({ page }) => {
    // Regression test: VER010's onPlay heals up to 3 friendly damage, then
    // deals any *unused* healing as damage to the enemy's lowest-Health
    // unit. The old code guarded the enemy-unit lookup with `if(e)` where
    // `e = combatUnits(other(side))` — combatUnits() always returns an
    // array, so that check was always true even when the array was empty,
    // and `Game.damageUnit(e[0], n)` was called with e[0] === undefined,
    // throwing "Cannot read properties of undefined (reading
    // 'damageImmuneTurn')" inside Game.damageUnit. Fixed to `if(e.length)`.
    // Both boards are empty here (no friendly damage to absorb the 3
    // healing, no enemy unit to redirect the leftover 3 damage to), which
    // is exactly the condition that used to crash.
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      let error = null;
      try {
        ABILITIES.VER010.onPlay({ side: 'A' });
      } catch (e) {
        error = e.message;
      }
      return { error };
    });
    expect(result.error).toBeNull();
  });

  test('VER010 (Nourishing Rain) still redirects unused healing as damage to the enemy\'s lowest-Health unit', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      // No friendly damaged units, so all 3 "healing" carries over as damage.
      const lowHp = makeUnit('B', 'ASH098', 'attack', false); // Scorchstone Titan: 5/18
      const highHp = makeUnit('B', 'ASH098', 'attack', false);
      lowHp.damage = 10; // curHp 8, lower than highHp's curHp 18
      state.players.B.board[0] = lowHp;
      state.players.B.board[1] = highHp;
      ABILITIES.VER010.onPlay({ side: 'A' });
      return {
        lowHpAfter: getEffStats(lowHp).curHp,
        highHpAfter: getEffStats(highHp).curHp,
      };
    });
    expect(result.lowHpAfter).toBe(5); // 8 - 3 leftover healing-as-damage
    expect(result.highHpAfter).toBe(18); // untouched
  });
});
