/**
 * Fishing — ⭐⭐ **every reach holds what belongs in it, unasked**, driven
 * over the wire against the confluence bank, the market, the moor's
 * heath and Heart's Delight's millsite, with tackle bought at the
 * general store with founder-issued coin.
 *
 * The requirements doc's drive, step by step (its numbering kept):
 *
 *   1 the store · 2 the water read · 3 the wait · 4 a fish lands itself ·
 *   5 a fighter snaps the line · 6 a fighter landed · 7 release ·
 *   8 the pot · 9 the net empties the reach, the fisher says so, the
 *   reach recovers · 10 a fish below the outfall carries the city ·
 *   11 consignment · 12 a turned fish is refused · 13 the heath ·
 *   13b the millsite · 14 the kept carp · 15 named after three days ·
 *   16 the sturgeon.
 *
 * ⚠ Game-day skips are wizard `eval`s on the OBJECT that carries the
 * clock — a net's set stamp, a dead fish's death stamp, a carp's fed
 * days — inside a parcel the wizard administers (the market square).
 * Nothing here moves the world clock. The restart step (15's second
 * half) is run by hand and recorded in the plan.
 *
 * ⚠⚠ `.dirty.`: it issues coin, opens accounts, buys tackle, draws the
 * confluence down, consigns and buys a fish, names a carp. None of it is
 * produced again.
 *
 * ⚠ Every wait here polls for the EFFECT, not the frame (the forestry
 * drive's finding): a landed fish is a mint, a registry draw and a stamp
 * that finish a beat after the tick that landed it.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<yours> WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/fishing.dirty.wire.test.ts` — a net haul mints thirty live
 * animals in one dispatch, which is more than the default 30 s frame
 * budget in a room already full of drowning fish.
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
  'issues coin, opens two accounts, buys tackle at the general store, draws the ' +
  'confluence’s record down with a net, consigns and buys a fish, names a carp, ' +
  'biases four species’ abundance for the rig — none of it produced again';

declareFile({
  file: 'fishing.dirty.wire.test.ts',
  packs: ['trade-fishing', 'water', 'terminus', 'world-seed', 'hearts-delight', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const BANK = '/world/terminus/wharfside/bank';
const SQUARE = '/world/terminus/market/square';
const HEATH = '/world/moor/stormy-heath';
const MILLSITE = '/world/hearts-delight/location/millsite';
const PARCEL = '--parcel /world/terminus/market';
/** A fish as the inventory lists it → the keyword a verb reaches it by. */
const FISH = /\b(brown trout|eel|grey mullet|carp|shore crab|sturgeon)\b/i;
const KEYWORD: Record<string, string> = {
  'brown trout': 'trout',
  eel: 'eel',
  'grey mullet': 'mullet',
  carp: 'carp',
  'shore crab': 'shore-crab',
  sturgeon: 'sturgeon',
};

/** One fishing tick is a game minute: five real seconds at the shipped 12× clock, plus slack. */
const TICK_MS = 5_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const noDigits = (t: string) => expect(t.replace(/<[^>]+>/g, '').replace(/Owned by [^.]*\./g, ''), t).not.toMatch(/\d/);
/** `look --peek <thing>` — a close look that leaves the focus alone, so a bare `look` after it is still the room. */
async function peek(s: Session, target: string): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(`look --peek ${target}`));
}

let handle: string;
let me: Session;

const inventory = async (s: Session): Promise<string> => {
  await s.drainProse();
  return squash(await s.prose('inventory'));
};
/** The keyword of the first fish in hand, or `null`. ⚠ A crab POT is not a crab. */
const fishInHand = async (s: Session): Promise<string | null> => {
  const m = FISH.exec(await inventory(s));
  return m ? KEYWORD[m[1]!.toLowerCase()]! : null;
};
/** How many fish are in hand. */
const fishCount = async (s: Session): Promise<number> =>
  ((await inventory(s)).match(new RegExp(FISH.source, 'gi')) ?? []).length;

/**
 * `talk fisher` — or, once he has introduced himself, `talk tull`: a
 * known person's keywords are their NAME (the presentation build), and
 * *fisher* stops reaching him the moment you know who he is.
 */
async function talkToTheFisher(s: Session): Promise<string> {
  let t = await s.cmd('talk fisher');
  if (t.status !== 'ok') t = await s.cmd('talk tull');
  expectOk(t);
  return squash(await t.said());
}

/** Walk between the bank and the square by looking, not by assuming. */
async function goTo(s: Session, where: 'bank' | 'square'): Promise<void> {
  await s.drainProse();
  const here = squash(await s.prose('look'));
  if (where === 'bank' && !/bank at the confluence/.test(here)) expectOk(await s.cmd('south'));
  if (where === 'square' && !/market square/.test(here)) expectOk(await s.cmd('north'));
  await s.drainProse();
}

/** A ration, so the day's fishing does not end in a faint. */
async function eat(s: Session): Promise<void> {
  expectOk(await s.cmd('eat rations'));
  await s.drainProse();
}

/** Any wait still out is brought in before a new cast. */
async function reelIn(s: Session): Promise<void> {
  await s.cmd('cancel fishing');
  await s.drainProse();
}

/**
 * A wizard read on something in reach, inside the wizard's parcel; the
 * value after `: `. `--all` because a haul holds several of a species,
 * and the first line answers.
 */
async function evalOn(s: Session, target: string, expr: string): Promise<string> {
  const line = squash(await s.prose(`eval ${PARCEL} --on ${target} --all ${expr}`));
  const i = line.indexOf(': ');
  if (i < 0) return line;
  const rest = line.slice(i + 2);
  const m = /^(\S+)/.exec(rest);
  return m ? m[1]! : rest;
}

/**
 * Cast, and play whatever takes until a fish is in hand: a small one
 * lands itself; a fighter is played by feel — give when the line sings,
 * gain when the rod nods — which lands every fighter the contest opens.
 */
async function fishUntilLanded(s: Session, line = 'fish with worm using cane', maxTicks = 60): Promise<string> {
  const landed = await castFor(s, line, maxTicks);
  if (landed === null) throw new Error(`nothing took in ${maxTicks} ticks`);
  return landed;
}

/**
 * Cast and play for `maxTicks`; the keyword of what landed, or `null`
 * when nothing took — which is an answer (B8: a float over a bottom
 * feeder, a big hook over crabs). `work` reels every waiting tick, which
 * is how a lure fishes at all.
 */
async function castFor(s: Session, line: string, maxTicks: number, work = false): Promise<string | null> {
  await reelIn(s);
  // Empty hands first: a fish already held (a dead one from an earlier
  // step) would read as this cast's landing.
  for (let i = 0; i < 80; i++) {
    const held = await fishInHand(s);
    if (!held) break;
    expectOk(await s.cmd(`drop ${held}`));
  }
  await s.drainProse();
  const started = await s.cmd(line);
  expectOk(started);
  expectNote(started, 'engagement-started');
  let strainHigh: boolean | null = null;
  for (let i = 0; i < maxTicks; i++) {
    await sleep(TICK_MS);
    const held = await fishInHand(s);
    if (held) {
      await s.drainProse();
      return held;
    }
    const act = strainHigh === null ? (work ? 'reel' : 'slack') : strainHigh ? 'slack' : 'reel';
    const r = await s.cmd(act);
    const spoke = squash(await r.said());
    if (/Nothing is on it|work the lure/i.test(spoke)) continue; // still waiting
    if (/no line out/i.test(spoke)) {
      const landed = await fishInHand(s);
      if (landed) return landed;
      throw new Error('the line is gone and nothing was landed');
    }
    strainHigh = /singing|bent hard/i.test(spoke);
  }
  await reelIn(s);
  return null;
}

beforeAll(async () => {
  handle = uniqueHandle('angler');
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd('reserve issue 900'));
    expectOk(await gov.cmd('drop coins'));
  } finally {
    gov.close();
  }
  let s = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await s.cmd('get coins'));
  expectOk(await s.cmd('bank open'));
  expectOk(await s.cmd('bank deposit coins'));
  s.close();
  s = await Session.open(handle, { startLocation: STORE, wizard: true });
  // ⚠ `pot` alone is the farming pack's clay pot at this counter; the
  // crab pot answers to `crab-pot`.
  // ⚠ A day's fishing is eight game hours, and a body burns food to stay
  // warm (the thermal cold branch): the angler eats a ration at each
  // afternoon's start (`eat()`), as anyone fishing all day would. Run 19
  // found the angler COLLAPSED at the seventh hour — and every unfed
  // Cast in the world with it (recorded on the plan; not fishing's).
  for (const good of ['rod', 'worm', 'worm', 'worm', 'worm', 'worm', 'worm', 'crab-pot', 'net', 'bowl', 'fish-food', 'float-rod', 'leger-rod', 'spoon', 'keepnet', 'rations', 'rations', 'rations', 'rations', 'rations']) {
    expectOk(await s.cmd(`buy ${good}`));
  }
  s.close();
  me = await Session.open(handle, { startLocation: BANK, wizard: true });
}, 300_000);

afterAll(() => {
  me?.close();
});

suite('1 · the store', () => {
  it('each is a real thing in hand; `look rod` names no number', async () => {
    await me.drainProse();
    const inv = await inventory(me);
    for (const w of ['rod', 'worm', 'crab pot', 'net', 'bowl', 'fish food', 'float rod', 'leger rod', 'spoon', 'keepnet']) expect(inv).toMatch(new RegExp(w, 'i'));
    // ⚠ Three rods in hand now (B8): `rod` alone PROMPTS — which one? —
    // and a prompt is not a dispatch-response. Name it, as a player would.
    const rod = await peek(me, 'cane');
    expect(rod).toMatch(/cane rod/i);
    noDigits(rod);
  });
});

suite('2 · the water read', () => {
  it("⭐ `look water` reads the confluence — the Kestrel, broad, brackish, hard, the outfall — and a novice's read says nothing of what it holds", async () => {
    await me.drainProse();
    expect(squash(await me.prose('look'))).toMatch(/river's edge/);
    // ⚠ `look water` is ambiguous here — the room's own `river` detail
    // shares the keyword — and a disambiguation prompt hangs a wire
    // session; the Shore's own keyword is unambiguous.
    const said = await peek(me, 'edge');
    expect(said).toMatch(/This is the Kestrel, a broad river/);
    expect(said).toMatch(/brackish/);
    expect(said).toMatch(/hard/);
    expect(said).toMatch(/An outfall discharges into this water/);
    expect(said).not.toMatch(/eel|mullet|crab|carp|royal|fish in this water/i);
    noDigits(said);
  });
});

suite('3–4 · the wait, and a fish that lands itself', () => {
  it('`fish with worm` begins the wait; `say` works during it; nothing explains the silence', async () => {
    const r = await me.cmd('fish with worm using cane');
    expectOk(r);
    expectNote(r, 'engagement-started');
    expect(squash(await r.said())).toMatch(/cast out/i);
    expectOk(await me.cmd('say quiet today'));
    await sleep(TICK_MS);
    const line = squash(await (await me.cmd('reel')).said());
    expect(line).toMatch(/Nothing is on it/);
    expectOk(await me.cmd('cancel fishing'));
    await me.drainProse();
    expect(await fishInHand(me)).toBeNull();
  }, 60_000);

  it('⭐ a bite: a fish in hand, its size in words and no number; nothing on it says what it carries', async () => {
    const name = await fishUntilLanded(me);
    const said = await peek(me, name);
    expect(said).toMatch(/It is .* long|It is (as long as|longer than)/);
    noDigits(said);
    expect(said).not.toMatch(/outfall|foul|dirty|sick/i);
    // A body in air: it is drowning in your hand and says nothing of that either.
    expectOk(await me.cmd(`release ${name}`));
    await me.drainProse();
  }, 420_000);
});

suite('5–6 · the contest', () => {
  it('⭐ reel fast against a fighter and the line SNAPS; the rod stays; the message says nothing about you', async () => {
    let snapped = false;
    for (let attempt = 0; attempt < 8 && !snapped; attempt++) {
      await reelIn(me);
      const started = await me.cmd('fish with worm using cane');
      if (started.status !== 'ok') {
        expectOk(await me.cmd('fish using cane')); // out of worms: a bare hook
      }
      let fighting = false;
      for (let i = 0; i < 60 && !fighting; i++) {
        await sleep(TICK_MS);
        if (await fishInHand(me)) break; // a small one landed itself
        const spoke = squash(await (await me.cmd('slack')).said());
        if (/singing|bent hard|nods|close in/i.test(spoke)) fighting = true;
      }
      const small = await fishInHand(me);
      if (small) {
        expectOk(await me.cmd(`release ${small}`));
        await me.drainProse();
        continue;
      }
      if (!fighting) continue;
      let last = '';
      for (let i = 0; i < 5 && !/line parts/i.test(last); i++) last = squash(await (await me.cmd('reel')).said());
      if (/line parts/i.test(last)) {
        snapped = true;
        expect(last).not.toMatch(/you (did|were|should)/i);
        expect(last).toMatch(/water/i);
      }
      await me.drainProse();
    }
    expect(snapped).toBe(true);
    expect(await inventory(me)).toMatch(/rod/i);
    expectRefused(await me.cmd('reel'));
  }, 900_000);

  it('⭐ reel / slack by feel and a fighter, or the next small one, is landed', async () => {
    const name = await fishUntilLanded(me, 'fish using cane');
    expect(Object.values(KEYWORD)).toContain(name);
  }, 600_000);
});

suite('7 · release', () => {
  it('a released fish is gone from hand and the water reads the same', async () => {
    const before = await peek(me, 'edge');
    const name = (await fishInHand(me))!;
    expect(name).toBeTruthy();
    const r = await me.cmd(`release ${name}`);
    expectOk(r);
    expect(squash(await r.said())).toMatch(/let the .* go/i);
    expect(await fishInHand(me)).toBeNull();
    expect(await peek(me, 'edge')).toBe(before);
  }, 60_000);
});

suite('8 · the pot', () => {
  it('lay it, let a game-hour pass, haul it — a crab, or nothing, and nothing says which was luck', async () => {
    const set = await me.cmd('lay crab-pot');
    expectOk(set);
    expect(squash(await set.said())).toMatch(/lay .* in the water/i);
    expect(await inventory(me)).not.toMatch(/crab pot/i);
    await me.drainProse();
    expect(squash(await me.prose('look'))).toMatch(/crab pot/i);
    // Walk to the market and back; a wizard moves the pot's stamp back to
    // the world's first second (⚠ the wire world's clock starts at 0, so a
    // subtraction can go negative and read as never set).
    expectOk(await me.cmd('north'));
    expectOk(await me.cmd('south'));
    await me.drainProse();
    await me.prose(`eval ${PARCEL} --on crab-pot return (this.setAtS = 1, 1)`);
    const haul = await me.cmd('haul crab-pot');
    expectOk(haul);
    const said = squash(await haul.said());
    expect(said).toMatch(/haul/i);
    expect(said).not.toMatch(/luck|chance|roll/i);
    expect(await inventory(me)).toMatch(/crab pot/i);
  }, 120_000);
});

suite('9 · the net empties the reach; the fisher says so; it recovers', () => {
  // ⚠ The wire world's clock starts at 0 and runs 12×: an afternoon has
  // not passed, so a wizard makes the net take an afternoon's haul in
  // the minutes there are — the stamp back to the first second, the
  // draw rate up. What is under test is the RECORD emptying and
  // recovering, not the arithmetic of hours (the pack's own suite pins that).
  /** Lay the net, let the wizard's afternoon pass, haul it: how many came up. */
  const haulAfterAnAfternoon = async (): Promise<number> => {
    const before = await fishCount(me);
    expectOk(await me.cmd('lay net'));
    // ⚠ `--on` is REACHABLE scope: the eval runs where the net lies.
    await me.prose(`eval ${PARCEL} --on net return (this.setAtS = 1, this.drawPerHour = 1000, 1)`);
    await me.drainProse();
    expectOk(await me.cmd('haul net'));
    return (await fishCount(me)) - before;
  };
  const dropTheHaul = async (): Promise<void> => {
    for (let i = 0; i < 80; i++) {
      const held = await fishInHand(me);
      if (!held) break;
      expectOk(await me.cmd(`drop ${held}`));
    }
    await me.drainProse();
  };

  it('⭐ haul after haul the reach thins and then is empty; the fisher says so and names nobody', async () => {
    await eat(me);
    const hauls: number[] = [];
    for (let i = 0; i < 8; i++) {
      hauls.push(await haulAfterAnAfternoon());
      if (hauls[hauls.length - 1] === 0) break;
      await dropTheHaul();
    }
    expect(hauls[0]).toBeGreaterThan(0);
    expect(hauls[hauls.length - 1]).toBe(0);
    // Thins before it empties: the last full haul is smaller than the first.
    expect(hauls[hauls.length - 2]).toBeLessThan(hauls[0]!);
    const said = await talkToTheFisher(me);
    expect(said).toMatch(/Nothing in it|Somebody has had the lot|Thin/i);
    expect(said).not.toMatch(new RegExp(handle, 'i'));
  }, 900_000);

  it('⭐ days on, the water is recovering and the net gives fish again; the fisher reads the water before you can', async () => {
    // Recovery is reconcile-on-read from the record's stamp; a wizard
    // turns the half-life dial to seconds, reads, and turns it back.
    expectOk(await me.cmd('config water.fishery.recoveryHalfLifeDays 0.00001'));
    const haul = await haulAfterAnAfternoon();
    expectOk(await me.cmd('config water.fishery.recoveryHalfLifeDays 2'));
    expect(haul).toBeGreaterThan(0);
    expect(await talkToTheFisher(me)).toMatch(/Eels run on the ebb|in this water/i);
  }, 300_000);
});

suite('10 · below the outfall', () => {
  it('⭐ a fish landed at the confluence carries the city; nothing on it says so', async () => {
    // One fish in hand — a second of the same species makes `look` ask
    // which, and a prompt hangs a wire session.
    await goTo(me, 'bank');
    while ((await fishCount(me)) > 1) expectOk(await me.cmd(`drop ${await fishInHand(me)}`));
    if ((await fishCount(me)) === 0) await fishUntilLanded(me, 'fish using cane');
    await me.drainProse();
    // To the square: the wizard's evals reach only inside the market parcel.
    await goTo(me, 'square');
    const inv = await inventory(me);
    const name = (await fishInHand(me))!;
    expect(name, inv).toBeTruthy();
    const load = await evalOn(me, name, 'return this.getPathogenLoad("e-coli")');
    expect(Number(load)).toBeGreaterThan(0);
    expect(await peek(me, name)).not.toMatch(/foul|dirty|sick|outfall/i);
  }, 420_000);
});

suite('11–12 · the stall', () => {
  it('⭐ consign a fresh fish; a second character buys it; the consignor is paid', async () => {
    await eat(me);
    if ((await fishCount(me)) === 0) {
      await goTo(me, 'bank');
      await fishUntilLanded(me, 'fish using cane');
    }
    await goTo(me, 'square');
    const name = (await fishInHand(me))!;
    const held = await fishCount(me);
    // `bank` is the counting-house's verb: the balance is read there, on
    // a short second session of the same character.
    const balance = async (): Promise<string> => {
      const at = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
      try {
        await at.drainProse();
        return squash(await at.prose('bank'));
      } finally {
        at.close();
      }
    };
    me.close();
    const before = await balance();
    me = await Session.open(handle, { startLocation: SQUARE, wizard: true });
    // `on slab`: the square has two consignment counters and the produce
    // stalls come first in reach.
    const c = await me.cmd(`consign ${name} on slab --ask 4`);
    expectOk(c);
    expect(await fishCount(me)).toBe(held - 1);

    // A buyer with coin in hand (`buy` settles card, then cash). ⚠ The
    // founder drops the coin at the SQUARE: a second drop in the banking
    // hall lands in the secured till.
    const buyerHandle = uniqueHandle('buyer');
    const gov = await Session.open('founder', { startLocation: SQUARE });
    try {
      expectOk(await gov.cmd('reserve issue 50'));
      expectOk(await gov.cmd('drop coins'));
    } finally {
      gov.close();
    }
    let b = await Session.open(buyerHandle, { startLocation: SQUARE });
    const got = await b.cmd('get coins');
    expect(got.status, squash(await got.said())).toBe('ok');
    b.close();
    // Banked: a consignment's split needs the buyer's account, not a purse.
    b = await Session.open(buyerHandle, { startLocation: BANK_HALL });
    expectOk(await b.cmd('bank open'));
    expectOk(await b.cmd('bank deposit coins'));
    b.close();
    b = await Session.open(buyerHandle, { startLocation: SQUARE });
    // `from slab`: `stall` is also the produce stalls' keyword.
    const buy = await b.cmd(`buy ${name} from slab`);
    expectOk(buy);
    expect(await fishInHand(b)).toBe(name);
    b.close();
    me.close();
    const after = await balance();
    expect(after, `${before} → ${after}`).not.toBe(before);
    me = await Session.open(handle, { startLocation: SQUARE, wizard: true });
  }, 600_000);

  it('⭐ a fish held a game-day has turned: refused as turned', async () => {
    // Back to the water for one more, then up to the square.
    await goTo(me, 'bank');
    await fishUntilLanded(me, 'fish using cane');
    await goTo(me, 'square');
    const name = (await fishInHand(me))!;
    expect(name).toBeTruthy();
    // It would die in the hand on the shipped clock (a body in air, the
    // dying window) — a game-day of that is more real minutes than a
    // drive has, so a wizard kills it and dates the death back to the
    // world's first second: the spoilage clock reads from there.
    const load = await evalOn(
      me,
      name,
      'return (this.setLifecycleState("dead"), this.diedAtGameSec = 1, this.freshnessLoad())',
    );
    expect(Number(load)).toBeGreaterThan(0);
    // Not a game-day of world clock yet: the band edge is the dial.
    expectOk(await me.cmd('config freshness.band.taintedAt 0.0001'));
    const c = await me.cmd(`consign ${name} on slab --ask 4`);
    expectRefused(c);
    expectNote(c, 'controller-rejected', { reason: 'turned' });
    await me.cmd('config freshness.band.taintedAt 0.25');
    expectOk(await me.cmd(`drop ${name}`));
    await me.drainProse();
  }, 600_000);
});

suite('13 · the heath', () => {
  it("⭐ the moor's water reads soft and cold and fresh; what it holds is the Holloway's own", async () => {
    const m = await Session.open(handle, { startLocation: HEATH, wizard: true });
    try {
      await m.drainProse();
      expect(squash(await m.prose('look'))).toMatch(/black mere/);
      // ⚠ `mere` is also the heath floor's pool detail; `tarn` is the Shore's alone.
      const said = await peek(m, 'tarn');
      expect(said).toMatch(/This is the Holloway/);
      expect(said).toMatch(/soft/);
      expect(said).toMatch(/cold|cool/);
      expect(said).toMatch(/fresh/);
      expect(said).not.toMatch(/mullet|crab|eel/i);
    } finally {
      m.close();
    }
  }, 120_000);
});

suite('13b · the millsite', () => {
  it("⭐ nobody authored fishing here: `fish` from the millsite is afforded by the rod in hand and draws from the Delight's flats", async () => {
    const g = await Session.open(handle, { startLocation: MILLSITE, wizard: true });
    try {
      const r = await g.cmd('fish using cane');
      expectOk(r);
      expectNote(r, 'engagement-started');
      expectOk(await g.cmd('cancel fishing'));
      await g.drainProse();
    } finally {
      g.close();
    }
  }, 120_000);
});

/** The wizard sets one species' abundance back to a number. */
async function setAbundance(s: Session, species: string, abundance: number): Promise<void> {
  const said = squash(
    await s.prose(
      `eval ${PARCEL} return (sp => (sp.setHabitat({ ...sp.getHabitat(), abundance: ${abundance} }), sp.getHabitat().abundance))(StuffApi.findByTemplatePath("/stuff/idea/species/${species}"))`,
    ),
  );
  expect(said, said).toMatch(new RegExp(String(abundance)));
}

/** The wizard biases the draw: one species made the water's most abundant, for a wait. */
async function bias(s: Session, species: string, fightRating: number): Promise<void> {
  const said = squash(
    await s.prose(
      `eval ${PARCEL} return (sp => (sp.setHabitat({ ...sp.getHabitat(), abundance: 5000, fightRating: ${fightRating} }), sp.getHabitat().abundance))(StuffApi.findByTemplatePath("/stuff/idea/species/${species}"))`,
    ),
  );
  expect(said, said).toMatch(/5000/);
}

suite('14–15 · the kept carp', () => {
  it('⭐ a carp in a bowl of water lives; unnamed it is "not chosen"; fed three days in its bowl, it can be named; `find … mine` lists it', async () => {
    let k = await Session.open(handle, { startLocation: BANK, wizard: true });
    let landed = '';
    try {
      await eat(k);
      await bias(k, 'carp', 0.1);
      for (let i = 0; i < 6 && landed !== 'carp'; i++) {
        landed = await fishUntilLanded(k, 'fish using cane');
        if (landed !== 'carp') {
          expectOk(await k.cmd(`release ${landed}`));
          await k.drainProse();
        }
      }
      expect(landed).toBe('carp');
    } finally {
      k.close();
    }
    k = await Session.open(handle, { startLocation: SQUARE, wizard: true });
    try {
      expect(await inventory(k)).toMatch(/carp/i);
      // The bowl on the ground (`put` targets peers), filled by a wizard
      // where the drive has no tap.
      expectOk(await k.cmd('drop bowl'));
      await evalOn(k, 'bowl', 'return (this.setBulkMaterial("interior", StuffApi.findByTemplatePath("/stuff/idea/material/bulk/water")), this.setBulkAmount("interior", this.getInteriorCapacity()), 1)');
      expectOk(await k.cmd('put carp in bowl'));
      await sleep(2_000);
      expect(await evalOn(k, 'carp', 'return this.getEngagementByType("respiration-drain") === undefined')).toMatch(/true/);
      const refused = await k.cmd('name carp Barnaby');
      expectRefused(refused);
      expectNote(refused, 'controller-rejected', { reason: 'not-chosen' });
      // Three distinct fed days in the bowl, and a hand it knows.
      const earned = await evalOn(
        k,
        'carp',
        `return (me => (this.setRegard(me, 100), this.handling = 0.75, [1,2,3].forEach(d => this.creditHomeCandidate(this.homeKeyOf(this.getContainer()), d)), this.homeEarnedDay))(this.getContainer().getContainer().getContents().find(x => x.getName && x.getName() === "${handle}"))`,
      );
      expect(Number(earned)).toBeGreaterThanOrEqual(0);
      const named = await k.cmd('name carp Barnaby');
      expectOk(named);
      expect(squash(await k.prose('find carp mine'))).toMatch(/Barnaby/);
    } finally {
      k.close();
    }
  }, 300_000);
});

suite('16 · the sturgeon', () => {
  it('⭐ a practised reader is told a royal fish lies in the confluence; landed, its catch is a deed', async () => {
    const s = await Session.open(handle, { startLocation: BANK, wizard: true });
    try {
      await eat(s);
      expect(await talkToTheFisher(s)).toMatch(/royal fish|sturgeon/i);
      await bias(s, 'sturgeon', 0.3);
      let landed = '';
      for (let i = 0; i < 3 && landed !== 'sturgeon'; i++) {
        landed = await fishUntilLanded(s, 'fish using cane');
        if (landed !== 'sturgeon') {
          expectOk(await s.cmd(`release ${landed}`));
          await s.drainProse();
        }
      }
      expect(landed).toBe('sturgeon');
      // (No `look` here: the bank's floor is littered with the net's
      // haul from step 9, and a second sturgeon on it makes `look` ask.)
      await s.drainProse();
      expect(squash(await s.prose('chronicle'))).toMatch(/Landed a sturgeon/);
    } finally {
      s.close();
    }
  }, 900_000);
});

suite('17 · the rig, the lure and the keepnet (B8)', () => {
  it('⭐ the rig is where the bait sits: a leger over a surface shoal is a long afternoon; the float takes a mullet', async () => {
    const s = await Session.open(handle, { startLocation: BANK, wizard: true });
    try {
      await eat(s);
      await setAbundance(s, 'sturgeon', 2);
      await bias(s, 'grey-mullet', 0.1);
      // The leger pins the worm to the bottom; the mullet feed at the top.
      expect(await castFor(s, 'fish with worm using leger-rod', 10)).not.toBe('mullet');
      // The float hangs it where they are.
      expect(await fishUntilLanded(s, 'fish with worm using float-rod', 30)).toBe('mullet');
    } finally {
      s.close();
    }
  }, 600_000);

  it('⭐ the hook selects: a big hook over crabs takes nothing, silently; the plain hook takes a crab', async () => {
    const s = await Session.open(handle, { startLocation: BANK, wizard: true });
    try {
      await setAbundance(s, 'grey-mullet', 50);
      await bias(s, 'shore-crab', 0.1);
      // Ledgered right on the bottom where they are — and a hook a crab
      // cannot get round. Nothing prints; the worm stays.
      expect(await castFor(s, 'fish with worm using leger-rod', 6)).toBeNull();
      expect(await inventory(s)).toMatch(/worm/i);
      expect(await fishUntilLanded(s, 'fish with worm using cane', 30)).toBe('shore-crab');
    } finally {
      s.close();
    }
  }, 600_000);

  it('⭐ a spoon fishes only while it is worked; it takes a trout and is still on the line after', async () => {
    const s = await Session.open(handle, { startLocation: BANK, wizard: true });
    try {
      await setAbundance(s, 'shore-crab', 60);
      await bias(s, 'brown-trout', 0.1);
      // Left to lie, a spoon is a stone.
      expect(await castFor(s, 'fish with spoon using cane', 8)).toBeNull();
      // Worked every minute, it takes — and it is not eaten.
      expect(await castFor(s, 'fish with spoon using cane', 40, true)).toBe('trout');
      expect(await inventory(s)).toMatch(/spoon/i);
    } finally {
      s.close();
    }
  }, 600_000);

  it('⭐ a landed fish in a laid keepnet is alive a minute later; hauled, it is in your hand — and a minute in the hand is a dead fish', async () => {
    const s = await Session.open(handle, { startLocation: BANK, wizard: true });
    try {
      const kept = await fishUntilLanded(s, 'fish with worm using cane', 40);
      expectOk(await s.cmd('lay keepnet'));
      expectOk(await s.cmd(`put ${kept} in keepnet`));
      await s.drainProse();
      expect(await fishInHand(s)).toBeNull();
      await sleep(60_000);
      const alive = await evalOn(s, 'keepnet', 'return [...this.getContents()].map((f) => String(f.isAlive())).join(",")');
      expect(alive, alive).toMatch(/^true/);
      const haul = await s.cmd('haul keepnet');
      expectOk(haul);
      expect(squash(await haul.said())).toMatch(/take out what you kept/i);
      expect(await fishInHand(s)).toBe(kept);
      // The control: the same fish, a minute in the air. ⚠ Read it off
      // MY contents — the bank's floor is littered with step 9's dead
      // haul, and `--on ${kept}` could answer with one of those.
      await sleep(60_000);
      const dead = await evalOn(s, 'me', `return [...this.getContents()].filter((f) => f.getKeywords().includes('${kept}')).map((f) => String(f.isAlive())).join(",")`);
      expect(dead, dead).toMatch(/^false/);
    } finally {
      s.close();
    }
  }, 600_000);
});
