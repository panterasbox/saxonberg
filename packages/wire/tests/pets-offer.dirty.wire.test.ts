/**
 * Pets — ⭐⭐ **the offer is a moment, not a gate**, driven over the wire.
 *
 * The four beats review round 8 built, each on the real socket against a
 * real cat on Hinkley Lane, with real rations bought at the general store
 * with founder-issued coin:
 *
 *  1. ⭐ **The step-back rule is a mechanism.** A flighty stray, a
 *     stranger's hand: the food goes down. It is STILL THERE after a
 *     feeding cadence with you standing over it — and GONE after a
 *     cadence with you out of the room. The sentence "it waits until you
 *     step back" shipped over a brain that ate on cadence regardless.
 *  2. ⭐⭐ **Hold still and it comes.** A wary animal answers a stranger's
 *     hand with `approach`: an engagement on your hands, and if you keep
 *     still it comes and takes it — a hand-feed, credited to you, and
 *     credited by how much it was NEEDED.
 *  3. ⚠ **Walk out mid-beat and it does not come.** The food stays in
 *     your hand and nothing is credited.
 *  4. ⭐⭐ **It asks.** Named, and hungry, it goes to whoever is present:
 *     `look` reads "It is at your feet, looking up at you."
 *
 * ⚠ The dials a wizard `eval` moves — handling to `wary`, regard, the
 * hunger — are the game-days the ladder takes, skipped. What is under
 * test is the BEAT: what the animal does, and when.
 *
 * ⚠⚠ `.dirty.`: it issues coin, opens an account, buys three rations,
 * feeds two of them to the stray, and names it; none of that is produced
 * again, and a second run meets a cat that already has a name.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectRefused,
  expectNote,
} from '../src/harness';

export const DIRTY_REASON =
  'issues coin, opens an account, buys three rations at the general store, ' +
  'feeds two to the lane’s stray and names it — none of it produced again';

declareFile({
  file: 'pets-offer.dirty.wire.test.ts',
  packs: ['hinkley-hills', 'terminus', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const LANE = '/world/terminus/hinkley-hills/location/lane';
const BANK = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const PARCEL = '--parcel /world/terminus/hinkley-hills';
/** One `feeds` cadence (60s) plus slack. */
const CADENCE_MS = 65_000;
/** `APPROACH_MS` (6s) plus slack. */
const BEAT_MS = 7_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

let handle: string;
let keeper: Session;

/**
 * Read the cat through a wizard eval. The line comes back as
 * `<its name>: <value>`; this returns the value, JSON-shaped.
 */
async function cat(expr: string): Promise<string> {
  const line = squash(await keeper.prose(`eval ${PARCEL} --on cat ${expr}`));
  const i = line.indexOf(': ');
  return i >= 0 ? line.slice(i + 2) : line;
}

beforeAll(async () => {
  handle = uniqueHandle('petsoffer');
  // Coin, banked, spent — the real economy, not a mint.
  const gov = await Session.open('founder', { startLocation: BANK });
  try {
    expectOk(await gov.cmd('reserve issue 500'));
    expectOk(await gov.cmd('drop coins'));
  } finally {
    gov.close();
  }
  let me = await Session.open(handle, { startLocation: BANK, wizard: true });
  expectOk(await me.cmd('get coins'));
  expectOk(await me.cmd('bank open'));
  expectOk(await me.cmd('bank deposit coins'));
  me.close();
  me = await Session.open(handle, { startLocation: STORE, wizard: true });
  for (let i = 0; i < 3; i++) expectOk(await me.cmd('buy rations'));
  me.close();
  keeper = await Session.open(handle, { startLocation: LANE, wizard: true });
  // ⚠ Other files' keepers stand on this lane too, linkdead, and to the
  // cat a body is a body: it will not eat off the ground with a stranger
  // over it, and an animal waiting on food does not beg. So every
  // bystander but me is somebody the cat already KNOWS — which is what
  // makes "a stranger's hand" below mean MY hand and nobody else's.
  await cat(
    'return (me => this.getContainer().getContents().filter(x => x !== this && x.getName && x.getName() !== "' +
      handle +
      '" && x.getIdentityPath && x.getIdentityPath() !== this.getIdentityPath()).map(x => (this.adjustRegard(x, 10), x.getName())))(this)',
  );
}, 300_000);

afterAll(() => {
  keeper?.close();
});

suite('1 · ⭐ the step-back rule is a mechanism', () => {
  it('a thin stray is born HUNGRY, and a stranger’s hand puts the food down', async () => {
    const born = await cat('return this.getReserve("satiation").current.rawValue()');
    expect(Number(born)).toBeLessThan(40);
    const r = await keeper.cmd('offer rations to cat');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'too-wild-for-a-hand' });
    expect(squash(await r.said())).toMatch(/set .* down/i);
  });

  it('⚠ it does NOT eat with you standing over it', async () => {
    await sleep(CADENCE_MS);
    await keeper.drainProse();
    expect(squash(await keeper.prose('look'))).toMatch(/ration/i);
  }, 90_000);

  it('⭐ and it is gone once you have stepped out', async () => {
    expectOk(await keeper.cmd('east'));
    await sleep(CADENCE_MS);
    expectOk(await keeper.cmd('west'));
    await keeper.drainProse();
    expect(squash(await keeper.prose('look'))).not.toMatch(/ration/i);
  }, 150_000);
});

suite('2 · ⭐⭐ hold still and it comes', () => {
  it('a wary animal answers a stranger’s hand with an ENGAGEMENT, not a verdict', async () => {
    expect(await cat('return (this.handling = 0.5, this.handlingBand())')).toMatch(/wary/);
    const r = await keeper.cmd('offer rations to cat');
    expectOk(r);
    expectNote(r, 'engagement-started');
    expect(squash(await r.said())).toMatch(/keep still/i);
  });

  it('keep still, and it takes it from your hand — credited by how much it was needed', async () => {
    await sleep(BEAT_MS);
    await keeper.drainProse();
    const regard = Number(
      await cat(
        'return this.regardFor(this.getContainer().getContents().find(x => x.getName && x.getName() === "' +
          handle +
          '"))',
      ),
    );
    expect(regard).toBeGreaterThan(0);
    expect(regard).toBeLessThan(10); // it was half-full; a starving one gives 10
    // One ration left of three: one on the ground earlier, one just eaten.
    const inv = squash(await keeper.prose('inventory'));
    expect(inv.match(/ration pack/g) ?? []).toHaveLength(1);
  }, 30_000);
});

suite('3 · ⚠ walk out mid-beat and it does not come', () => {
  it('the food stays in your hand', async () => {
    const before = await cat(
      'return this.regardFor(this.getContainer().getContents().find(x => x.getName && x.getName() === "' +
        handle +
        '"))',
    );
    const r = await keeper.cmd('offer rations to cat');
    expectOk(r);
    expectNote(r, 'engagement-started');
    expectOk(await keeper.cmd('east'));
    await sleep(BEAT_MS);
    expectOk(await keeper.cmd('west'));
    await keeper.drainProse();
    expect(squash(await keeper.prose('inventory'))).toMatch(/ration/i);
    const after = await cat(
      'return this.regardFor(this.getContainer().getContents().find(x => x.getName && x.getName() === "' +
        handle +
        '"))',
    );
    expect(after).toBe(before); // nothing credited
  }, 30_000);
});

suite('4 · ⭐⭐ it asks', () => {
  it('named and hungry, it is at your feet — and `cat` still reaches Mouse', async () => {
    await cat(
      'return (me => (this.handling = 0.7, this.adjustRegard(me, 100), this.rememberFollowed(me), 1))(this.getContainer().getContents().find(x => x.getName && x.getName() === "' +
        handle +
        '"))',
    );
    expectOk(await keeper.cmd('name cat Mouse'));
    await cat(
      'return (r => (this.adjustReserve("satiation", r.current.scale(-0.9)), 1))(this.getReserve("satiation"))',
    );
    await sleep(CADENCE_MS);
    await keeper.drainProse();
    const seen = squash(await keeper.prose('look Mouse'));
    expect(seen).toMatch(/at your feet/i);
    // A named animal is still what it is: the species keyword survives.
    expect(squash(await keeper.prose('look cat'))).toMatch(/Mouse/);
  }, 120_000);
});
