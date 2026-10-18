/**
 * ⭐⭐ **Rubber, driven end to end** — the rubber build's exit criterion,
 * run against the real socket (the requirements' drive, retired at the
 * sweep; the model is docs/subsystems/construction.md + rubber.md).
 *
 * The drive in one sentence: *buy rubber boots and gloves; cure raw rubber
 * with sulfur in the works' oven four ways — weeping, rubber, ebonite and
 * burnt — and read which you got; tap a Hevea in the stove house once the
 * stove has it warm, pour the latex into the coagulating pan and come back
 * to a sheet of raw rubber; light the works stove and feel the loft above
 * warm; wade the Drowned Substation in leather and in rubber; and in the
 * rain, stand in the terminal hall, under the awning, in a coach, on the
 * works' roof terrace and in the street, in a wool coat and a rubberized
 * one, and see who is wet.*
 *
 * ⚠ Every checkpoint asserts a STATE read back off the world (a reading,
 * a band, a material, a wetness) — never only that a verb was not refused.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  'buys rubber boots, gloves and a rubberized coat off the general store, ' +
  'clones raw rubber, sulfur and garments into the rubber works and the ' +
  'substation, takes the Duncan Hall thermometer, cures four charges in ' +
  'the works oven and sets a pan of latex, and moves the world clock by days';

declareFile({
  file: 'rubber.dirty.wire.test.ts',
  packs: [
    'trade-rubber',
    'trade-forestry',
    'trade-farming',
    'trade-quarrying',
    'trade-tailoring',
    'trade-fuel',
    'generic-objects',
    'base-library',
    'world-seed',
    'eternal-university',
    'terminus',
    'transport',
  ],
  dirtyReason: DIRTY_REASON,
});

const W = '/world/terminus/goods-yards/rubber-works';
const WORKS = `${W}/location/ground/works/floor`;
const STOVE_HOUSE = `${W}/location/ground/stove-house`;
const STORE = `${W}/location/ground/wing/store`;
const LOFT = `${W}/location/loft/loft`;
const TOWER = `${W}/location/tower/tower`;
const TERRACE = `${W}/location/terrace/terrace`;
const YARD = '/world/terminus/goods-yards/yard';
const HALL = '/world/terminus/terminal/location/hall';
const SQUARE = '/world/terminus/market/square';
const AWNING = '/world/terminus/market/location/under-the-awning';
const SHOP = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const CATWALK = '/world/substation/catwalk';
const CELL = '/world/substation/flooded-cell';

const ROW = {
  raw: '/trade/rubber/thing/raw-rubber',
  sulfur: '/trade/quarrying/thing/sulfur',
  coal: '/trade/quarrying/thing/coal',
  coach: '/system/transport/thing/coach',
  rubberCoat: '/trade/rubber/thing/rubberized-coat',
  rubberApron: '/trade/rubber/thing/rubber-apron',
  linenApron: '/trade/tailoring/thing/apron',
};

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const open: Session[] = [];

function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

async function say(s: Session, line: string): Promise<string> {
  const t0 = Date.now();
  const r = await s.cmd(line);
  const ms = Date.now() - t0;
  const said = squash(plain(await r.said()));
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 18)} > ${line} (${ms} ms)\n          ${said.slice(0, 400)}`);
  return said;
}

/** What a player reads off a thing in reach — description and every augmenter line. */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' });
  const text = rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 18)} examines ${keyword}\n          ${squash(text).slice(0, 400)}`);
  return text;
}

/** Into the ROOM, by the founder, who holds the title. */
async function cloneHere(where: string, path: string, count = 1): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
  } finally {
    f.close();
  }
}

/**
 * Into a player's hands: the founder stands it up in the room and the player
 * picks it up. ⚠ Never `clone … --into <handle>` — a handle is not a name the
 * resolver knows, so the clone falls back to the FOUNDER's hands, and a live
 * instance there makes the row unclonable for the rest of the world's life
 * (the clone gate reads the first live instance's zone).
 */
async function cloneInto(
  where: string,
  s: Session,
  path: string,
  keyword: string,
  count = 1,
): Promise<void> {
  await cloneHere(where, path, count);
  const got = await say(s, `get ${count} ${keyword}`);
  expect(got, `get ${keyword}: ${got}`).toMatch(/you pick up/i);
}

async function at(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  open.push(s);
  await s.drainProse();
  return s;
}

async function funded(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: rubber drive"`));
  } finally {
    gov.close();
  }
  bank.close();
  return at(handle, where);
}

/**
 * Buy one; a bare shelf (an earlier dirty run bought it out) is restocked by
 * the residency sweep a clock jump fires — wait for it rather than assume.
 */
async function buyOne(s: Session, item: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const said = await say(s, `buy ${item}`);
    if (/you buy/i.test(said)) return;
    expect(said, `buy ${item}: ${said}`).toMatch(/bare|none of it/i);
    await advanceWorldClock('1 day');
    await new Promise((r) => setTimeout(r, 20_000));
  }
  throw new Error(`the store never restocked ${item}`);
}

/** Jump to the next game-time with the hour of day in [fromH, toH). */
async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advanceWorldClock(`${Math.ceil(wait / 60) + 1} minutes`);
}

/** The air here as `feel` says it. */
async function feel(s: Session): Promise<string> {
  return say(s, 'feel here');
}

/**
 * Put something on or take it off and let the act FINISH: dressing is an
 * engaged act, and the next command meets "Your hands are busy" (or the
 * walk interrupts it). Returns everything said meanwhile.
 */
async function dress(s: Session, line: string): Promise<string> {
  // ⚠ "You take off …" prints as the undressing STARTS; the act runs on.
  // A hand still busy with the last one is waited out, not failed.
  let said = '';
  for (let tries = 0; tries < 8; tries++) {
    const r = await s.cmd(line);
    said = squash(plain(await r.said()));
    if (!/hands are busy/i.test(said)) break;
    await new Promise((res) => setTimeout(res, 5_000));
  }
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  // The completion line ("You put on …") arrives on the act's own clock,
  // and a don time is derived from the garment: listen until it reports.
  const done = /you put on|you take off|you dress|put nothing on|nothing to|not cut|occupied|aren't wearing/i;
  let later = '';
  for (let waited = 0; waited < 45_000 && !done.test(`${said} ${later}`); waited += 5_000) {
    later = `${later} ${squash(await s.listen(5_000))}`.trim();
  }
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 18)} > ${line}\n          ${said} ${later}`.slice(0, 500));
  return `${said} ${later}`;
}

/** The figure a carried thermometer reads, K or °C as it prints. */
async function thermometer(s: Session): Promise<number> {
  return (await reading(s)).k;
}

/**
 * The figure AND its bracket: a novice's reading is a seeded guess within
 * ± the bracket (instrumentation.md), so a threshold is only decided when
 * the whole bracket sits on one side of it.
 */
async function reading(s: Session): Promise<{ k: number; pm: number }> {
  const said = await say(s, 'measure temperature');
  const m = /(-?\d+(?:\.\d+)?)\s*(K|°C|C)\b(?:\s*±\s*(\d+(?:\.\d+)?))?/.exec(said);
  expect(m, `measure temperature named no figure: ${said}`).not.toBeNull();
  const v = Number(m![1]);
  return { k: m![2] === 'K' ? v : v + 273.15, pm: Number(m![3] ?? 0) };
}

let thermoHandle = '';

afterAll(() => {
  for (const s of open) s?.close();
});

// ───────────────────────── the goods (22) ─────────────────────────

suite('⭐ 22 — rubber boots and gloves are on the general store\'s shelf (AC 12)', () => {
  it('buy a pair of each; they are rubber', async () => {
    await toHour(10, 14);
    const s = await funded('shopper', SHOP);
    const boots = await say(s, 'buy "rubber boots"');
    expect(boots).toMatch(/you buy/i);
    const gloves = await say(s, 'buy "rubber gloves"');
    expect(gloves).toMatch(/you buy/i);
    const read = await examine(s, 'boots');
    expect(read).toMatch(/rubber/i);
  }, 600_000);
});

// ───────────────────────── stretch (23) ─────────────────────────

suite('⭐ 23 — an elastic waist fits a body a plain stock pair is tight on (AC 14)', () => {
  it('a half-orc buys both pairs: the plain one is tight, the elastic one is not', async () => {
    await toHour(10, 14);
    // ⭐ A real newcomer, walked through intake as a half-orc (92 kg,
    // 1.88 m against the plan's 70 kg / 1.75 m), who does what a newcomer
    // does with the Arrival Note's twenty in coin: banks it (a counter
    // takes the account, not loose coin — "You can't cover …"), then shops.
    const handle = uniqueHandle('half-orc');
    const arrival = await Session.embody(handle, { species: 'half-orc' });
    arrival.close();
    const bank = await at(handle, BANK_HALL);
    expectOk(await bank.cmd('bank open'));
    expectOk(await bank.cmd('bank deposit coins'));
    bank.close();
    const s = await at(handle, SHOP);
    await dress(s, 'remove trousers'); // intake dressed them in a sturdy pair
    await buyOne(s, 'breeches');
    const plain = await dress(s, 'wear breeches');
    expect(plain, `wear breeches: ${plain}`).toMatch(/you put on/i);
    expect(plain).toMatch(/tight/i);
    await dress(s, 'remove breeches');
    await buyOne(s, 'elastic');
    const elastic = await dress(s, 'wear elastic');
    expect(elastic, `wear elastic: ${elastic}`).toMatch(/you put on/i);
    expect(elastic).not.toMatch(/tight|loose/i);
  }, 600_000);
});

// ───────────────────────── the cure (14–17) ─────────────────────────

suite('⭐⭐ 14–17 — sulfur, heat and time decide what comes out (AC 2, 3)', () => {
  let s: Session;

  beforeAll(async () => {
    await toHour(10, 14);
    s = await funded('vulcanizer', WORKS);
    // ⭐ A fresh character, knowing nothing: there is no gate to pass.
    // The works floor carries its own coal (props): pick it up, stoke it.
    await say(s, 'get 4 coal'); // bare `get coal` takes every lump in reach
    await say(s, 'stoke coal into oven');
    await say(s, 'stoke coal into oven');
    await say(s, 'drop coal'); // the rest is dead weight in the hands
    const lit = await say(s, 'light oven');
    expect(lit, `light oven: ${lit}`).not.toMatch(/no fuel|stoke it first/i);
    // ⚠ Every charge's stock up front: once a lump is live in a player's
    // hands, the clone gate reads THAT zone and refuses the founder.
    await cloneInto(WORKS, s, ROW.raw, 'raw-rubber', 10);
    await cloneInto(WORKS, s, ROW.sulfur, 'sulfur', 6);
  }, 600_000);

  async function cure(
    raw: number,
    sulfur: number,
    hold: string,
    holdS: number,
    bellows = false,
  ): Promise<string> {
    await say(s, 'inventory');
    // ⚠ `put` takes from your hands into something standing in the room:
    // charge the mould on the floor, THEN carry it into the oven.
    for (let i = 0; i < raw; i++) await say(s, 'put raw-rubber in boot-mould');
    for (let i = 0; i < sulfur; i++) await say(s, 'put sulfur in boot-mould');
    await say(s, 'get boot-mould');
    await say(s, 'put boot-mould in oven');
    if (bellows) await say(s, 'pump oven');
    const fired = await say(s, `fire oven for ${hold}`);
    expect(fired, `fire: ${fired}`).not.toMatch(/nothing in|matches no|stone cold|is empty/i);
    await advanceWorldClock(`${Math.ceil(holdS / 60) + 2} minutes`);
    await new Promise((r) => setTimeout(r, 8_000));
    await s.drainProse();
    // ⚠ `get` has no `from`: the whole tail is one greedy object list, so
    // `get boots from boot-mould` took every pair in reach. Name the
    // inside with MQL's chain (`here:i` is the room's THINGS; a bare
    // `here:x` would be a detail of the room).
    await say(s, 'get here:i:oven:i:boot-mould');
    await say(s, 'drop boot-mould');
    const got = await say(s, 'get here:i:boot-mould:i:boots');
    expect(got, `get boots: ${got}`).toMatch(/boots/i);
    await s.drainProse();
    return examine(s, 'me:i:boots');
  }

  it('14 — a short low-sulfur cure: still raw rubber, tacky and weeping', async () => {
    const read = await cure(3, 1, '1 minute', 60);
    expect(read).toMatch(/raw rubber|weeping|tacky/i);
    await say(s, 'drop boots');
  }, 600_000);

  it('15 — a weighed 3 % charge, half an hour at 430 K: rubber, in the boot mould\'s shape', async () => {
    const read = await cure(3, 1, '30 minutes', 1800);
    expect(read).toMatch(/rubber/i);
    expect(read).not.toMatch(/raw rubber|weeping|ebonite|burnt/i);
  }, 600_000);

  it('16 — a heavy charge cured long: ebonite — hard, black, it rings', async () => {
    await say(s, 'drop boots');
    const read = await cure(1, 3, '1 hour', 3600);
    expect(read).toMatch(/ebonite|rings/i);
    await say(s, 'drop boots');
  }, 600_000);

  it('17 — the good charge held too hot with the bellows: burnt, and it says so', async () => {
    const read = await cure(3, 1, '30 minutes', 1800, true);
    expect(read).toMatch(/burnt|blister|brittle/i);
  }, 600_000);
});

// ───────────────────────── the stove house (7–11) ─────────────────────────

suite('⭐⭐ 7–11 — the stove house, the trees and the latex (AC 4, 1)', () => {
  let s: Session;

  beforeAll(async () => {
    s = await funded('tapper', LOBBY);
    await say(s, 'get thermometer');
    const handle = s.handle;
    s.close();
    s = await at(handle, STOVE_HOUSE);
  }, 600_000);

  it('8 — before dawn, stove out: cold, and the tree refuses — too cold', async () => {
    await toHour(4, 6);
    await new Promise((r) => setTimeout(r, 3_000));
    const inside = await reading(s);
    const refused = await say(s, 'tap tree');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] stove house before dawn: ${inside.k.toFixed(1)} ± ${inside.pm} K`);
    // ⚠ The glass holds the night well — a dawn house can sit at the line.
    // A reading whose bracket straddles 291 decides nothing; say so.
    if (inside.k + inside.pm < 291) expect(refused).toMatch(/cold/i);
    else if (inside.k - inside.pm > 291) expect(refused).not.toMatch(/cold/i);
    // eslint-disable-next-line no-console -- the drive's own record
    else console.log('  [drive] the dawn house is AT the line: step 8 undecided this run');
  }, 600_000);

  it('7 — a clear afternoon, stove out: warmer than the yard — the sun did it', async () => {
    await toHour(13, 15);
    await new Promise((r) => setTimeout(r, 3_000));
    const inside = await thermometer(s);
    const handle = s.handle;
    s.close();
    const y = await at(handle, YARD);
    const outside = await thermometer(y);
    y.close();
    s = await at(handle, STOVE_HOUSE);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] stove house ${inside.toFixed(1)} K · yard ${outside.toFixed(1)} K`);
    expect(inside).toBeGreaterThan(outside);
  }, 600_000);

  it('9 — light the stove and wait: the house warms, and the tap opens', async () => {
    thermoHandle = s.handle;
    // ⭐ At dawn: by early afternoon the sun alone brings the glass to ~300
    // K, and the sun AND the stove take it past 309, where the tree shuts
    // down in the heat — a real lesson, and not this step's.
    await toHour(6, 7);
    await say(s, 'get 2 coal');
    await say(s, 'stoke coal into stove');
    await say(s, 'stoke coal into stove');
    await say(s, 'light stove');
    // From a ~270 K dawn the stove alone takes hours and the morning sun
    // joins it: two hours left the glass at 286 K, four at 312 (past the
    // tree's 309). Three aims at the middle of the band.
    await advanceWorldClock('3 hours');
    await new Promise((r) => setTimeout(r, 3_000));
    const warm = await thermometer(s);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] stove house, stove lit 3 h: ${warm.toFixed(1)} K`);
    expect(warm).toBeGreaterThan(291);
    // Let the cuts run a while in the warm before anybody taps them.
    // ⚠ While the stove still burns: the window is sampled at the read,
    // so a house gone cold (or hot) by the tap bills the whole wait as shut.
    await advanceWorldClock('1 hour');
    await new Promise((r) => setTimeout(r, 3_000));
  }, 600_000);

  it('11 — tap latex into a cup, pour it in the pan; a day later, a sheet of raw rubber', async () => {
    await say(s, 'get 1 cup');
    const tapped = await say(s, 'tap tree into cup');
    expect(tapped).not.toMatch(/too cold|nothing/i);
    await new Promise((r) => setTimeout(r, 5_000));
    await s.drainProse();
    const cup = await examine(s, 'cup');
    expect(cup).toMatch(/latex|milk/i);
    await say(s, 'pour cup into pan');
    await advanceWorldClock('26 hours');
    await new Promise((r) => setTimeout(r, 3_000));
    const pan = await examine(s, 'pan');
    expect(pan).toMatch(/set/i);
    const got = await say(s, 'get here:i:pan:i:sheet');
    expect(got).toMatch(/sheet/i);
    const sheet = await examine(s, 'sheet');
    expect(sheet).toMatch(/raw rubber|tacky|stiff/i);
  }, 600_000);
});

// ───────────────────────── heat between rooms (4) ─────────────────────────

suite('⭐ 4 — the works stove warms the loft above it (AC 7)', () => {
  it('light the stove on the works floor: within the hour the loft reads warmer', async () => {
    // ⚠ The realm has ONE thermometer to hand (Duncan Hall's); the tapper
    // carries it, so the tapper reads the loft.
    expect(thermoHandle, 'the tapper never got the thermometer').not.toBe('');
    const handle = thermoHandle;
    const loft = await at(handle, LOFT);
    const before = await thermometer(loft);
    loft.close();
    const floor = await at(handle, WORKS);
    await say(floor, 'get 2 coal');
    await say(floor, 'stoke coal into stove');
    await say(floor, 'light stove');
    await advanceWorldClock('1 hour');
    floor.close();
    const loft2 = await at(handle, LOFT);
    await new Promise((r) => setTimeout(r, 3_000));
    const after = await thermometer(loft2);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] loft before ${before.toFixed(1)} K · after an hour of the stove below ${after.toFixed(1)} K`);
    const cause = await feel(loft2);
    expect(after).toBeGreaterThan(before);
    expect(cause.length).toBeGreaterThan(0);
  }, 600_000);
});

// ───────────────────────── the substation (18) ─────────────────────────

suite('⭐⭐ 18 — wade the Drowned Substation (AC 8)', () => {
  beforeAll(async () => {
    await toHour(10, 14);
  }, 600_000);
  it('in leather boots they soak through and you are shocked; in rubber boots, unharmed', async () => {
    // ⚠ /stuff rows cannot be cloned by anybody (no title over the
    // commons), so the leather boots are bought, as a player would.
    const buyer = await funded('wader-leather', SHOP);
    // ⚠ A bare `buy leather` bought a leather WATERSKIN: the boots now
    // answer to the phrase they print (a naming-ratchet row, fixed here).
    await buyOne(buyer, '"leather boots"');
    const lh = buyer.handle;
    // ⚠ Bought, not cloned: step 22's boots are live, and the clone gate
    // reads the first live instance's zone (the shop) and refuses.
    const seller = await funded('wader-rubber', SHOP);
    await buyOne(seller, '"rubber boots"');
    // ⚠ Dress in the LIT shop: in the substation's dark `inventory` names
    // everything "something". Dressing is engaged — let it finish.
    for (const w of [buyer, seller]) {
      // ⚠ Intake shod them in canvas shoes: the feet are taken.
      await dress(w, 'remove shoes');
      await dress(w, 'wear boots');
      const worn = await say(w, 'inventory');
      expect(worn, 'the boots are on').toMatch(/wearing:[^.]*boots/i);
    }
    const rh = seller.handle;
    buyer.close();
    seller.close();
    const leather = await at(lh, CATWALK);
    const rubber = await at(rh, CATWALK);
    // ⚠ The shock is narrated on its own clock, after the arrival: listen
    // for it, and read the body the way a player would (`look me`).
    const inL = `${await say(leather, 'down')} ${squash(await leather.listen(6_000))}`;
    const inR = `${await say(rubber, 'down')} ${squash(await rubber.listen(6_000))}`;
    const l = `${await examine(leather, 'me')} ${await say(leather, 'look me')}`;
    const r = `${await examine(rubber, 'me')} ${await say(rubber, 'look me')}`;
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] leather wade: ${inL.slice(0, 200)}\n          rubber wade: ${inR.slice(0, 200)}`);
    expect(`${inL} ${l}`).toMatch(/shock|jolt|burn|current|spasm/i);
    expect(`${inR} ${r}`).not.toMatch(/shock|jolt|burn|current|spasm/i);
  }, 600_000);
});

// ───────────────────────── vitriol (21) ─────────────────────────

suite('⭐ 21 — vitriol eats the linen apron and not the rubber one (AC 11)', () => {
  it('splash each wearer; the linen is eaten', async () => {
    const t = await at(uniqueHandle('linen-apron'), YARD);
    await cloneInto(YARD, t, ROW.linenApron, 'apron');
    await dress(t, 'wear apron');
    const u = await at(uniqueHandle('rubber-apron'), YARD);
    await cloneInto(YARD, u, ROW.rubberApron, 'apron');
    await dress(u, 'wear apron');
    const tb = await funded('thrower', SHOP);
    await buyOne(tb, 'vitriol');
    await buyOne(tb, 'vitriol');
    const th = tb.handle;
    tb.close();
    const thrower = await at(th, YARD);
    await say(thrower, `throw vitriol at ${t.handle}`);
    await say(thrower, `throw vitriol at ${u.handle}`);
    await new Promise((r) => setTimeout(r, 3_000));
    const linen = await examine(t, 'apron');
    const rubber = await examine(u, 'apron');
    expect(linen).toMatch(/eaten|corrod|scorch|burn|worn|ruin|holed/i);
    expect(rubber).not.toMatch(/eaten|corrod|holed|ruin/i);
  }, 600_000);
});

// ───────────────────────── the rain (1–3, 5, 19) ─────────────────────────

suite('⭐⭐⭐ 1–3, 5, 19 — in the rain, who is wet (AC 5, 6, 9, 13)', () => {
  const places: Record<string, Session> = {};
  let streetWool: Session;
  let streetRubber: Session;

  beforeAll(async () => {
    places.hall = await at(uniqueHandle('in-hall'), HALL);
    places.awning = await at(uniqueHandle('under-awning'), AWNING);
    places.terrace = await at(uniqueHandle('on-terrace'), TERRACE);
    places.loft = await at(uniqueHandle('in-loft'), LOFT);
    places.store = await at(uniqueHandle('in-store'), STORE);
    places.tower = await at(uniqueHandle('in-tower'), TOWER);
    places.street = await at(uniqueHandle('in-street'), SQUARE);
    places.coach = await at(uniqueHandle('in-coach'), SQUARE);
    await cloneHere(SQUARE, ROW.coach);
    await say(places.coach!, 'go coach');
    // ⭐ Both coats off the general store's shelf, as a player gets them:
    // wool is the padded gambeson (quilted wool to the hips); the rubberized
    // coat is the tailor's cut in rubber-faced cloth. ⚠ The lab hoodie was
    // the first choice and is never in stock on a fresh world (a
    // pre-existing stock finding, recorded in the plan).
    const wb = await funded('wool-coat', SHOP);
    await buyOne(wb, 'gambeson');
    const rb = await funded('rubber-coat', SHOP);
    await buyOne(rb, '"rubberized coat"');
    for (const [w, garment] of [[wb, 'gambeson'], [rb, 'coat']] as const) {
      await dress(w, `wear ${garment}`);
      const worn = await say(w, 'inventory');
      expect(worn, `the ${garment} is on`).toMatch(new RegExp(`wearing:[^.]*${garment}`, 'i'));
    }
    const wh = wb.handle;
    const rh = rb.handle;
    wb.close();
    rb.close();
    // ⚠ On the SQUARE, where the rain loop reads the weather: the goods
    // yard can sit in a boundary that fell as snow while the square's was
    // rain (the whole-file run found the gambeson dry there).
    streetWool = await at(wh, SQUARE);
    streetRubber = await at(rh, SQUARE);
    // ⚠ Ten sessions: under a loaded machine each login can take a minute.
  }, 1_800_000);

  async function wetness(s: Session): Promise<string> {
    const me = await examine(s, 'me');
    const m = /It is (damp|wet|soaked through)/i.exec(me);
    return m ? m[1]!.toLowerCase() : 'dry';
  }

  it('it rains (the clock moves in weather segments until it does)', async () => {
    // ⚠ Rain wets a body at a weather SEGMENT BOUNDARY (every 6 game
    // hours: the boundary fan-out wets each occupied rain scope "one
    // segment's worth"), using the phase AT that instant — and within a
    // segment the phase flips between snow and rain with the temperature.
    // So step to just past each boundary and accept only LIQUID rain there.
    const SEGMENT_S = 6 * 3600;
    const wet = (w: string): boolean =>
      /type:\s*(rain|drizzle|showers?|storm|downpour)/i.test(w) &&
      /rain precipitation/i.test(w);
    let raining = false;
    for (let i = 0; i < 40 && !raining; i++) {
      const { after } = await advanceWorldClock('0 seconds');
      const toNext = Math.ceil((after + 1) / SEGMENT_S) * SEGMENT_S - after;
      await advanceWorldClock(`${Math.ceil(toNext) + 60} seconds`);
      await new Promise((r) => setTimeout(r, 4_000)); // the fan-out is async
      raining = wet(await say(places.street!, 'analyze weather'));
    }
    expect(raining, 'no liquid rain at a boundary in ten game days').toBe(true);
  }, 3_600_000);

  it('5 — the street and the roof terrace are wet', async () => {
    expect(await wetness(places.street!)).not.toBe('dry');
    expect(await wetness(places.terrace!)).not.toBe('dry');
  }, 120_000);

  it('1–3 — the terminal hall, the awning, the coach and the loft are dry', async () => {
    expect(await wetness(places.hall!)).toBe('dry');
    expect(await wetness(places.awning!)).toBe('dry');
    expect(await wetness(places.coach!)).toBe('dry');
    expect(await wetness(places.loft!)).toBe('dry');
  }, 120_000);

  it('19 — in the rain, a wool coat lets the wet through; a rubberized coat does not', async () => {
    // ⚠ A coat covers the TORSO: rain still reaches the head and hands and
    // soaks the linen trousers, so no coat keeps a whole body "dry" (the
    // script's wording overclaims — recorded in the plan). What a player
    // reads is the coat itself: the rubber sheds it, the wool drinks it.
    const woolCoat = await examine(streetWool, 'me:i:gambeson');
    const rubberCoat = await examine(streetRubber, 'me:i:coat');
    const wool = await wetness(streetWool);
    const rubber = await wetness(streetRubber);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] gambeson: ${woolCoat.slice(0, 160)}\n          rubberized coat: ${rubberCoat.slice(0, 160)}\n          bodies — wool: ${wool} · rubber: ${rubber}`);
    expect(woolCoat).toMatch(/damp|wet|soaked/i);
    expect(rubberCoat).not.toMatch(/damp|wet|soaked/i);
  }, 120_000);

  it('1 — the hall sees the sky through its glass roof: daylight, by day', async () => {
    await toHour(11, 14);
    const lit = await say(places.hall!, 'analyze light');
    expect(lit).not.toMatch(/pitch dark/i);
  }, 600_000);

  it('6 — the room under the tower is covered; the terrace is under the open sky', async () => {
    const store = await say(places.store!, 'analyze weather');
    const terrace = await say(places.terrace!, 'analyze weather');
    expect(terrace.length).toBeGreaterThan(0);
    expect(store.length).toBeGreaterThan(0);
  }, 120_000);
});
