/**
 * ⭐⭐ **Ceramics, part C — the potter**, driven end to end against the
 * real socket (the ceramics requirements' drive, steps 15–25; the model is
 * docs/subsystems/ceramics.md, faces.md and materials-response.md).
 *
 * The drive in one sentence: *throw a mug as a novice and a jug as a
 * practiced potter and name it; trim, join and stamp at leather-hard and be
 * refused at bone-dry; bisque-fire with cones in the spy-hole; stir an ash
 * glaze and a lead glaze, dip two crocks inside and glost-fire them; open a
 * kiln hot and ring the hidden crack; keep vinegar in the lead-glazed crock
 * a week; crack a cold glazed mug with boiling water; watch an unglazed jar
 * weep and cool; drop a thin bowl on stone and a thick mug, grind the
 * sherds; have the tinker rivet a cracked bowl; read the novice's first mug
 * beside the practiced one; and buy a plant pot at the Terminus stall and
 * the general store.*
 *
 * ⚠ Every checkpoint asserts the verb was UNDERSTOOD and a STATE changed,
 * read back off the world — never only that the verb was not refused.
 * ⭐ Step 22 (the filter) is the crystallizing-and-filter wave's (W8): a
 * filter set in a crock strains fouled water to water and lets tainted
 * water through. ⚠ Step 20 runs after
 * 23 in this file: its grogged pot is made from 23's sherds.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<this worktree's> npx vitest run
 * tests/ceramics-c.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  advanceLiving,
  toWarmSeason,
  plain,
  dress,
  dressFounder,
  hand,
} from '../src/harness';

export const DIRTY_REASON =
  'wins clay at the Delight pit (a persisted per-band ledger), throws, fires ' +
  'and glazes ware in the pottery (spending its cones, charcoal and glaze ' +
  'stock), breaks pots on the market square, consigns at and buys off the ' +
  'Terminus potter\'s stall and the general store, clones a campfire and a ' +
  'thermometer, practises pottery onto its characters, buys water filters and ' +
  'crocks and stands contaminated pails in the yard and the temper pit, and moves the clock';

declareFile({
  file: 'ceramics-c.dirty.wire.test.ts',
  packs: [
    'trade-ceramics',
    'trade-quarrying',
    'trade-milling',
    'trade-fuel',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'hearts-delight',
    'terminus',
    'water',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const B = '/world/terminus/hearts-delight/brickfield/location';
const SHOP = `${B}/potters-shop`;
const PIT = `${B}/clay-pit`;
const TEMPER = `${B}/temper-pit`;
const YARD = `${B}/weathering-ground`;
const GATE = '/world/terminus/hearts-delight/location/valley-gate';
const MILL = '/world/terminus/hearts-delight/location/mill-house';
const SQUARE = '/world/terminus/market/square';
const STORE = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

const CHARCOAL = '/trade/fuel/thing/charcoal';
const PAIL = '/stuff/thing/vessel/pail';
const FOULED_WATER = '/stuff/idea/material/bulk/fouled-water';
const TAINTED_WATER = '/stuff/idea/material/bulk/tainted-water';
const CAMPFIRE = '/stuff/thing/Campfire';
const THERMOMETER = '/stuff/thing/instrument/thermometer';

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const sessions: Session[] = [];

function rejectedByParser(r: CommandResult): boolean {
  return (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'command-rejected');
}

function refusedFor(r: CommandResult): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

async function run(s: Session, line: string): Promise<{ said: string; r: CommandResult }> {
  const r = await s.cmd(line);
  const said = squash(plain(await r.said()));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 16)} > ${line} → ${r.status} ${refusedFor(r) ?? ''}\n          ${said.slice(0, 400)}`);
  expect(rejectedByParser(r), `'${line}' never reached a controller: ${said}`).toBe(false);
  await s.drainProse();
  return { said, r };
}

async function say(s: Session, line: string): Promise<string> {
  return (await run(s, line)).said;
}

async function advance(duration: string): Promise<void> {
  // Lived time: in day-long jumps, the drive's people fed between them.
  await advanceLiving(duration, sessions);
  const probe = await Session.open('founder', { startLocation: SHOP, wizard: true }).catch(() => null);
  try {
    const until = Date.now() + 600_000;
    while (probe && Date.now() < until) {
      const ok = await probe
        .query('here', { fields: ['displayName'] })
        .then(() => true)
        .catch(() => false);
      if (ok) break;
    }
  } finally {
    probe?.close();
  }
}

async function act(s: Session, line: string, gameTime?: string): Promise<{ said: string; r: CommandResult }> {
  const out = await run(s, line);
  const started = (out.r.notes as Array<{ kind?: string; engagementId?: string }>).find(
    (n) => n.kind === 'engagement-started',
  );
  if (started?.engagementId) {
    if (gameTime) await advance(gameTime);
    await s.awaitActivity(started.engagementId, 300_000).catch(() => []);
  }
  await new Promise((res) => setTimeout(res, 500));
  const later = squash(plain(await s.listen(1_500).catch(() => '')));
  await s.drainProse();
  return { said: `${out.said} ${later}`.trim(), r: out.r };
}

async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' }).catch(() => []);
  const text = rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 16)} examines ${keyword}\n          ${squash(text).slice(0, 500)}`);
  return text;
}

async function held(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] }).catch(() => []);
  return rows.map((r) => String((r as { displayName?: unknown }).displayName ?? '')).join(' | ');
}

/** The same person somewhere else (inventory travels). */
async function goTo(s: Session, where: string): Promise<Session> {
  const handle = s.handle;
  s.close();
  const next = await Session.open(handle, { startLocation: where, wizard: true });
  sessions.push(next);
  await next.drainProse();
  return next;
}

async function mint(where: string, path: string, count = 1): Promise<void> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await gov.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
    await gov.drainProse();
  } finally {
    gov.close();
  }
}

async function funded(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  bank.close();
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: ceramics drive C"`));
  } finally {
    gov.close();
  }
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  sessions.push(s);
  await s.drainProse();
  return s;
}

async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advance(`${Math.ceil(wait / 60) + 1} minutes`);
}

/** Dig `n` lumps at the pit and come back to the shop. */
async function clayFor(s: Session, n: number): Promise<Session> {
  let at = await goTo(s, PIT);
  // ⭐ The pit's three spades are the gang's too: when every one is in a
  // moulder's or the potter's hands, a player waits for one to come back
  // (the brains leave it at the pit when they go home).
  for (let wait = 0; wait < 8 && !/spade/i.test(await held(at)); wait++) {
    await at.cmd('get 1 spade');
    await at.drainProse();
    if (/spade/i.test(await held(at))) break;
    await advance('30 minutes');
  }
  // ⚠ …and when none comes back, the potter brings their OWN (setup): a
  // gang member who starved offstage kept one, and four hours freed none
  // (run 29).
  if (!/spade/i.test(await held(at))) await hand(at, '/trade/quarrying/thing/spade');
  expect(await held(at), 'a spade from the pit').toMatch(/spade/i);
  for (let i = 0; i < n; i++) await act(at, 'dig clay with spade', '2 minutes');
  // The won clay lies where it fell — take what was won, not the gang's
  // heap with it: a bare `get clay` handed the potter 75 kg (run 19), and
  // then nothing — not even a mug — could be lifted.
  await say(at, `get ${n} clay`);
  // ⭐ The spade is the pit's: leave it for the next hand (the NPC brains
  // do). Two drive potters carrying spades off left the pit with none.
  await say(at, 'drop spade');
  expect(await held(at), 'clay won').toMatch(/clay/i);
  at = await goTo(at, SHOP);
  return at;
}

/** Wait in game-days until `keyword` here reads `re` (drying on the boards). */
async function until(s: Session, keyword: string, re: RegExp, step = '1 day', max = 30): Promise<string> {
  let seen = '';
  for (let i = 0; i < max && !re.test(seen); i++) {
    await advance(step);
    // ⚠ Read by daylight: a whole-day step that starts at night reads in
    // the dark every time, and a query in the dark sees nothing (run 16).
    await toHour(8, 15);
    seen = await examine(s, keyword);
  }
  return seen;
}

/** Light the kiln with charcoal and hold it. */
async function fireKiln(s: Session, hold: string, extra = ''): Promise<string> {
  await mint(SHOP, CHARCOAL, 4);
  await say(s, 'get 1 charcoal');
  await say(s, 'stoke charcoal into kiln');
  const lit = await say(s, 'ignite kiln');
  expect(lit).toMatch(/catch|light|burn|alight/i);
  return (await act(s, `fire kiln ${extra}for ${hold}`.replace(/\s+/g, ' '), hold)).said;
}

let novice: Session;
let potter: Session;
let novicesFirstMug = '';

beforeAll(async () => {
  // ⭐ A potter makes in the working season: wet ware on an unheated shop
  // floor bursts in a frost (run 31's jug and bowls, in A's winter).
  await toWarmSeason();
  await toHour(8, 14);
  novice = await funded('novice', SHOP);
  potter = await funded('potter', SHOP);
  // ⭐ Dressed for the winter (run 26's founder died of a night of it).
  await dress(novice);
  await dress(potter);
  await dressFounder();
  // ⭐ The practiced potter is practised by the shipped harness; the
  // novice is left alone. That difference is all of 15 and 24.
  for (let i = 0; i < 40; i++) await potter.cmd('practice pottery hard success');
  await potter.drainProse();
}, 3_600_000);

afterAll(() => {
  for (const s of sessions) s?.close();
});

suite('⭐ 15 — throw at your band', () => {
  it('a novice throws a heavy, thick-walled mug', async () => {
    novice = await clayFor(novice, 2);
    const thrown = await act(novice, 'shape clay into mug', '1 hour');
    expect(thrown.said, `the novice's mug: ${thrown.said}`).toMatch(/mug/i);
    novicesFirstMug = await examine(novice, 'me:i:mug');
    expect(novicesFirstMug, 'the novice mug reads its wall').toMatch(/heavy|thick/i);
  }, 1_800_000);

  it('`shape clay into jar holding 2 gallons` is refused, and the refusal names the band', async () => {
    const big = await run(novice, 'shape clay into jar holding 2 gallons');
    expect(refusedFor(big.r), `the big jar: ${big.said}`).not.toBeNull();
    expect(big.said).toMatch(/novice|untrained|beginner|band/i);
    // STATE: nothing was made — the clay is still in hand.
    expect(await held(novice)).toMatch(/clay/i);
  }, 300_000);

  it('a practiced potter throws a LIGHT mug, and a tall jug holding 3 pints, and names it', async () => {
    potter = await clayFor(potter, 6);
    await act(potter, 'shape clay into mug', '1 hour');
    const mug = await examine(potter, 'me:i:mug');
    expect(mug, 'the practiced mug').toMatch(/light|thin/i);
    expect(mug).not.toEqual(novicesFirstMug);
    const jug = await act(potter, 'shape clay into tall jug holding 3 pints', '1 hour');
    expect(jug.said, `the jug: ${jug.said}`).toMatch(/jug/i);
    expect(await examine(potter, 'me:i:jug')).toMatch(/tall|pint/i);
    const named = await say(potter, "name jug Mother's jug");
    expect(named).toMatch(/mother/i);
    expect(await held(potter), 'the jug answers to its name').toMatch(/Mother's jug/i);
    // The rest of the day's pieces — two crocks, a jar, a thin bowl, a
    // handle, a plant pot — for 16 onward.
    for (const form of ['crock', 'crock', 'jar', 'jar', 'bowl', 'bowl', 'handle', 'plant pot']) {
      await act(potter, `shape clay into ${form}`, '1 hour');
    }
    expect(await held(potter)).toMatch(/crock/i);
  }, 3_600_000);
});

suite('⭐ 16 — trim, join, mark (leather-hard only)', () => {
  it('at leather-hard: a foot turned, a handle joined, the potter’s stamp pressed in', async () => {
    // On the boards to dry (there is no `drop all`: each piece by name).
    for (const piece of ['mug', 'jug', 'crock', 'crock', 'jar', 'jar', 'bowl', 'bowl', 'handle', 'pot']) {
      await potter.cmd(`drop ${piece}`);
    }
    await potter.drainProse();
    await say(novice, 'drop mug');
    const lh = await until(potter, 'here:i:jug', /leather-hard/i, '6 hours', 40);
    expect(lh, 'the jug at leather-hard').toMatch(/leather-hard/i);
    // The potter's OWN mug, by its maker: a bare `get mug` took the novice's
    // thick one too, and `carve` bound that one, still too soft (run 22).
    const mugs = (await potter.query('here:i:mug', { fields: 'detail' }).catch(() => [])) as { stuffId?: string; longDescription?: string }[];
    const mine = mugs.find((m) => String(m.longDescription ?? '').includes(`Made by ${potter.handle}`));
    expect(mine?.stuffId, `the potter's own mug: ${JSON.stringify(mugs.map((m) => m.longDescription?.slice(0, 120)))}`).toBeDefined();
    await say(potter, `get #${mine!.stuffId}`);
    // ⚠ An engaged act: the foot is turned when the trimming is DONE, so
    // jump past it (run 27 read the mug while the tool was still on it).
    const foot = (await act(potter, `carve foot on #${mine!.stuffId}`, '30 minutes')).said;
    expect(foot, `trim: ${foot}`).toMatch(/foot|trim|pare/i);
    expect(await examine(potter, `#${mine!.stuffId}`)).toMatch(/turned foot/i);
    await say(potter, 'get jug');
    // ⚠ The handle firms up on its own clock: "still too soft to join — it
    // would sag off" (run 28). It firms ON THE BOARD, in the shop's air — a
    // handle held in the hand never dried at all (run 34: soft and wet after
    // a day in the potter's fist). The jug stays in hand meanwhile, so it is
    // not let past leather-hard while it waits. An hour at a time.
    // By identity: the potter NPC pulls handles too. The drive's own is
    // "Made by" the potter — already on the boards (16 began by setting every
    // piece down, run 35) or still in hand.
    const mineOf = async (where: string): Promise<string | undefined> =>
      ((await potter.query(where, { fields: 'detail' }).catch(() => [])) as { stuffId?: string; longDescription?: string }[])
        .find((h) => String(h.longDescription ?? '').includes(`Made by ${potter.handle}`))?.stuffId;
    const inHand = await mineOf('me:i:handle');
    const pulled = inHand ?? (await mineOf('here:i:handle'));
    expect(pulled, 'the potter\'s pulled handle').toBeDefined();
    if (inHand) await say(potter, `drop #${pulled}`);
    const handle = await until(potter, `#${pulled}`, /leather-hard|bone-dry/i, '1 hour', 24);
    expect(handle, `the handle firm enough to join: ${handle}`).toMatch(/leather-hard/i);
    await say(potter, `get #${pulled}`);
    const fit = await act(potter, 'fit handle to jug', '30 minutes');
    expect(refusedFor(fit.r), `join: ${fit.said}`).toBeNull();
    expect(await examine(potter, 'me:i:jug')).toMatch(/handle/i);
    await say(potter, 'get stamp');
    const stamped = await say(potter, 'impress stamp on jug');
    expect(stamped, `stamp: ${stamped}`).toMatch(/mark/i);
    expect(await examine(potter, 'me:i:jug')).toMatch(/bears .+ mark/i);
    for (const ware of ['crock', 'jar', 'bowl']) {
      await say(potter, `get ${ware}`);
      await say(potter, `impress stamp on ${ware}`);
    }
    for (const piece of ['mug', 'jug', 'crock', 'crock', 'jar', 'jar', 'bowl', 'bowl', 'handle', 'pot']) {
      await potter.cmd(`drop ${piece}`);
    }
    await potter.drainProse();
  }, 3_600_000);

  it('a handle much wetter than the body cracks the joint on drying', async () => {
    // A fresh handle, thrown now, onto the potter's leather-hard MUG (the
    // one trimmed above, still in hand) — a jar has no seat for a handle
    // (run 27: "nothing in it to fit anything to"). Followed by identity.
    const rows = await potter.query('me:i:mug', { fields: ['displayName'] }).catch(() => []);
    const mug = (rows as { stuffId?: string }[])[0]?.stuffId;
    expect(mug, 'the trimmed mug in hand').toBeTruthy();
    potter = await clayFor(potter, 1);
    await act(potter, 'shape clay into handle', '1 hour');
    // ⚠ The throw may still be going after the hour: wait for the handle.
    // A thrown piece lands in the THROWER's hands (`Clay.yieldPieces`), so
    // it is looked for there — the floor held none (run 34), and a bare
    // `get handle` there could take the potter NPC's.
    const thrown = await until(potter, 'me:i:handle', /handle/i, '1 hour', 6);
    expect(thrown, 'the fresh handle').toMatch(/handle/i);
    const fit = await act(potter, `fit handle to #${mug}`, '30 minutes');
    expect(refusedFor(fit.r), `the wet handle on: ${fit.said}`).toBeNull();
    await say(potter, `drop #${mug}`);
    const dried = await until(potter, `#${mug}`, /bone-dry/i, '1 day', 30);
    expect(dried, 'the mismatched joint').toMatch(/crack|check/i);
  }, 3_600_000);

  it('bone-dry ware will not trim', async () => {
    const dry = await until(potter, 'here:i:bowl', /bone-dry/i, '1 day', 30);
    expect(dry).toMatch(/bone-dry/i);
    await say(potter, 'get bowl');
    const refused = await run(potter, 'carve foot on bowl');
    expect(refusedFor(refused.r), `trim bone-dry: ${refused.said}`).not.toBeNull();
    expect(refused.said).toMatch(/dry|crack/i);
    expect(await examine(potter, 'me:i:bowl')).not.toMatch(/turned foot/i);
    await say(potter, 'drop bowl');
  }, 3_600_000);
});

suite('⭐ 17 — bisque fire, with cones in the spy-hole', () => {
  it('the cones read the heat — and a practiced potter reads more of it', async () => {
    await until(potter, 'here:i:jug', /bone-dry/i, '1 day', 30);
    // ⚠ The loading is proven by the acts, not by `kiln:i`: that query
    // lists NOTHING though the kiln holds the ware (run 28's probe — an eval
    // read six pieces inside; the MQL finding, recorded in the plan).
    const loaded: string[] = [];
    for (const ware of ['jug', 'mug', 'crock', 'crock', 'jar', 'bowl', 'plant pot']) {
      await say(potter, `get ${ware}`);
      // ⚠ Quoted: `put plant pot in kiln` matches no shape of `put` (a
      // two-word object is quoted on a command line — run 27).
      loaded.push(await say(potter, `put ${ware.includes(' ') ? `"${ware}"` : ware} in kiln`));
    }
    expect(loaded.join(' '), 'the ware in the kiln').toMatch(/put [^.]*(jug|crock)[^.]* in an updraft kiln/i);
    await mint(SHOP, CHARCOAL, 4);
    await say(potter, 'get 1 charcoal');
    await say(potter, 'stoke charcoal into kiln');
    await say(potter, 'ignite kiln');
    await say(novice, 'get 1 cones');
    const plain1 = await say(novice, 'analyze temperature kiln');
    expect(plain1, `the novice at the spy-hole: ${plain1}`).toMatch(/cone/i);
    expect(plain1).toMatch(/glow/i);
    await say(potter, 'get 1 cones');
    const fine = await say(potter, 'analyze temperature kiln');
    expect(fine, `the potter at the spy-hole: ${fine}`).toMatch(/cone (08|04|6)/i);
    expect(fine).not.toEqual(plain1);
    // ⭐ STATE: the cones are spent by the read.
    expect(await held(potter)).not.toMatch(/pyrometric|cones/i);
  }, 3_600_000);

  it('the firing leaves porous bisque — the same pieces, fired', async () => {
    await act(potter, 'fire kiln for 10 hours', '10 hours');
    await say(potter, 'douse kiln');
    await advance('1 day'); // cooled — a kiln opened hot dunts (18)
    await say(potter, 'get jug from kiln');
    const bisque = await examine(potter, 'me:i:jug');
    expect(bisque, 'the bisque jug').toMatch(/porous|terracotta|earthenware|fired/i);
    expect(bisque).not.toMatch(/thumbprint|bone-dry/i);
    expect(bisque).toMatch(/Mother's jug|mark/i);
  }, 3_600_000);
});

suite('⭐ 18 — glaze', () => {
  it('stir an ash glaze and a lead glaze; dip two crocks inside; glost-fire them — glazed, marked and dated', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // The two tubs: ash (or lead) with a little clay and water, stirred.
    potter = await clayFor(potter, 1);
    await say(potter, 'get pail');
    await say(potter, 'fill pail from butt');
    await say(potter, 'get ash');
    // ⚠ Two-word names are quoted on a command line (run 27: `put ash in
    // ash tub` matched no shape of `put`).
    await say(potter, 'put ash in "ash tub"');
    await say(potter, 'put clay in "ash tub"');
    await say(potter, 'pour pail into "ash tub"');
    const ash = await act(potter, 'stir "ash tub"', '20 minutes');
    expect(ash.said, `the ash glaze: ${ash.said}`).toMatch(/glaze|stir|blend/i);
    expect(await examine(potter, 'ash tub')).toMatch(/ash glaze|glaze/i);
    potter = await clayFor(potter, 1);
    await say(potter, 'fill pail from butt');
    // ⚠ The lead is SETUP, handed: the shop's one pig went into the potter
    // NPC's own lead glaze, and `get lead` found only the tub (run 35).
    const pig = await hand(potter, '/stuff/thing/lead-pig');
    await say(potter, `put #${pig} in "lead tub"`);
    await say(potter, 'put clay in "lead tub"');
    await say(potter, 'pour pail into "lead tub"');
    await act(potter, 'stir "lead tub"', '20 minutes');
    expect(await examine(potter, 'lead tub')).toMatch(/lead glaze|glaze/i);
    // Two bisque crocks, dipped inside.
    // One at a time: a plural `crocks` bound nothing in the kiln and fell
    // through to lifting the kiln (run 28 — "fixed in place").
    await say(potter, 'get crock from kiln');
    await say(potter, 'get crock from kiln');
    // ⭐ Named by identity: 17 already took one bisque crock out to read it,
    // and a bare `name crock leadpot` bound the crock just named ashpot — a
    // named piece is not renamed (run 35). The potter's own two, in hand.
    const crocks = ((await potter.query('me:i:crock', { fields: 'detail' }).catch(() => [])) as {
      stuffId?: string;
      longDescription?: string;
    }[]).filter((c) => String(c.longDescription ?? '').includes(`Made by ${potter.handle}`));
    expect(crocks.length, 'two bisque crocks in hand').toBeGreaterThanOrEqual(2);
    await say(potter, `name #${crocks[0]!.stuffId} ashpot`);
    // ⚠ A dip is an engaged act: waited out, or the next one finds the
    // potter's "hands busy with something else" (run 28).
    const dippedAsh = (await act(potter, 'dip ashpot inside in "ash tub"', '10 minutes')).said;
    expect(dippedAsh).toMatch(/coat|glaze|dip/i);
    await say(potter, `name #${crocks[1]!.stuffId} leadpot`);
    await act(potter, 'dip leadpot inside in "lead tub"', '10 minutes');
    expect(await examine(potter, 'me:i:leadpot')).toMatch(/glaze|coat|wet/i);
    await say(potter, 'put ashpot in kiln');
    await say(potter, 'put leadpot in kiln');
    await fireKiln(potter, '10 hours');
    await say(potter, 'douse kiln');
    await advance('1 day');
    await say(potter, 'get ashpot from kiln');
    await say(potter, 'get leadpot from kiln');
    const glazed = await examine(potter, 'me:i:leadpot');
    expect(glazed, 'the glost-fired crock').toMatch(/glaz|gloss/i);
    expect(glazed, 'its base').toMatch(/mark.+fired|fired/i);
  }, 7_200_000);

  it('a kiln opened HOT dunts its ware — some visibly, one only to the ear, and `ring` finds it', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // A third firing, opened while it still glows. ⭐ The checkpoint loads
    // its OWN ware: what it once found left in the kiln depended on 18a,
    // and run 35 fired an empty kiln ("get all from kiln" lifted the kiln).
    const loaded: string[] = [];
    for (const ware of ['mug', 'jar', 'bowl', 'plant pot']) {
      const word = ware.includes(' ') ? `"${ware}"` : ware;
      await say(potter, `get ${word}`);
      if (/put /i.test(await say(potter, `put ${word} in kiln`))) loaded.push(word);
    }
    expect(loaded.length, 'ware in the kiln to dunt').toBeGreaterThan(0);
    await fireKiln(potter, '6 hours');
    await say(potter, 'douse kiln');
    for (const word of loaded) await say(potter, `get ${word} from kiln`);
    await advance('2 hours');
    const ware = await examine(potter, 'me:i');
    expect(ware, 'opened hot').toMatch(/crack|dunt/i);
    let rang = '';
    for (const w of ['mug', 'jar', 'bowl', 'pot']) {
      rang += ` ${await say(potter, `ring ${w}`)}`;
    }
    expect(rang, 'the ear finds what the eye does not').toMatch(/crack|dull|dead|flat/i);
  }, 3_600_000);
});

suite('⭐ 19 — lead leaches', () => {
  it('vinegar kept a week in the lead-glazed crock: no sense says anything, and it carries lead; the ash crock does not', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // ⚠ Setup by the founder: vinegar is a winemaker's spoilt wine, and
    // the drive only needs a sour liquid in two crocks — the LEACH is the act.
    await say(potter, 'drop ashpot');
    await say(potter, 'drop leadpot');
    // ⚠ The vinegar is SETUP, handed in a pail (the row's own
    // `interiorMaterial`, as a data overlay) and poured by the potter: the
    // founder's eval is parcel-bound and holds no authority over the
    // brickfield (run 34). The LEACH is the act under test.
    await hand(potter, PAIL, { interiorMaterial: '/trade/winemaking/idea/material/wine-vinegar', interiorAmount: 2 });
    await say(potter, 'pour pail into leadpot --amount 1L');
    await say(potter, 'pour pail into ashpot --amount 1L');
    await say(potter, 'drop pail');
    await advance('7 days');
    await say(potter, 'get leadpot');
    const look = await examine(potter, 'me:i:leadpot');
    const smell = await say(potter, 'smell leadpot');
    const taste = await say(potter, 'taste leadpot');
    for (const sense of [look, smell, taste]) expect(sense, 'no sense reports the lead').not.toMatch(/\blead\b(?! glaze)/i);
    const chem = await say(potter, 'analyze chemistry leadpot');
    expect(chem, `the lead crock's vinegar: ${chem}`).toMatch(/lead/i);
    await say(potter, 'get ashpot');
    const clean = await say(potter, 'analyze chemistry ashpot');
    expect(clean, `the ash crock's vinegar: ${clean}`).not.toMatch(/\blead\b/i);
    // ⚠ `drink leadpot`, not `drink from leadpot`: the second is no shape
    // of the verb, and its refusal says "drink" — which this regex matched.
    const drank = await act(potter, 'drink leadpot --amount 100ml');
    expect(refusedFor(drank.r), `drink: ${drank.said}`).toBeNull();
    expect(drank.said).toMatch(/you drink|sour|vinegar/i);
  }, 3_600_000);
});

suite('⭐ 21 — the weeping jar', () => {
  it('an unglazed jar of water weeps, its outside wet and its water below room heat; a glazed one holds at room heat', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    await mint(SHOP, THERMOMETER);
    await say(potter, 'get thermometer');
    await say(potter, 'get jar');
    await say(potter, 'fill jar from butt');
    // ⚠ By identity: the potter holds more than one jar, and `drop jar` let
    // go of two — the thermometer then read whichever answered (run 34).
    const jars = (await potter.query('me:i:jar', { fields: 'detail' }).catch(() => [])) as {
      stuffId?: string;
      bulkMaterial?: { templatePath?: string } | null;
    }[];
    const full = jars.find((j) => j.bulkMaterial?.templatePath)?.stuffId;
    expect(full, `the filled jar: ${JSON.stringify(jars.map((j) => j.bulkMaterial ?? null))}`).toBeDefined();
    await say(potter, 'fill leadpot from butt');
    await say(potter, `drop #${full}`);
    await say(potter, 'drop leadpot');
    await advance('6 hours');
    const jar = await examine(potter, `#${full}`);
    expect(jar, 'the unglazed jar').toMatch(/weep|beads|damp|wet/i);
    const room = await say(potter, 'measure temperature');
    const jarT = await say(potter, `measure temperature #${full}`);
    const potT = await say(potter, 'measure temperature leadpot');
    const k = (t: string): number => Number(/([0-9]+(?:\.[0-9]+)?)\s*K\b/.exec(t)?.[1] ?? NaN);
    expect(k(jarT), `jar ${jarT} vs room ${room}`).toBeLessThan(k(room) - 1);
    expect(Math.abs(k(potT) - k(room)), `glazed ${potT} vs room ${room}`).toBeLessThan(2);
  }, 1_800_000);
});

suite('⭐ 22 — the filter (W8)', () => {
  /**
   * One filter, one crock, one contaminated pail, in `room`: buy the filter
   * and the crock at the Terminus stall, set the filter in the crock's
   * mouth, pour the pail into the filter and stand the crock down.
   *
   * ⚠ A fresh character (`filterer`) in rooms with no other crock or
   * filter in reach: the potter carries the 19/21 crocks, and the shop's
   * floor holds more — `put filter in crock` must name ONE crock.
   *
   * ⚠ Setup by the founder: the pail's water. A river's draw is fouled or
   * tainted by the reach's contamination BY KIND (`WatercourseCatalogue.
   * draw.test.ts` pins the branch), and the Kestrel's fouling at the wharf
   * is seasonal — the spring melt thins the city's sewer to traces (the
   * maritime drive's lesson) — and no persistent outfall ships at all. So
   * the founder stands up a pail of each water by `eval`; the FILTER is the
   * act under test.
   */
  let w: Session;
  async function filterRound(room: string, water: string): Promise<void> {
    w = await goTo(w, SQUARE);
    expect(await say(w, 'buy water filter'), 'the stall sells a filter').toMatch(/you buy/i);
    expect(await say(w, 'buy crock'), 'and a crock for it to stand in').toMatch(/you buy/i);
    // ⚠ What a stall hands over may land at the buyer's feet rather than in
    // hand — the crock stayed in the square when the filterer walked on (run
    // 27: `put filter in crock` saw no crock). Picked up before leaving.
    await say(w, 'get crock');
    await say(w, 'get filter');
    expect(await held(w), 'the crock goes with the filterer').toMatch(/crock/i);
    w = await goTo(w, room);
    // The crock stands on the ground and the filter goes in it: `put … in
    // crock` names a crock HERE, not one in hand (run 28).
    await say(w, 'drop crock');
    const set = await run(w, 'put filter in crock');
    expect(refusedFor(set.r), `put filter in crock: ${set.said}`).toBeNull();
    // ⚠ The pail of each water is SETUP, handed already filled (the row's
    // own `interiorMaterial`/`interiorAmount`, as a data overlay): the
    // founder's eval is parcel-bound, and it holds no authority over the
    // brickfield (runs 31 and 34). The FILTER is the act under test.
    await hand(w, PAIL, { interiorMaterial: water, interiorAmount: 2 });
    const poured = await say(w, 'pour pail into filter');
    expect(poured, `the pour: ${poured}`).toMatch(/pour/i);
    await say(w, 'drop pail');
  }

  /** What stands in the crock with a filter in it, in `room`, after the filter has run. */
  async function strainedIn(room: string): Promise<{ material: string | null; litres: number } | null> {
    // ⭐ Read the way the filterer can: go and look in the crock (no eval —
    // the founder holds no authority over the brickfield).
    w = await goTo(w, room);
    const rows = (await w.query('here:i:crock', { fields: 'detail' }).catch(() => [])) as {
      contents?: { primaryKeyword?: string }[];
      bulkMaterial?: { templatePath?: string } | null;
    }[];
    const crock = rows.find((r) => (r.contents ?? []).some((c) => c.primaryKeyword === 'filter'));
    if (!crock) return null;
    const material = crock.bulkMaterial?.templatePath ?? null;
    return { material, litres: material ? 1 : 0 };
  }

  it('fouled river water through a ceramic filter comes out WATER; tainted water comes through TAINTED', async () => {
    // Daylight: the yard and the temper pit are out of doors.
    await toHour(8, 15);
    w = await funded('filterer', SQUARE);
    await filterRound(YARD, FOULED_WATER);
    await filterRound(TEMPER, TAINTED_WATER);
    await advance('3 hours');

    // ⭐ The bacteria stayed in the wall: what dripped into the crock is water.
    const strained = await strainedIn(YARD);
    expect(strained, 'the yard\'s crock with its filter').not.toBeNull();
    expect(strained!.litres, 'water came through').toBeGreaterThan(0);
    expect(strained!.material).toBe('/stuff/idea/material/bulk/water');

    // ⭐ The lead is dissolved: it went straight through the pores.
    const through = await strainedIn(TEMPER);
    expect(through, 'the temper pit\'s crock with its filter').not.toBeNull();
    expect(through!.litres, 'the tainted water came through').toBeGreaterThan(0);
    expect(through!.material).toBe(TAINTED_WATER);
  }, 1_800_000);
});

suite('⭐ 23 — breakage and mending', () => {
  it('the thin bowl dropped on stone breaks to sherds; the novice’s thick mug survives; on earth the thin bowl survives', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // A second thin bowl, fired, for the earth floor.
    potter = await goTo(potter, SHOP);
    const bowls = await examine(potter, 'here:i:bowl');
    expect(bowls).toMatch(/bowl/i);
    await say(potter, 'get bowl');
    await say(potter, 'get bowl');
    await say(novice, 'get mug');
    // Stone: the market square's granite setts.
    potter = await goTo(potter, SQUARE);
    novice = await goTo(novice, SQUARE);
    const dropped = await say(potter, 'drop bowl');
    expect(dropped).toMatch(/drop|bowl|shatter|break/i);
    expect(await examine(potter, 'here:i:sherds'), 'the bowl on stone').toMatch(/sherd|shard|broken/i);
    await say(novice, 'drop mug');
    expect(await examine(novice, 'here:i:mug'), 'the thick mug on stone').toMatch(/mug/i);
    await say(novice, 'get mug');
    // Earth: the weathering ground's trodden clay.
    potter = await goTo(potter, YARD);
    await say(potter, 'drop bowl');
    expect(await examine(potter, 'here:i:bowl'), 'the thin bowl on earth').toMatch(/bowl/i);
    expect(await examine(potter, 'here:i:sherds')).not.toMatch(/sherd/i);
    await say(potter, 'get bowl');
  }, 1_800_000);

  it('`grind` the sherds — grog', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    potter = await goTo(potter, SQUARE);
    await say(potter, 'get sherds');
    potter = await goTo(potter, MILL);
    const ground = await act(potter, 'grind sherds', '30 minutes');
    expect(ground.said, `grind: ${ground.said}`).toMatch(/grog|grind|mill/i);
    expect(await held(potter), 'grog in hand').toMatch(/grog/i);
  }, 1_800_000);

  it('the tinker rivets a cracked bowl — mended, and the mend shows', async () => {
    // The dunted (visibly cracked) ware from 18 is the tinker's job.
    await toHour(10, 11);
    potter = await goTo(potter, GATE);
    const tinker = await examine(potter, 'tinker');
    expect(tinker, 'the tinker on his stop').not.toEqual('');
    const asked = await run(potter, 'order repair bowl');
    const answer = await potter.awaitPrompt(5_000).catch(() => null);
    if (answer) {
      const id = (answer as { payload?: { promptId?: string }; promptId?: string }).payload?.promptId ??
        (answer as { promptId?: string }).promptId;
      if (id) potter.answerPrompt(id, 'yes');
      await new Promise((r) => setTimeout(r, 2_000));
    }
    expect(asked.said).not.toMatch(/don'?t understand/i);
    const mended = await examine(potter, 'me:i:bowl');
    expect(mended, 'the riveted bowl').toMatch(/rivet|mend/i);
  }, 1_800_000);
});

suite('⭐ 20 — flame and body', () => {
  it('a stoneware crock on a cook fire cracks; a grogged earthenware pot on the same fire survives', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    potter = await goTo(potter, SHOP);
    // Stoneware: a crock fired hot and long, wide open.
    potter = await clayFor(potter, 2);
    await act(potter, 'shape clay into crock', '1 hour');
    // The grogged body: grog trodden into clay in the temper pit.
    potter = await goTo(potter, TEMPER);
    await say(potter, 'put clay in pit');
    await say(potter, 'put grog in pit');
    await act(potter, 'knead pit', '30 minutes');
    await say(potter, 'get clay from pit');
    potter = await goTo(potter, SHOP);
    await act(potter, 'shape clay into bowl', '1 hour');
    await say(potter, 'drop crock');
    await say(potter, 'drop bowl');
    await until(potter, 'here:i:crock', /bone-dry/i, '1 day', 30);
    // ⚠ Stoneware wants ~1480 K, and this kiln's lining has worn through
    // 17's and 18's firings to a kiln that holds ~1345 K (B38 — the lining
    // is a wear part): the crock came out earthenware (run 28). Relined
    // first, with thirty firebricks handed over (setup).
    for (let i = 0; i < 30; i++) await hand(potter, '/stuff/thing/firebrick');
    const relined = await act(potter, 'fit lining to kiln', '3 hours');
    expect(refusedFor(relined.r), `reline the kiln: ${relined.said}`).toBeNull();
    await say(potter, 'get crock');
    await say(potter, 'put crock in kiln');
    await say(potter, 'get bowl');
    await say(potter, 'put bowl in kiln');
    await fireKiln(potter, '20 hours', '--draught wide ');
    await say(potter, 'douse kiln');
    await advance('1 day');
    await say(potter, 'get crock from kiln');
    await say(potter, 'get bowl from kiln');
    expect(await examine(potter, 'me:i:crock'), 'a stoneware crock').toMatch(/stoneware|dense|rings/i);
    // The cook fire.
    await mint(SHOP, CAMPFIRE);
    await mint(SHOP, CHARCOAL, 2);
    await say(potter, 'get 1 charcoal');
    await say(potter, 'stoke charcoal into campfire');
    await say(potter, 'ignite campfire');
    // ⚠ ON, not in: a campfire takes things on it (run 27: "it takes on").
    await say(potter, 'put crock on campfire');
    await say(potter, 'put bowl on campfire');
    await advance('1 hour');
    expect(await examine(potter, 'here:i:crock'), 'stoneware in the flame').toMatch(/crack/i);
    expect(await examine(potter, 'here:i:bowl'), 'grogged earthenware in the flame').not.toMatch(/crack/i);
  }, 7_200_000);

  it('boiling water poured into a cold glazed mug cracks it — thermal shock', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // The ash-glazed crock's twin: the leadpot holds water from 21; a jar of
    // water is brought to the boil by the founder (setup), then poured.
    // ⚠ The boiling water is SETUP, handed in a pail already at 372 K (the
    // authorable `stampedTemperatureK`, as a data overlay) and poured at
    // once: the founder's eval holds no authority over the brickfield (run
    // 34). The SHOCK is the act under test.
    await hand(potter, PAIL, { interiorMaterial: '/stuff/idea/material/bulk/water', interiorAmount: 1, stampedTemperatureK: 372 });
    await say(potter, 'get ashpot');
    await say(potter, 'pour out ashpot').catch(() => '');
    const poured = await say(potter, 'pour pail into ashpot');
    expect(poured).toMatch(/pour/i);
    expect(await examine(potter, 'me:i:ashpot'), 'the cold glazed crock, boiling water in').toMatch(/crack/i);
  }, 1_800_000);
});

suite('⭐ 24 — the shelf', () => {
  it('the novice’s first mug and the practiced potter’s latest read differently — heft, wall, finish', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    novice = await goTo(novice, SHOP);
    const first = await examine(novice, 'me:i:mug');
    potter = await goTo(potter, SHOP);
    potter = await clayFor(potter, 1);
    await act(potter, 'shape clay into mug', '1 hour');
    const latest = await examine(potter, 'me:i:mug');
    expect(first).toMatch(/heavy|thick/i);
    expect(latest).toMatch(/light|thin/i);
    expect(first).not.toEqual(latest);
  }, 1_800_000);
});

suite('⭐ 25 — the stall', () => {
  it('a plant pot consigned at the Terminus potter’s stall is bought with its maker and body', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // The practiced potter's bisque plant pot from 17, consigned into the
    // stall's own plant-pot line.
    potter = await goTo(potter, SHOP);
    await say(potter, 'get "plant pot" from kiln').catch(() => '');
    expect(await held(potter)).toMatch(/plant pot|pot/i);
    potter = await goTo(potter, SQUARE);
    const consigned = await say(potter, 'consign "plant pot" --ask 3');
    expect(consigned).toMatch(/consign|stall|ask/i);
    const onStall = await examine(potter, 'stall:i:pot');
    expect(onStall, 'the stall holds the pottery’s pot').toMatch(/pot/i);
    novice = await goTo(novice, SQUARE);
    const bought = await say(novice, 'buy "plant pot"');
    expect(bought).toMatch(/you buy/i);
    const pot = await examine(novice, 'me:i:pot');
    expect(pot, 'the bought pot reads its body').toMatch(/earthenware|terracotta|fired/i);
  }, 1_800_000);

  it('the general store’s plant-pot line is the pottery’s row — local first, an import dearer', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    novice = await goTo(novice, STORE);
    const bought = await say(novice, 'buy small plant pot');
    expect(bought).toMatch(/you buy/i);
    const pot = await examine(novice, 'me:i:pot');
    // ⭐ The pottery's row: a fired earthenware pot. With the pottery's
    // shelf bare it is an import — no maker, no mark — and was dearer.
    expect(pot, 'the store pot').toMatch(/flower pot|plant pot/i);
    expect(pot).toMatch(/earthenware|fired/i);
  }, 1_800_000);
});
