// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

// Regression coverage for the 2026-08-20 full-card frame rework (see CROSS_AGENT_LOG.md): the
// user split the name/effect/flavor parchment out of frame_<rarity>.png into its own asset
// (assets/nameplate/nameplate.png) and redrew the frames with real cutout transparency through
// both the art window and the parchment area. buildCard()'s layer order changed to match:
// illustration, then nameplate, then frame on top of both, then gems/text last. This doesn't
// pixel-diff the render (no visual-regression harness exists in this repo) — it checks the
// structural contract: layer order, the nameplate drawing as a plain full-canvas overlay (same
// convention as the frame itself), and the per-rarity cost position table.
test.describe('Card frame + nameplate layering', () => {
  test('illustration draws before the nameplate, which draws before the frame', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const card = { id: 'ASH001', faction: 'ashborn', type: 'unit', row: 'attack', unitType: 'Human', attack: 1, health: 1, rarity: 'Common', cost: 0 };
      const { svg, warnings } = CardBuilder.buildCard(card, [], {});
      // The illustration lives inside a clipped <g>; everything else is a direct <image>/<g> child of the svg.
      const children = Array.from(svg.children);
      const illustrationGroupIndex = children.findIndex(c => c.tagName === 'g' && c.querySelector('image'));
      const nameplateIndex = children.findIndex(c => c.tagName === 'image' && (c.getAttribute('href') || c.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) === CardBuilder.NAMEPLATE_SRC);
      const frameIndex = children.findIndex(c => c.tagName === 'image' && (c.getAttribute('href') || c.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) === CardBuilder.frameSrc(card));
      return { warnings, illustrationGroupIndex, nameplateIndex, frameIndex };
    });
    expect(result.warnings).toEqual([]);
    expect(result.illustrationGroupIndex).toBeGreaterThanOrEqual(0);
    expect(result.nameplateIndex).toBeGreaterThan(result.illustrationGroupIndex);
    expect(result.frameIndex).toBeGreaterThan(result.nameplateIndex);
  });

  test('the nameplate is a plain full-canvas overlay, same convention as the frame image', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const card = { id: 'ASH001', faction: 'ashborn', type: 'unit', row: 'attack', unitType: 'Human', attack: 1, health: 1, rarity: 'Common', cost: 0 };
      const { svg } = CardBuilder.buildCard(card, [], {});
      const images = Array.from(svg.querySelectorAll('image'));
      const nameplateImg = images.find(img => (img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) === CardBuilder.NAMEPLATE_SRC);
      return {
        found: !!nameplateImg,
        x: nameplateImg ? Number(nameplateImg.getAttribute('x')) : null,
        y: nameplateImg ? Number(nameplateImg.getAttribute('y')) : null,
        width: nameplateImg ? Number(nameplateImg.getAttribute('width')) : null,
        height: nameplateImg ? Number(nameplateImg.getAttribute('height')) : null,
        canvas: CardBuilder.CANVAS,
      };
    });
    expect(result.found).toBe(true);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(result.canvas.w);
    expect(result.height).toBe(result.canvas.h);
  });

  test('cost number position is looked up per rarity from COST_XY_BY_RARITY', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const rarities = ['Common', 'Rare', 'Epic', 'Legendary'];
      return rarities.map(rarity => {
        const card = { id: 'ASH001', faction: 'ashborn', type: 'unit', row: 'attack', unitType: 'Human', attack: 1, health: 1, rarity, cost: 3 };
        const { svg, warnings } = CardBuilder.buildCard(card, [], {});
        const costEl = Array.from(svg.querySelectorAll('text.statNumber')).find(t => t.textContent === '3');
        const expected = CardBuilder.COST_XY_BY_RARITY[rarity.toLowerCase()];
        return {
          rarity, warnings,
          x: costEl ? Number(costEl.getAttribute('x')) : null,
          y: costEl ? Number(costEl.getAttribute('y')) : null,
          expected,
        };
      });
    });
    for (const r of result) {
      expect(r.warnings, `${r.rarity} card had unexpected warnings`).toEqual([]);
      expect(r.x, `${r.rarity} cost number x`).toBe(r.expected[0]);
      expect(r.y, `${r.rarity} cost number y`).toBe(r.expected[1]);
    }
  });

  test('an unrecognized rarity falls back to the Common cost position rather than drawing at (undefined, undefined)', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const card = { id: 'ASH001', faction: 'ashborn', type: 'unit', row: 'attack', unitType: 'Human', attack: 1, health: 1, rarity: 'Mythic', cost: 3 };
      const { svg, warnings } = CardBuilder.buildCard(card, [], {});
      const costEl = Array.from(svg.querySelectorAll('text.statNumber')).find(t => t.textContent === '3');
      return {
        warnings,
        x: costEl ? Number(costEl.getAttribute('x')) : null,
        y: costEl ? Number(costEl.getAttribute('y')) : null,
        common: CardBuilder.COST_XY_BY_RARITY.common,
      };
    });
    expect(result.warnings).toEqual([]);
    expect(result.x).toBe(result.common[0]);
    expect(result.y).toBe(result.common[1]);
  });
});
