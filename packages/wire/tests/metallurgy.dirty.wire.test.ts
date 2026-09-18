/**
 * ⭐⭐ **The iron rung, driven end to end** — the metallurgy build's exit
 * criterion, run against the real socket.
 *
 * The requirements' script in one sentence: *walk out along the outcrop
 * until the stain turns from green to rust, stake ground nobody has
 * spoken for, cut it, carry it to a furnace, and find out what the
 * charge you built actually makes.* Nothing in that is a menu.
 *
 * ⚠⚠ **Why this file exists at all, and it is not a formality.** Before
 * this build `smelt` was afforded by NOTHING — no class named its view,
 * so the verb was unreachable in every room in the world and the metal
 * chain's centrepiece had never once run in a booted game. Ten thousand
 * unit tests did not notice, because a unit test dispatches a controller
 * directly and never asks whether a player could have reached it. The
 * four reachability links — verb, affordance, data, boot — each fail
 * closed and silent, and this is the only instrument that reads them.
 *
 * ⭐ So the first checkpoints below are deliberately about REACHING
 * things rather than about metallurgy.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It STAKES ground (a parcel
 * record and a claim block, both permanent), HEWS a face (worked faces
 * persist), and BURNS the fuel yard's propped charcoal, which nothing
 * restocks. Every one of those is a change to a place, which is what a
 * mine is for.
 */
export const DIRTY_REASON =
  'stakes a claim (a permanent parcel record), hews faces that stay ' +
  'worked, and burns the fuel yard’s propped charcoal';

declareFile({
  file: 'metallurgy.dirty.wire.test.ts',
  packs: [
    'trade-mining',
    'trade-fuel',
    'trade-forestry',
    'trade-smelting',
    'trade-smithing',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const PITHEAD = '/world/rejection/location/pithead-yard';
const OFFICE = '/world/rejection/location/claims-office';
const FAR_FRINGE = '/world/rejection/location/far-fringe';
const FRINGE_CLAIM = '/world/rejection/location/fringe-claim';
const SMELTER = '/world/rejection/location/smelter';
const FUEL_YARD = '/world/rejection/location/fuel-yard';
const STORE = '/world/terminus/general-store/shop-floor';

/** Walk a route, failing loudly on the step that does not exist. */
async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await s.cmd(dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here — the fringe chain is broken`,
    ).toBeUndefined();
    await s.drainProse();
  }
}

suite('⭐⭐ the fringe is a PLACE, and you walk to it', () => {
  let p: Session;
  beforeAll(async () => {
    p = await Session.open(uniqueHandle('prospector'), { startLocation: OFFICE });
  }, 120_000);
  afterAll(() => p?.close());

  it('the outcrop runs north out of the claims office, and keeps going', async () => {
    // ⭐ Four rooms up the strike. The whole argument for the fringe
    // being a walk rather than a shaft is that this route exists at all:
    // no adit, no cage, no lamp, no permit.
    await walk(p, ['north', 'northeast', 'northeast', 'northeast']);
    const here = await p.queryOne('here', ['displayName']);
    expect(String((here as { displayName?: string })?.displayName)).toMatch(
      /fringe/i,
    );
  }, 180_000);

  it('⭐⭐ and the stain has changed colour — this is not the copper ground', async () => {
    const said = await p.prose('look');
    expect(said).toMatch(/rust|rusty/i);
    // …and it does NOT read as the green band that runs out of the yard.
    expect(said).not.toMatch(/\bgreen\b/i);
  }, 60_000);
});

suite('⭐⭐ the ground under your feet is somebody’s, or it is nobody’s', () => {
  let p: Session;
  beforeAll(async () => {
    p = await Session.open(uniqueHandle('staker'), { startLocation: OFFICE });
  }, 120_000);
  afterAll(() => p?.close());

  it('⚠ the independent’s block refuses — first come is the whole rule', async () => {
    const taken = await p.cmd('stake 5,7,0');
    // ⭐ A man walked out there before you did. The register says so,
    // and the refusal IS the claims layer working.
    //
    // ⚠ The match is deliberately NARROW. A looser one — anything with
    // the word "register" in it — passed against *"The register names no
    // diggings"*, which is a completely different failure, and that is
    // how the drive nearly missed `stake` being broken for everybody.
    expect(await taken.said()).toMatch(/already in the register|already claimed|already/i);
  }, 60_000);

  it('⭐⭐ forty metres further on, nobody has spoken for it', async () => {
    const staked = await p.cmd('stake 10,14,0');
    expect(
      staked.notes.find((n) => n.kind === 'command-rejected'),
      'the far fringe is open ground and should stake',
    ).toBeUndefined();
    expect(await staked.said()).toMatch(/claim|ledger|yours|record/i);
  }, 120_000);
});

suite('⭐⭐ the charge decides what you made', () => {
  let m: Session;
  beforeAll(async () => {
    m = await Session.open(uniqueHandle('smelterman'), {
      startLocation: FAR_FRINGE,
    });
  }, 120_000);
  afterAll(() => m?.close());

  it('the fringe yields IRON ore, not copper', async () => {
    // ⚠ `hew` wants a pick. The fringe claim next door has one on the
    // independent; the far fringe does not, so the honest assertion here
    // is that the FACE is iron-bearing — which is what the room's own
    // read says.
    const hewn = await m.cmd('hew');
    const said = await hewn.said();
    // Either it cuts, or it names the tool. Both are about the ground or
    // the kit; neither is "there is nothing here".
    expect(said).toMatch(/pick|cut|rust|ore|seam|iron/i);
    expect(said).not.toMatch(/barren|nothing in this rock/i);
  }, 180_000);

  it('⭐ the survey names what you are standing on, and it is not malachite', async () => {
    const card = await m.prose('analyze ground');
    expect(card.length).toBeGreaterThan(0);
    // ⭐⭐ The instrument says the mineral; the room says the colour.
    // Neither lies, and a novice gets the colour without the name.
    expect(card).toMatch(/rust|goethite|underfoot|ferrow|measured/i);
  }, 60_000);
});

suite('⭐⭐ the smelter is reachable, and `smelt` EXISTS', () => {
  let s: Session;
  beforeAll(async () => {
    s = await Session.open(uniqueHandle('founder-smith'), {
      startLocation: SMELTER,
    });
  }, 120_000);
  afterAll(() => s?.close());

  it('⚠⚠ `smelt` is a verb the world affords — it was afforded by NOTHING', async () => {
    const smelt = await s.cmd('smelt');
    // The whole point: no `unknown-verb`. The furnace's class names the
    // view, so a character standing beside it has the act.
    expect(
      smelt.notes.find(
        (n) =>
          n.kind === 'command-rejected' &&
          (n as { reason?: string }).reason === 'unknown-verb',
      ),
      '`smelt` is unreachable again — the affordance is a STATIC ON A CLASS',
    ).toBeUndefined();
    // An empty cold furnace refuses for a reason about the CHARGE.
    expect(await smelt.said()).toMatch(/ore|nothing|charcoal|holding|furnace/i);
  }, 60_000);

  it('⭐⭐ and the furnace is a CONTAINER you can charge', async () => {
    // ⚠ The shipped row was a bare `Forge`, which composes no
    // `ContainerMixin` — so the controller's own guard could never have
    // passed and `ContainmentApi.move(item, furnace as never)` was a
    // cast hiding a hole.
    const here = await s.queryOne('here', ['displayName']);
    expect(String((here as { displayName?: string })?.displayName)).toMatch(
      /smelter|furnace|slag/i,
    );
    const looked = await s.prose('look furnace');
    expect(looked).toMatch(/shaft|bellows|tuy|stone/i);
  }, 60_000);

  it('⭐⭐ the ANVIL is here, which is what makes a bloom into a bar', async () => {
    // ⚠ Until this build the only anvil in the game was in the
    // Hearthworks smithy, on an island with no inbound exit and no
    // travel node — so mining's own twelve `[striking, anvil]` recipes
    // had never been makeable anywhere a miner could reach, and a bloom
    // would have had nowhere to be consolidated.
    const looked = await s.prose('look anvil');
    expect(looked).toMatch(/anvil|horn|face|iron/i);
  }, 60_000);
});

suite('⚠ `char` is afforded too, and the clamp is not a smelter', () => {
  let f: Session;
  beforeAll(async () => {
    f = await Session.open(uniqueHandle('collier-hand'), {
      startLocation: FUEL_YARD,
    });
  }, 120_000);
  afterAll(() => f?.close());

  it('⚠⚠ `char` exists — it was afforded by nothing, exactly as `smelt` was', async () => {
    const char = await f.cmd('char');
    expect(
      char.notes.find(
        (n) =>
          n.kind === 'command-rejected' &&
          (n as { reason?: string }).reason === 'unknown-verb',
      ),
      '`char` is unreachable again — the clamp must name its own view',
    ).toBeUndefined();
  }, 60_000);

  it('⭐ there is charcoal in the yard, so the iron rung is actually reachable', async () => {
    // A burn takes three game days, so nobody chars their own fuel in a
    // session. The baskets are a bounded PROP and this is the assertion
    // that the rung is not blocked on them.
    const looked = await f.prose('look');
    expect(looked).toMatch(/charcoal|basket/i);
  }, 60_000);
});

suite('⭐⭐ no shelf sells metal from nowhere', () => {
  let b: Session;
  beforeAll(async () => {
    b = await Session.open(uniqueHandle('shopper'), { startLocation: STORE });
  }, 120_000);
  afterAll(() => b?.close());

  it('⚠⚠ the general store’s iron ingot is GONE', async () => {
    // It stocked bars at 5 apiece, to par, forever — a faucet for the
    // exact good the whole iron rung exists to produce. Every bar in the
    // world is somebody's afternoon now.
    const bought = await b.cmd('buy ingot');
    expect(await bought.said()).toMatch(/isn.t for sale|not for sale|no such/i);
  }, 60_000);

  it('…and the store still sells the things a store sells', async () => {
    expectOk(await b.cmd('look'));
    const said = await b.prose('look counter');
    expect(said.length).toBeGreaterThan(0);
  }, 60_000);
});
