/**
 * Crafting — the three loops a maker actually walks: the smithy's
 * deed-gated forge, the cookhouse's by-hand build, and the shop counter
 * that affords nothing it is selling.
 *
 * Ported from `e2e/tests/drive-crafting.spec.ts` (200 lines, 3 expects,
 * every one of them `getByText` used as a wire read). It drove a real
 * browser and took screenshots to prove a crafting ladder.
 *
 * ⭐⭐ **The through-line worth keeping: a craft verb refuses for a reason
 * about the WORK, never about the verb.** `forge knife` first answers
 * *"you haven't learned to forge"* — the knowledge ladder — and only
 * after the by-hand build (heat · hammer · quench) does the same command
 * forge. `sharpen` does not exist until a whetstone is in hand. Those
 * are the two halves of the affordance rule, and asserting them by NOTE
 * makes them structural.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectOkOr,
  expectNote,
} from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice.**
 *
 * The smithy scene consumes the ingot it is given and the cookhouse
 * scene EATS the table's working stock — two vegetables and the
 * stew-meat — then orders the roast whose prime cut sits in the open
 * chest. None of it is produced again. The spec's own comment records
 * the same thing from the other side: *"the pantry is spent"*.
 *
 * A cookhouse that stocks one meal's worth and never restocks is a world
 * that does not feed itself. Same question as `cooking.dirty`, one floor
 * over.
 */
export const DIRTY_REASON =
  'consumes the smithy ingot and the cookhouse table stock (vegetables, ' +
  'stew-meat, the chest’s prime cut); none of it is produced again';

declareFile({
  file: 'crafting.dirty.wire.test.ts',
  packs: ['trade-smithing', 'trade-cooking', 'hearthworks', 'terminus'],
  dirtyReason: DIRTY_REASON,
});

const SMITHY = '/world/hearthworks/location/smithy';
const COOKHOUSE = '/world/hearthworks/location/cookhouse';
const STORE = '/world/terminus/general-store/shop-floor';

/** The verb reached its own gate rather than the parser. */
function reachedItsGate(result: {
  notes: { kind: string }[];
  text: string;
}): void {
  const unknown = result.notes.find(
    (n) =>
      n.kind === 'command-rejected' &&
      (n as { reason?: string }).reason === 'unknown-verb'
  );
  expect(
    unknown,
    `'${result.text}' was not afforded at all — the parser refused it`
  ).toBeUndefined();
}

/** The verb is NOT afforded here — the other half of the rule. */
function notAfforded(result: { notes: { kind: string }[]; text: string }): void {
  const unknown = result.notes.find(
    (n) =>
      n.kind === 'command-rejected' &&
      (n as { reason?: string }).reason === 'unknown-verb'
  );
  expect(
    unknown,
    `'${result.text}' IS afforded now — the scene has grown an instrument, ` +
      `and this checkpoint should become the positive one`
  ).toBeDefined();
}

suite('the smithy — the knowledge ladder is real', () => {
  let s: Session;
  beforeAll(async () => {
    s = await Session.open(uniqueHandle('smith'), { startLocation: SMITHY });
  }, 120_000);
  afterAll(() => s?.close());

  it('the menu names what this floor can make', async () => {
    expect(await s.prose('menu')).toMatch(/Belt Knife/i);
  });

  it('⭐ `forge` is afforded and refuses on the DEED, not the verb', async () => {
    const early = await s.cmd('forge knife');
    reachedItsGate(early);
    // A cook who has never worked one by hand is told to do that first.
    expect(await early.said()).toMatch(/haven't learned to forge/i);
  }, 60_000);

  it('the by-hand build teaches it: pump · heat · hammer · quench', async () => {
    expectOkOr(await s.cmd('pump forge'), 'already-burning');
    expectOk(await s.cmd('heat ingot'));
    expectOk(await s.cmd('hammer ingot'));
    const quenched = await s.cmd('quench ingot');
    expectOk(quenched);
    expect(
      await quenched.said(),
      'the deed is conferred by DOING it'
    ).toMatch(/worked out how to forge/i);
  }, 180_000);

  it('⭐ …and now the same command forges', async () => {
    const forged = await s.cmd('forge knife');
    expectOk(forged);
    expect(await forged.said()).toMatch(/You forge/i);
  }, 120_000);

  it('the blade reads as a weapon with a playstyle', async () => {
    const said = await s.prose('analyze weapon knife');
    expect(said).toMatch(/Playstyle of/i);
    expect(said).toMatch(/edge keen/i);
  }, 60_000);

  it('⭐ `sharpen` does not exist until a whetstone is in hand', async () => {
    notAfforded(await s.cmd('sharpen knife'));
    expectOk(await s.cmd('get whetstone'));
    const sharpened = await s.cmd('sharpen knife');
    expectOk(sharpened);
    expect(await sharpened.said()).toMatch(/long slow strokes|keen again/i);
  }, 120_000);

  it('a sound blade needs no repair, and salvage costs you most of it', async () => {
    expect(await s.prose('repair knife')).toMatch(/already sound/i);
    expect(await s.prose('salvage knife')).toMatch(/mostly loses/i);
    expect(await s.prose('find lump')).toMatch(/salvaged lump of iron/i);
  }, 120_000);
});

suite('the cookhouse — built by hand, and the pantry runs out', () => {
  let c: Session;
  beforeAll(async () => {
    c = await Session.open(uniqueHandle('craftcook'), {
      startLocation: COOKHOUSE,
    });
  }, 120_000);
  afterAll(() => c?.close());

  it('the menu names the stew', async () => {
    expect(await c.prose('menu')).toMatch(/Hearty Stew/i);
  });

  it('the table’s working stock goes in the pot by hand', async () => {
    // ⚠ The CHEST keeps the dear cuts — a craft GATHER reaches into it,
    // hands do not. What is on the table is what hands can use.
    expectOkOr(await c.cmd('ignite hearth'), 'already-burning');
    for (const add of [
      'add vegetables to pot',
      'add vegetables to pot',
      'add stew-meat to pot',
    ]) {
      const r = await c.cmd(add);
      expectOk(r);
      expect(await r.said()).toMatch(/You add/i);
    }
    expectOk(await c.cmd('stir pot'));
    const heated = await c.cmd('heat pot');
    expectOk(heated);
    expect(await heated.said()).toMatch(/takes the heat/i);
  }, 300_000);

  it('plating it teaches the cook, and the plate carries honest macros', async () => {
    const plated = await c.cmd('plate pot into dish');
    expectOk(plated);
    expect(await plated.said()).toMatch(/worked out how to cook/i);
    // ⚠ `look stew`, not `look dish`: the bulk material-keyword path.
    // Bare `look dish` opens a which-target prompt this test cannot
    // answer, because two dishes are standing there.
    expect(await c.prose('look stew')).toMatch(/Nutrition:/i);
  }, 180_000);

  it('⭐ the spent pantry declines honestly; the open chest still serves', async () => {
    // Two halves of one claim: a venue refuses for STOCK, in words a
    // player can act on — and the maker's gather walk still reaches the
    // prime cut in the open chest (the open-container rung, live).
    expect(await c.prose('order stew')).toMatch(/isn't enough|no one on hand/i);
    expect(await c.prose('order roast')).toMatch(/set down in front of you/i);
  }, 180_000);
});

suite('the general store — shop goods afford nothing', () => {
  let sh: Session;
  beforeAll(async () => {
    sh = await Session.open(uniqueHandle('shopper'), { startLocation: STORE });
  }, 120_000);
  afterAll(() => sh?.close());

  it('the machine is real, minted stock on the counter', async () => {
    expect(await sh.prose('look counter')).toMatch(/sewing-machine \(18\)/i);
  });

  it('⭐⭐ shelf stock does not leak affordances', async () => {
    // The machine is a repair instrument and it is RIGHT THERE — inside
    // the counter. `repair` must still not exist for you, or every shop
    // would arm every customer with its whole inventory.
    notAfforded(await sh.cmd('repair jerkin'));
  }, 60_000);

  it('the funds gate is honest, which also proves it resolves as stock', async () => {
    // A fresh arrival carries no stipend (enroll grants it), so the buy
    // declines on coverage rather than on existence.
    expect(await sh.prose('buy sewing-machine')).toMatch(/can't cover/i);
  }, 60_000);
});
