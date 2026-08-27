// @ts-check
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

// Regression coverage for the 2026-08-20 board-frame gem wiring (see CROSS_AGENT_LOG.md):
// the user replaced all 4 board frames with new, standardized art that has a shared top-center
// gem socket (the old frames had no such shared socket — only supportCard's had a baked-in
// amber gem). First pass reused the full card's type_<row>.png badges (plus a repurposed
// support_bottom.png medallion for supportCard) repositioned into that socket via a scale/
// translate transform, since nothing better existed yet. Second pass (this file, current
// version): the user hand-made 4 dedicated board-gem assets — attackGem_board.png,
// defenseGem_board.png, supportGem_board.png, durationGem_board.png — already exported
// pre-positioned on the same canvas as the board frames, so buildBoardCard() now just draws the
// right one as a plain full-canvas overlay, same as the frame image itself. This doesn't
// pixel-diff the render (no visual-regression harness exists in this repo) — it checks the
// structural contract instead: the right gem source is picked per frame variant, the gem image
// actually lands in the SVG, and the duration number is anchored on the shared gem-socket
// position.
test.describe('Board frame gem wiring', () => {
  test('Attack/Defense/SupportUnit board cards draw the matching dedicated board gem in the top socket', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const cases = [
        { row: 'attack', unitType: 'Human', expectedGem: 'assets/gems/attackGem_board.png' },
        { row: 'defense', unitType: 'Construct', expectedGem: 'assets/gems/defenseGem_board.png' },
        { row: 'support', unitType: 'Animal', expectedGem: 'assets/gems/supportGem_board.png' }, // supportUnit
      ];
      return cases.map(({ row, unitType, expectedGem }) => {
        const card = { id: 'TESTU', faction: 'ashborn', type: 'unit', row, unitType, attack: 4, health: 4 };
        const { svg, warnings } = CardBuilder.buildBoardCard(card, {});
        const images = Array.from(svg.querySelectorAll('image'));
        const hrefs = images.map(img => img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
        return { row, expectedGem, hrefs, warnings, gemImageCount: hrefs.filter(h => h === expectedGem).length };
      });
    });
    for (const r of result) {
      expect(r.warnings, `${r.row} board card had unexpected warnings`).toEqual([]);
      expect(r.hrefs, `${r.row} board card should draw its dedicated board gem (${r.expectedGem})`).toContain(r.expectedGem);
      expect(r.gemImageCount, `${r.row} board card should draw the gem exactly once`).toBe(1);
      // The gem is a plain full-canvas overlay now, not a repositioned/scaled fragment — confirm
      // it's drawn at the same (0,0,CANVAS.w,CANVAS.h) box as the frame image itself.
      expect(r.hrefs).not.toEqual(expect.arrayContaining([expect.stringMatching(/assets\/gems\/type_/)]));
    }
  });

  test('SupportCard board cards draw the duration gem (durationGem_board.png), not a unit gem, with the duration number on it', async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const card = { id: 'TESTS', faction: 'ashborn', type: 'support', row: 'support', duration: 3 };
      const { svg, warnings } = CardBuilder.buildBoardCard(card, {});
      const images = Array.from(svg.querySelectorAll('image'));
      const attrs = images.map(img => ({
        href: img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href'),
        x: Number(img.getAttribute('x')), y: Number(img.getAttribute('y')),
        width: Number(img.getAttribute('width')), height: Number(img.getAttribute('height')),
      }));
      const gem = attrs.find(a => a.href === CardBuilder.BOARD_GEM_SRC_BY_KEY.supportCard);
      const numberEl = Array.from(svg.querySelectorAll('text.statNumber')).find(t => t.textContent === '3');
      return {
        warnings,
        hrefs: attrs.map(a => a.href),
        gem,
        numberX: numberEl ? Number(numberEl.getAttribute('x')) : null,
        numberY: numberEl ? Number(numberEl.getAttribute('y')) : null,
        socket: CardBuilder.BOARD_GEM_SOCKET,
        canvas: CardBuilder.CANVAS,
      };
    });
    expect(result.warnings).toEqual([]);
    expect(result.gem, 'supportCard board card should draw the duration gem').toBeTruthy();
    // Plain full-canvas overlay — same box as the frame image, not a repositioned fragment.
    expect(result.gem.x).toBe(0);
    expect(result.gem.y).toBe(0);
    expect(result.gem.width).toBe(result.canvas.w);
    expect(result.gem.height).toBe(result.canvas.h);
    expect(result.hrefs.some(h => /assets\/gems\/(type_|unitType_)/.test(h || ''))).toBe(false);
    expect(result.numberX).toBe(result.socket.cx);
    expect(result.numberY).toBe(result.socket.cy);
  });

  test('boardGemSrc() picks the right dedicated asset for every frame key', async ({ page }) => {
    // Direct unit check on the lookup itself, independent of buildBoardCard() — catches a typo'd
    // path or a missing key even if the two tests above only happen to exercise the frameKey
    // values they construct.
    await openGame(page);
    const result = await page.evaluate(() => ({
      attack: CardBuilder.boardGemSrc({ type: 'unit', row: 'attack' }),
      defense: CardBuilder.boardGemSrc({ type: 'unit', row: 'defense' }),
      supportUnit: CardBuilder.boardGemSrc({ type: 'unit', row: 'support' }),
      supportCard: CardBuilder.boardGemSrc({ type: 'support', row: 'support' }),
    }));
    expect(result.attack).toBe('assets/gems/attackGem_board.png');
    expect(result.defense).toBe('assets/gems/defenseGem_board.png');
    expect(result.supportUnit).toBe('assets/gems/supportGem_board.png');
    expect(result.supportCard).toBe('assets/gems/durationGem_board.png');
  });
});
