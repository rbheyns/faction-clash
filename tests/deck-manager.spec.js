// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

test.describe('Deck Manager rules', () => {
  test('normal decks cap at 30 cards, boss decks at 15', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => ({
      normal: DECK_SIZES.normal,
      boss: DECK_SIZES.boss,
    }));
    expect(result).toEqual({ normal: 30, boss: 15 });
  });

  test('a non-Legendary card caps at 2 copies per deck', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      dmMode = 'normal';
      dmDraft = { name: 't', faction: 'ashborn', cards: {} };
      const id = 'ASH001'; // Ashborn Recruit — Common
      dmAddCopy(id); dmAddCopy(id); dmAddCopy(id); // third should be rejected
      return dmDraft.cards[id];
    });
    expect(result).toBe(2);
  });

  test('a Legendary card caps at 1 copy per deck', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      dmMode = 'normal';
      dmDraft = { name: 't', faction: 'ashborn', cards: {} };
      const id = 'ASH060'; // The Ashen Warlord — Legendary
      dmAddCopy(id); dmAddCopy(id); // second should be rejected
      return { count: dmDraft.cards[id], rarity: CARD_BY_ID[id].rarity };
    });
    expect(result.rarity).toBe('Legendary');
    expect(result.count).toBe(1);
  });

  test('deck total cannot exceed the mode\'s DECK_SIZES cap, even across many different cards', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      dmMode = 'boss'; // cap 15, easier to fill quickly than 30
      dmDraft = { name: 't', faction: 'ashborn', cards: {} };
      const ashbornCommons = Object.values(CARD_BY_ID)
        .filter(c => c.faction === 'ashborn' && c.rarity !== 'Legendary')
        .slice(0, 20); // more than enough to try to overfill a 15-card deck at 2 copies each
      ashbornCommons.forEach(c => { dmAddCopy(c.id); dmAddCopy(c.id); });
      return deckTotalCount(dmDraft);
    });
    expect(result).toBeLessThanOrEqual(15);
    expect(result).toBe(15); // should fill exactly to the cap, not stop short
  });

  test('deckIsComplete() matches the exact DECK_SIZES total for the mode', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const deck15 = { cards: { ASH001: 2, ASH009: 1, ASH021: 1, ASH033: 2, ASH038: 1, ASH046: 1, ASH052: 1, ASH060: 1, ASH008: 1, ASH025: 1, ASH063: 1, NEU009: 1, NEU038: 1 } };
      return {
        totalIs15: deckTotalCount(deck15),
        completeAsBoss: deckIsComplete(deck15, 'boss'),
        completeAsNormal: deckIsComplete(deck15, 'normal'),
      };
    });
    expect(result.totalIs15).toBe(15);
    expect(result.completeAsBoss).toBe(true);
    expect(result.completeAsNormal).toBe(false);
  });

  test('removing a copy below 1 deletes the entry entirely rather than leaving a 0-count key', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      dmMode = 'normal';
      dmDraft = { name: 't', faction: 'ashborn', cards: {} };
      dmAddCopy('ASH001');
      dmRemoveCopy('ASH001');
      return { hasKey: Object.prototype.hasOwnProperty.call(dmDraft.cards, 'ASH001'), total: deckTotalCount(dmDraft) };
    });
    expect(result.hasKey).toBe(false);
    expect(result.total).toBe(0);
  });
});
