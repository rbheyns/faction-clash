// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

/** Sets up a bare 2-player game with an empty board on both sides, ready for
 * hand-placed units via makeUnit(). Bypasses the mulligan/AI flow entirely —
 * these are unit-level tests of the combat/targeting functions, not full
 * playthroughs (see boss-rush.spec.js and tests/lint-card-data.js's sibling
 * full-game smoke tests for that level). */
async function setupBareGame(page) {
  await page.evaluate(() => {
    beginGame('ashborn', '2p', null);
    document.getElementById('mulliganConfirmBtn').click();
    // Clear both boards so each test starts from a known-empty state.
    state.players.A.board = new Array(8).fill(null);
    state.players.B.board = new Array(8).fill(null);
  });
}

test.describe('combat targeting', () => {
  test('Defense is the mandatory blocker while any Defense unit is alive', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      const defender = makeUnit('B', 'ASH020', 'defense', false);
      const attackRowUnit = makeUnit('B', 'ASH001', 'attack', false);
      state.players.B.board[0] = defender;
      state.players.B.board[1] = attackRowUnit;
      const vt = validTargetsFor('A');
      return {
        onlyDefenderTargetable: vt.units.length === 1 && vt.units[0].uid === defender.uid,
        faceAllowed: vt.faceAllowed,
      };
    });
    expect(result.onlyDefenderTargetable).toBe(true);
    expect(result.faceAllowed).toBe(false);
  });

  test('once Defense clears, Attack-row units, Support UNITS (real stats), and the face are all valid targets', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      const attackUnit = makeUnit('B', 'ASH001', 'attack', false);
      const supportUnit = makeUnit('B', 'ASH074', 'support', false); // Battle Standard-Bearer: type 'unit', row 'support'
      state.players.B.board[0] = attackUnit;
      state.players.B.board[4] = supportUnit;
      const vt = validTargetsFor('A');
      return {
        uids: vt.units.map(u => u.uid).sort(),
        expectedUids: [attackUnit.uid, supportUnit.uid].sort(),
        faceAllowed: vt.faceAllowed,
      };
    });
    expect(result.uids).toEqual(result.expectedUids);
    expect(result.faceAllowed).toBe(true);
  });

  test('duration-only Support cards (no combat stats) are never targetable, even with Defense down', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      // Any type:'support' (not type:'unit') card works here — NEU-series
      // duration cards live in the support row with no Attack/Health.
      const durationCard = { uid: 9999, cardId: 'NEU041', owner: 'B', row: 'support', turnsRemaining: 3 };
      state.players.B.board[3] = durationCard;
      const vt = validTargetsFor('A');
      return { targetsDurationCard: vt.units.some(u => u.uid === 9999) };
    });
    expect(result.targetsDurationCard).toBe(false);
  });

  test('a basic attack deals attacker Attack damage to the target and takes counter-damage back', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      // Both units need HP comfortably above the damage they're about to take
      // (curHp floor-clamps at 0, which would undercount the "drop"), and no
      // rulesText/ability that could add side-effect damage on top of the
      // plain attack — ASH098/ASH083 are vanilla stat-only bodies.
      const attacker = makeUnit('A', 'ASH098', 'attack', false);  // Scorchstone Titan: 5/18
      const target = makeUnit('B', 'ASH083', 'defense', false);   // Brimstone Bastion: 4/13
      state.players.A.board[0] = attacker;
      state.players.B.board[0] = target;
      state.active = 'A';
      const beforeTargetHp = getEffStats(target).curHp;
      const beforeAttackerHp = getEffStats(attacker).curHp;
      const ok = attackAction('A', attacker.uid, 'unit', target.uid);
      return {
        ok,
        targetHpDrop: beforeTargetHp - getEffStats(target).curHp,
        attackerHpDrop: beforeAttackerHp - getEffStats(attacker).curHp,
      };
    });
    expect(result.ok).toBe(true);
    expect(result.targetHpDrop).toBe(5); // attacker's 5 Attack
    expect(result.attackerHpDrop).toBe(4); // defender's 4 Attack counter-hit
  });

  test('Cleave hits both physical neighbors of the target', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      const attacker = makeUnit('A', 'ASH052', 'attack', false); // Direwolf Berserker: Cleave keyword
      const left = makeUnit('B', 'ASH001', 'defense', false);
      const target = makeUnit('B', 'ASH001', 'defense', false);
      const right = makeUnit('B', 'ASH001', 'defense', false);
      state.players.A.board[0] = attacker;
      state.players.B.board[0] = left;
      state.players.B.board[1] = target;
      state.players.B.board[2] = right;
      state.active = 'A';
      attackAction('A', attacker.uid, 'unit', target.uid);
      return {
        leftHp: getEffStats(left).curHp,
        rightHp: getEffStats(right).curHp,
      };
    });
    // ASH001 is 1/1; a Cleave hit from a 9-attack unit should easily kill both neighbors (curHp <= 0).
    expect(result.leftHp).toBeLessThanOrEqual(0);
    expect(result.rightHp).toBeLessThanOrEqual(0);
  });

  test('face damage equals attacker Attack when the board is clear', async ({ page }) => {
    await openGame(page);
    await setupBareGame(page);
    const result = await page.evaluate(() => {
      const attacker = makeUnit('A', 'ASH033', 'attack', false); // 5/1
      state.players.A.board[0] = attacker;
      state.active = 'A';
      const beforeHp = state.players.B.health;
      attackAction('A', attacker.uid, 'face');
      return { drop: beforeHp - state.players.B.health };
    });
    expect(result.drop).toBe(5);
  });
});
