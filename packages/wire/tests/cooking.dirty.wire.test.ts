/**
 * Cooking — the wet medium, the claimed dish, the honest label, the
 * gauge that reaches a player.
 *
 * Ported from `packages/server/scripts/drive-cooking.ts`, the script
 * that established this whole tier's shape: the `test-login` seam, the
 * socket the client opens, the command strings a player types, and no
 * `StuffApi` reach-arounds. What changed here is that it runs on every
 * MR instead of once.
 *
 * ⚠ **An ORDINARY patron, top to bottom.** No wizard, no `clone`, no
 * `startLocation` trickery beyond the seat. `requiresWizard` is the
 * TypeScript-trust axis and is never a stand-in for content authority,
 * so a test that flagged itself would prove something no player can do.
 * Everything below is reachable by walking in the door.
 *
 * ⚠⚠ **The spoilage band walk is not driveable and must not be faked.**
 * Stew meat tabulates Ea = 80 kJ/mol; at the 293 K a table reads, the
 * logistic climb from the 0.002 inoculum to the 0.25 `tainted` threshold
 * takes 47 game-hours — 3.9 real hours at the shipped 12× clock. An
 * earlier revision of the original drive reached for a WIZARD session to
 * turn `freshness.muMaxPerHour` up and argued that retuning a global
 * balance dial "IS an operator act". There is no operator tier, and
 * inventing one is how `requiresWizard` keeps leaking out of its lane.
 * The walk is proven exactly, in milliseconds, by `Freshness.test.ts`
 * and `SpoiledFood.test.ts`. What a wire test adds is the SEAM: that the
 * gauge reaches a player over the wire at all.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectOkOr,
} from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice, which is a question for the
 * cookhouse and not a property of the test.**
 *
 * It EATS the cut of meat the cookhouse ships and ORDERS the stew its
 * pantry stocks, and neither comes back on its own. A second run finds
 * an empty table and reads as broken.
 *
 * A cookhouse that ships one cut of meat and never produces another is a
 * world that does not restock. The right fix is a producer on the
 * cookhouse's own cadence, at which point this file loses its `.dirty.`
 * and nothing else about it changes.
 */
export const DIRTY_REASON =
  "eats the cookhouse's only cut of meat and orders the stew its pantry " +
  'stocks; neither is produced again';

declareFile({
  file: 'cooking.dirty.wire.test.ts',
  packs: ['trade-cooking', 'hearthworks', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const COOKHOUSE = '/world/hearthworks/location/cookhouse';

let cook: Session;

/** What is standing here, by name. */
async function peerNames(): Promise<string> {
  const rows = await cook.query('peers', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

beforeAll(async () => {
  cook = await Session.open(uniqueHandle('cook'), { startLocation: COOKHOUSE });
}, 120_000);

afterAll(() => cook?.close());

suite('the venue, as shipped', () => {
  it('the pot, the water butt, the crockery and the cutlery are standing', async () => {
    // Structural: the room's furniture by name, not by its prose.
    const peers = await peerNames();
    expect(peers).toMatch(/cook pot/i);
    expect(peers).toMatch(/water butt/i);
    expect(peers).toMatch(/bowl|dish|crockery/i);
    expect(peers).toMatch(/spoon/i);
  });
});

suite('order a stew — the medium, and the claim', () => {
  it('serves, with water in reach and a lit hearth', async () => {
    // ⚠ The hearth may already be lit — `food-safety.dirty` works the
    // same cookhouse. The requirement is that it IS lit, not who lit it.
    expectOkOr(await cook.cmd('ignite oven'), 'already-burning');
    const served = await cook.cmd('order stew');
    expectOk(served);
  }, 120_000);

  it('the dish holds the STEW’s own appearance, not the base material’s', async () => {
    /*
     * ⚠⚠ Name the SENTENCE, not a word of it. This check was
     * `/holds|stew/i` and it passed green while every dish silently read
     * "It holds a portion of plain cooked fare" — the generic base's
     * appearance, after a refactor dropped the blend's own. **An empty
     * derivation and a wrong one look identical unless the assertion
     * says what the prose should be.** That is why this one is prose and
     * is meant to be.
     */
    const dish = await cook.prose('look stew');
    expect(dish).toMatch(/a thick brown stew, roots and meat in a dark gravy/i);
    expect(dish, 'the honest label rides with it').toMatch(/carb 34000mg/);
  });

  it('the palate reads the DERIVED tastes', async () => {
    // Sweet from the root, umami from the meat — a derivation, so the
    // exact sentence is the assertion.
    expect(await cook.prose('taste stew')).toMatch(/It tastes sweet and umami/i);
  });

  it('is eaten out of the dish, with a utensil', async () => {
    const eaten = await cook.cmd('eat stew');
    expectOk(eaten);
    // Cutlery READS, never gates — which utensil is the interesting bit.
    expect(await eaten.said()).toMatch(/spoon|fork|knife|fingers/i);
  }, 60_000);
});

suite('the gauge reaches the player', () => {
  it('the cut of meat is there, and sound food carries no band line', async () => {
    expect(await peerNames()).toMatch(/meat|cut/i);
    const cut = await cook.prose('look meat');
    expect(cut, 'no band line on sound food is the rule').not.toMatch(
      /faintly off|gone bad|rotten/i
    );
  });

  it('spoilage never gates the act — it lets you, and you can bring it back up', async () => {
    expectOk(await cook.cmd('eat meat'));
    expectOk(await cook.cmd('vomit'));
  }, 60_000);
});
