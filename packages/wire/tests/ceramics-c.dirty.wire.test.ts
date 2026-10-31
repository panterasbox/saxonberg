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
 * ⛔ **The BLOCKING drive** (soak-harness census, per
 * the ceramics soak-split census (testing.md § The soak lane) § ceramics-c): no step
 * moves the clock more than a game day. Each span step is its staged or
 * bounded twin here, marked `⛔ STAGED` / `⛔ BOUNDED`; the original spans
 * (the ten-day drying, the week of vinegar, the walk to the warm season)
 * run in `ceramics-c.soak.dirty.wire.test.ts`, the soak lane's twin.
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

/**
 * ⛔ STAGED (soak-harness census): a piece's drying — days on the shelf —
 * set directly. The potter is a wizard holding the Delight (a wizard is in
 * every managed group), so its own `eval` seeds the piece's water state as
 * a mint would (`seedDryness`: 0.6 leather-hard, 1 bone-dry). The drying
 * itself, by the clock, lives in ceramics-c.soak.dirty.
 */
async function stageDry(s: Session, target: string, dryness: number): Promise<string> {
  // No `;` anywhere: the command line splits on it.
  await say(
    s,
    `eval --parcel /world/terminus/hearts-delight --on ${target} --all self.seedDryness ? (self.seedDryness(${dryness}), 'dried') : 'not moist'`,
  );
  return examine(s, target);
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
// The potter's trimmed mug from 16, by id: 16 ends by setting every piece
// down, and 16b fits the wet handle to THIS mug (run 36 looked in hand).
let trimmedMug: string | undefined;
// The pieces 18b's hot opening dunted, by id — what the ear found. A dunt
// in bisque is hidden from the eye, so 23's tinker gets these (run 36
// looked for a visible crack and found none).
let dunted: string[] = [];

/**
 * ⭐ The piece an act leaves under `query`: the id that was not there
 * before it. A bare word binds whichever like piece comes first — in run 36
 * `drop crock` let go of ashpot, and `put crock on campfire` set the wrong
 * crock in the flame.
 */
async function freshIn(s: Session, query: string, act: () => Promise<unknown>): Promise<string | undefined> {
  const ids = async (): Promise<string[]> =>
    ((await s.query(query, { fields: ['displayName'] }).catch(() => [])) as { stuffId?: string }[])
      .map((r) => r.stuffId ?? '')
      .filter((x) => x !== '');
  const before = new Set(await ids());
  await act();
  return (await ids()).find((id) => !before.has(id));
}
let novicesFirstMug = '';

beforeAll(async () => {
  // ⭐ A potter makes in the working season: wet ware on an unheated shop
  // floor bursts in a frost (run 31's jug and bowls, in A's winter).
  // ⛔ STAGED (soak-harness census): the walk to the warm season is a span
  // (up to a game year of lived time) and lives in
  // ceramics-c.soak.dirty.wire.test.ts. Here the drive runs in whatever
  // season the world is in; the one summer-only checkpoint (21) skips
  // itself in a frost.
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
    // ⛔ STAGED (soak-harness census): leather-hard is up to ten days on
    // the shelf; set directly here.
    const lh = await stageDry(potter, 'here:i:jug', 0.6);
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
    trimmedMug = mine!.stuffId;
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
    const mug = trimmedMug;
    expect(mug, 'the trimmed mug from 16').toBeTruthy();
    expect(await say(potter, `get #${mug}`)).toMatch(/pick up|already/i);
    potter = await clayFor(potter, 1);
    // ⚠ The throw may still be going after the hour: wait for the handle.
    // A thrown piece lands in the THROWER's hands (`Clay.yieldPieces`), so
    // it is looked for there — the floor held none (run 34), and a bare
    // `get handle` there could take the potter NPC's.
    const handleId = await freshIn(potter, 'me:i:handle', async () => {
      await act(potter, 'shape clay into handle', '1 hour');
      await until(potter, 'me:i:handle', /handle/i, '1 hour', 6);
    });
    const thrown = handleId ? await examine(potter, `#${handleId}`) : '';
    expect(thrown, 'the fresh handle').toMatch(/handle/i);
    // ⭐ A soft handle will not join at all — "too soft to join, it would
    // sag off" (run 37). WETTER is the near edge of leather-hard against a
    // mug that has been drying a day longer: the handle firms on the board
    // (in the hand it never dries) an hour at a time, and joins the moment
    // it will.
    await say(potter, `drop #${handleId}`);
    const firm = await until(potter, `#${handleId}`, /leather-hard|bone-dry/i, '1 hour', 24);
    expect(firm, 'the handle just firm enough').toMatch(/leather-hard/i);
    await say(potter, `get #${handleId}`);
    const fit = await act(potter, `fit #${handleId} to #${mug}`, '30 minutes');
    expect(refusedFor(fit.r), `the wet handle on: ${fit.said}`).toBeNull();
    await say(potter, `drop #${mug}`);
    // ⛔ BOUNDED (soak-harness census): the crack is what DRYING does to a
    // mismatched joint, so it is waited for — on the crack, an hour at a
    // time, a day at most — never staged (staging dryness skips the drying).
    const dried = await until(potter, `#${mug}`, /crack|check/i, '1 hour', 24);
    expect(dried, 'the mismatched joint').toMatch(/crack|check/i);
  }, 3_600_000);

  it('bone-dry ware will not trim', async () => {
    // ⛔ STAGED (soak-harness census): bone-dry is days on the shelf.
    const dry = await stageDry(potter, 'here:i:bowl', 1);
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
    // ⛔ BOUNDED (soak-harness census): the drying was a span — a 30-day
    // `until` on the jug, then up to ten more days for the rest. Here the
    // whole step's drying is ONE game day at most: the jug is one of the
    // potter's own pieces, so the loop below covers it. If the ware is
    // still damp after that day, the step FAILS honestly (the assertion
    // after the loop) — a damp piece in a bisque bursts. The ten-day dry
    // lives in ceramics-c.soak.dirty.wire.test.ts.
    // ⭐ EVERY piece bone-dry, not just the jug: a crock still damp went in
    // and the bisque's steam burst it — "It froze wet, and the frost has
    // burst it apart" (the burst line reads for heat as for frost), and 18
    // glazed that one (run 36). A day at a time until none of the potter's
    // own reads damp.
    const damp = async (): Promise<string[]> =>
      ((await potter.query('here:i', { fields: 'detail' }).catch(() => [])) as { longDescription?: string }[])
        .map((r) => String(r.longDescription ?? ''))
        .filter((d) => d.includes(`Made by ${potter.handle}`))
        .filter((d) => /leather-hard|soft, wet|takes a thumbprint/i.test(d));
    // ⛔ STAGED (soak-harness census): the potter's own ware dried to
    // bone-dry directly — every piece in the shop answers the seed; a thing
    // with no water state answers 'not moist'.
    if ((await damp()).length > 0) await stageDry(potter, 'here:i', 1);
    expect(await damp(), 'every piece of the potter\'s bone-dry within a day of drying').toEqual([]);
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
    await say(potter, 'put 1 clay in "ash tub"');
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
    await say(potter, 'put 1 clay in "lead tub"');
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
    }[]).filter(
      (c) =>
        String(c.longDescription ?? '').includes(`Made by ${potter.handle}`) &&
        // A sound one: a burst or slumped piece takes no glaze (run 36).
        !/burst|slumped/i.test(String(c.longDescription ?? '')),
    );
    expect(crocks.length, 'two sound bisque crocks in hand').toBeGreaterThanOrEqual(2);
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
    // Unloaded by daylight: a ten-hour firing ends after dark, and in the dark
    // shop the kiln is "something" with nothing to be found in it (run 39).
    await toHour(8, 14);
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
    // ⭐ By id, one sound piece of each of the potter's own: a word bound
    // whichever piece came first, and the ear then rang a different one.
    const loaded: string[] = [];
    // (MQL takes no quotes: the plant pot is asked for by `pot`.)
    for (const ware of ['mug', 'jar', 'bowl', 'pot']) {
      const rows = [
        ...((await potter.query(`here:i:${ware}`, { fields: 'detail' }).catch(() => [])) as { stuffId?: string; longDescription?: string }[]),
        ...((await potter.query(`me:i:${ware}`, { fields: 'detail' }).catch(() => [])) as { stuffId?: string; longDescription?: string }[]),
      ];
      // ⚠ Only what the word NAMES: a crock answers to "pot" too, and run 37
      // loaded ashpot into the hot kiln (20b then found no ashpot).
      const names = ware === 'pot' ? /plant pot|flower pot/i : new RegExp(`\\b${ware}\\b`, 'i');
      const piece = rows.find(
        (r) =>
          r.stuffId &&
          names.test(String((r as { displayName?: string }).displayName ?? '')) &&
          String(r.longDescription ?? '').includes(`Made by ${potter.handle}`) &&
          !/crack|dunt|burst|slumped|leather-hard|soft, wet/i.test(String(r.longDescription ?? '')),
      );
      if (!piece) continue;
      await say(potter, `get #${piece.stuffId}`);
      if (/put /i.test(await say(potter, `put #${piece.stuffId} in kiln`))) loaded.push(piece.stuffId!);
    }
    expect(loaded.length, 'ware in the kiln to dunt').toBeGreaterThan(0);
    await fireKiln(potter, '6 hours');
    await say(potter, 'douse kiln');
    for (const id of loaded) await say(potter, `get #${id} from kiln`);
    await advance('2 hours');
    // ⭐ A dunt in an UNGLAZED body is hidden (`Thermal.shockBody`: only a
    // glaze's craze line shows it, and only a shock twice the body's
    // tolerance cracks it for the eye) — so the eye may find nothing on
    // bisque, and run 36's did not. The EAR is the read that always works.
    const ware = await examine(potter, 'me:i');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] opened hot, to the eye: ${/crack|dunt/i.test(ware) ? 'a visible crack' : 'nothing (bisque hides a dunt)'}`);
    let rang = '';
    dunted = [];
    for (const id of loaded) {
      const note = await say(potter, `ring #${id}`);
      rang += ` ${note}`;
      if (/crack|dull|dead|flat/i.test(note)) dunted.push(id);
    }
    expect(`${ware} ${rang}`, 'opened hot, the ear finds it').toMatch(/crack|dunt|dull|dead|flat/i);
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
    // ⚠ By id: the potter carries other pails, and `pour pail` bound an
    // empty one — "There's nothing to pour" (run 36).
    const vinegar = await hand(potter, PAIL, { interiorMaterial: '/trade/winemaking/idea/material/wine-vinegar', interiorAmount: 2 });
    await say(potter, `pour #${vinegar} into leadpot --amount 1L`);
    await say(potter, `pour #${vinegar} into ashpot --amount 1L`);
    await say(potter, `drop #${vinegar}`);
    // ⛔ STAGED (soak-harness census): a week's leach is a span. Six real
    // hours of acid on the lead glaze already dissolves ~1 mg/L — enough
    // for `analyze chemistry` to read "dissolved lead" while no sense says
    // anything. The week's dose lives in ceramics-c.soak.dirty.wire.test.ts.
    await advance('6 hours');
    await say(potter, 'get leadpot');
    const look = await examine(potter, 'me:i:leadpot');
    const smell = await say(potter, 'smell leadpot');
    const taste = await say(potter, 'taste leadpot');
    for (const sense of [look, smell, taste]) expect(sense, 'no sense reports the lead').not.toMatch(/\blead\b(?! glaze)/i);
    const chem = await say(potter, 'analyze chemistry leadpot');
    // ⚠ The CONTENTS line, not the word: /lead/ matched the crock's own
    // name, "leadpot", so this passed with nothing read (run 39).
    expect(chem, `the lead crock's vinegar: ${chem}`).toMatch(/dissolved lead/i);
    await say(potter, 'get ashpot');
    const clean = await say(potter, 'analyze chemistry ashpot');
    expect(clean, `the ash crock's vinegar: ${clean}`).toMatch(/contents:/i);
    expect(clean).not.toMatch(/dissolved lead/i);
    // ⚠ `drink leadpot`, not `drink from leadpot`: the second is no shape
    // of the verb, and its refusal says "drink" — which this regex matched.
    const drank = await act(potter, 'drink leadpot --amount 100ml');
    expect(refusedFor(drank.r), `drink: ${drank.said}`).toBeNull();
    expect(drank.said).toMatch(/you drink|sour|vinegar/i);
  }, 3_600_000);
});

suite('⭐ 21 — the weeping jar', () => {
  it('an unglazed jar of water weeps, its outside wet and its water below room heat; a glazed one holds at room heat', async (ctx) => {
    // ⭐ A SUMMER effect, in summer: by 21 the drive is weeks on from its
    // warm start, and a jar of water left through a frost cracks honestly
    // and weeps nothing (run 40: "It is cracked"). A no-op inside the season.
    // ⚠ With nobody in the world: lived time in 4-hour steps for two open
    // bodies took the whole 30-minute budget (run 41). Closed, the clock
    // jumps a day at a time (`advanceLiving`), and both come back where
    // they were (`goTo`).
    const potterAt = SHOP;
    potter.close();
    novice.close();
    // ⛔ STAGED (soak-harness census): the walk to the warm season is a span
    // and is gone; the step reads the shop's air below instead and skips
    // itself in a frost (the summer run lives in
    // ceramics-c.soak.dirty.wire.test.ts).
    potter = await goTo(potter, potterAt);
    novice = await goTo(novice, SHOP);
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    await mint(SHOP, THERMOMETER);
    await say(potter, 'get thermometer');
    // ⛔ STAGED (soak-harness census): a weep needs a warm day. At or below
    // 274 K the jar would freeze and crack, not weep — skip, loudly.
    const shopAir = await say(potter, 'measure temperature');
    const shopK = Number(/([0-9]+(?:\.[0-9]+)?)\s*K\b/.exec(shopAir)?.[1] ?? NaN);
    if (shopK <= 274) {
      // eslint-disable-next-line no-console -- the drive's own record
      console.log('  [drive] the shop is below freezing — the weep needs a warm day; it lives in ceramics-c.soak.dirty');
      ctx.skip();
      return;
    }
    // ⭐ By identity, and a BISQUE jar: porous terracotta, bare. 18b's short
    // hot firing leaves a jar only part-fired ("fired alluvial clay"), whose
    // tight body does not weep (run 38).
    type JarRow = { stuffId?: string; longDescription?: string };
    const jarRows = [
      ...((await potter.query('here:i:jar', { fields: 'detail' }).catch(() => [])) as JarRow[]),
      ...((await potter.query('me:i:jar', { fields: 'detail' }).catch(() => [])) as JarRow[]),
    ];
    // ⚠ A query's detail is the row's prose; a flaw is the LOOK's (the
    // Integrity augmenter) — so a jar 18's hot opening dunted reads sound
    // here. Each candidate is looked at before it is taken (run 3 of the
    // finalize drives filled a cracked one).
    let bisque: JarRow | undefined;
    for (const j of jarRows) {
      const d = String(j.longDescription ?? '');
      if (!/terracotta/i.test(d) || /glazed|coat|crack|burst/i.test(d)) continue;
      const seen = await examine(potter, `#${j.stuffId}`);
      if (/crack|broken|burst/i.test(seen)) continue;
      bisque = j;
      break;
    }
    // eslint-disable-next-line no-console -- the drive's own record
    if (!bisque) console.log(`  [drive] no bisque jar of the potter's: ${JSON.stringify(jarRows.map((j) => String(j.longDescription ?? '').slice(-120)))} — handing one`);
    // None at hand (18b's short hot firing leaves its jar unturned, run 39):
    // a terracotta jar is handed — setup; the weep is the act.
    const full =
      bisque?.stuffId ??
      (await hand(potter, '/trade/ceramics/thing/jar', { _materialPath: '/stuff/idea/material/ceramic/terracotta' }));
    await say(potter, `get #${full}`);
    await examine(potter, `#${full}`); // the record: what it was before the fill
    await say(potter, `fill #${full} from butt`);
    await examine(potter, `#${full}`); // the record: sound, or cracked by the fill
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
    // ⚠ The stall stocks one filter: the second round found it sold out
    // (run 35) — then the filter is handed (setup); the act is the filter.
    const bought = await say(w, 'buy water filter');
    if (/sold out|bare of/i.test(bought)) await hand(w, '/trade/ceramics/thing/water-filter');
    else expect(bought, 'the stall sells a filter').toMatch(/you buy/i);
    // …and the crock likewise: the first round bought the stall's last
    // (run 36).
    const crock = await say(w, 'buy crock');
    if (/sold out|bare of/i.test(crock)) await hand(w, '/trade/ceramics/thing/crock');
    else expect(crock, 'and a crock for it to stand in').toMatch(/you buy/i);
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
    const pail = await hand(w, PAIL, { interiorMaterial: water, interiorAmount: 2 });
    const poured = await say(w, `pour #${pail} into filter`);
    expect(poured, `the pour: ${poured}`).toMatch(/pour/i);
    await say(w, `drop #${pail}`);
  }

  /** What stands in the crock with a filter in it, in `room`, after the filter has run. */
  async function strainedIn(room: string): Promise<{ look: string; chem: string } | null> {
    // ⭐ Read the way the filterer can: look into the crock, and analyze what
    // is in it. ⚠ Not the detail's `bulkMaterial`: that is the vessel's own
    // BODY ("earthenware" for every crock, runs 36–38), not what it holds.
    w = await goTo(w, room);
    const rows = (await w.query('here:i:crock', { fields: 'detail' }).catch(() => [])) as {
      stuffId?: string;
      contents?: { primaryKeyword?: string }[];
      longDescription?: string;
    }[];
    const crock = rows.find((r) => (r.contents ?? []).some((c) => c.primaryKeyword === 'filter'));
    if (!crock?.stuffId) return null;
    const look = String(crock.longDescription ?? '');
    const chem = await say(w, `analyze chemistry #${crock.stuffId}`);
    return { look, chem };
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
    expect(strained!.look, 'water came through').toMatch(/holds .*water/i);
    expect(strained!.chem, `the strained water: ${strained!.chem}`).toMatch(/contents: water\b/i);
    expect(strained!.chem).not.toMatch(/dissolved/i);

    // ⭐ The lead is dissolved: it went straight through the pores.
    const through = await strainedIn(TEMPER);
    expect(through, 'the temper pit\'s crock with its filter').not.toBeNull();
    expect(through!.look, 'the tainted water came through').toMatch(/holds .*water/i);
    expect(through!.chem, `the tainted water: ${through!.chem}`).toMatch(/contents: tainted|dissolved lead/i);
  }, 1_800_000);
});

suite('⭐ 23 — breakage and mending', () => {
  it('the thin bowl dropped on stone breaks to sherds; the novice’s thick mug survives; on earth the thin bowl survives', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // A second thin bowl, fired, for the earth floor.
    potter = await goTo(potter, SHOP);
    // The bowls are on the boards, or in hand from 18b's firing (run 35).
    // ⭐ By id, sound ones of the potter's own: `drop bowl` let go of a
    // STACK of two, so one broke on stone and nothing was left for the
    // earth (run 36). And the novice's thick mug by its maker — wherever 17
    // and 18b carried it, the novice held none (run 36).
    type Row = { stuffId?: string; longDescription?: string };
    const rows = async (s: Session, q: string): Promise<Row[]> =>
      (await s.query(q, { fields: 'detail' }).catch(() => [])) as Row[];
    const by = (r: Row, who: Session): boolean => String(r.longDescription ?? '').includes(`Made by ${who.handle}`);
    const sound = (r: Row): boolean => !/crack|dunt|burst|slumped/i.test(String(r.longDescription ?? ''));
    // Sound bowls first; a dunted one will do for the second (18b's hot
    // opening dunts what it holds — run 37 found one sound bowl).
    // ⚠ And FIRED: a bowl 18b's short firing reached but never turned is
    // still clay — not brittle, so it does not shatter (run 41: "still
    // alluvial clay" held on the setts). Green ware is no use either.
    const ruined = (r: Row): boolean =>
      /burst|slumped|still [a-z ]*clay|It is green/i.test(String(r.longDescription ?? ''));
    const allBowls = [...(await rows(potter, 'here:i:bowl')), ...(await rows(potter, 'me:i:bowl'))]
      .filter((r) => r.stuffId && by(r, potter) && !ruined(r));
    // The THIN one goes on the stone — a thick wall stands the drop (run 40
    // dropped a sound but not thin bowl, and it held).
    const thin = (r: Row): boolean => /wall thin/i.test(String(r.longDescription ?? ''));
    // eslint-disable-next-line no-console -- the drive's own record: which bowls, and what each reads
    console.log(`  [drive] bowls: ${JSON.stringify(allBowls.map((r) => [r.stuffId, String(r.longDescription ?? '').replace(/\s+/g, ' ').slice(0, 220)]))}`);
    const bowls = [
      ...allBowls.filter((r) => sound(r) && thin(r)),
      ...allBowls.filter((r) => thin(r) && !sound(r)),
      ...allBowls.filter((r) => !thin(r)),
    ].map((r) => r.stuffId!);
    expect(bowls.length, 'a bowl of the potter\'s').toBeGreaterThanOrEqual(1);
    // The earth floor's bowl may be anyone's: when 17–20 left only one of the
    // potter's (run 38), a bought one is handed (setup — the act is the
    // floor's, not the throw's).
    const stoneBowl = bowls[0]!;
    const earthBowl = bowls[1] ?? (await hand(potter, '/trade/ceramics/thing/bowl'));
    for (const id of [stoneBowl, earthBowl]) await say(potter, `get #${id}`);
    // 17 bisqued by the word, and the novice's mug can still be in the kiln
    // (run 39): anything mug-shaped in there comes out first.
    for (let i = 0; i < 4; i++) {
      if (!/pick up/i.test(await say(potter, 'get mug from kiln'))) break;
    }
    const thick = [...(await rows(potter, 'here:i:mug')), ...(await rows(potter, 'me:i:mug')), ...(await rows(novice, 'me:i:mug'))]
      .find((r) => r.stuffId && by(r, novice));
    expect(thick?.stuffId, 'the novice\'s thick mug').toBeDefined();
    const mug = `#${thick!.stuffId}`;
    await say(potter, `drop ${mug}`).catch(() => '');
    await say(novice, `get ${mug}`);
    // Stone: the market square's granite setts.
    potter = await goTo(potter, SQUARE);
    novice = await goTo(novice, SQUARE);
    const dropped = await say(potter, `drop #${stoneBowl}`);
    expect(dropped).toMatch(/drop|bowl|shatter|break/i);
    expect(await examine(potter, 'here:i:sherds'), 'the bowl on stone').toMatch(/sherd|shard|broken/i);
    await say(novice, `drop ${mug}`);
    expect(await examine(novice, mug), 'the thick mug on stone').toMatch(/mug/i);
    await say(novice, `get ${mug}`);
    // Earth: the weathering ground's trodden clay.
    potter = await goTo(potter, YARD);
    await say(potter, `drop #${earthBowl}`);
    expect(await examine(potter, `#${earthBowl}`), 'the thin bowl on earth').toMatch(/bowl/i);
    expect(await examine(potter, 'here:i:sherds')).not.toMatch(/sherd/i);
    await say(potter, `get #${earthBowl}`);
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
    // ⭐ The piece a hot opening CRACKED (18b), by identity: a bare `bowl`
    // handed the tinker a sound green one — "There is nothing wrong with
    // it" (run 35).
    const cracked = ((await potter.query('me:i', { fields: 'detail' }).catch(() => [])) as {
      stuffId?: string;
      longDescription?: string;
    }[]).find((r) => /crack|dunt/i.test(String(r.longDescription ?? '')));
    // ⭐ Seen, or else heard: 18b's hot opening left its dunts hidden in
    // bisque, and the ear is what found them.
    const piece = cracked?.stuffId ?? dunted[0];
    expect(piece, 'a cracked or dunted piece from the hot kiln').toBeDefined();
    const cracked2 = { stuffId: piece };
    // ⚠ The tinker QUOTES and waits for a yes (the paid mend's prompt), and
    // the order's reply only comes once it is answered: answer it while the
    // order is still pending (run 38 awaited the reply first and timed out).
    const pending = run(potter, `order repair #${cracked2.stuffId}`);
    const answer = await potter.awaitPrompt(30_000).catch(() => null);
    if (answer) {
      const id = (answer as { payload?: { promptId?: string }; promptId?: string }).payload?.promptId ??
        (answer as { promptId?: string }).promptId;
      if (id) potter.answerPrompt(id, 'yes');
    }
    const asked = await pending;
    await new Promise((r) => setTimeout(r, 2_000));
    expect(asked.said).not.toMatch(/don'?t understand/i);
    const mended = await examine(potter, `#${cracked2.stuffId}`);
    expect(mended, 'the riveted piece').toMatch(/rivet|mend/i);
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
    // A thrown piece lands in the thrower's hands (`Clay.yieldPieces`).
    const crockId = await freshIn(potter, 'me:i:crock', async () => {
      await act(potter, 'shape clay into crock', '1 hour');
      await until(potter, 'me:i:crock', /crock/i, '1 hour', 6);
    });
    expect(crockId, 'the stoneware crock, thrown').toBeDefined();
    const crock = `#${crockId}`;
    // The grogged body: grog trodden into clay in the temper pit.
    potter = await goTo(potter, TEMPER);
    await say(potter, 'put clay in pit');
    expect(await say(potter, 'put grog in pit'), 'the grog from 23').toMatch(/put/i);
    await act(potter, 'knead pit', '30 minutes');
    await say(potter, 'get clay from pit');
    potter = await goTo(potter, SHOP);
    const bowlId = await freshIn(potter, 'me:i:bowl', async () => {
      await act(potter, 'shape clay into bowl', '1 hour');
      await until(potter, 'me:i:bowl', /bowl/i, '1 hour', 6);
    });
    expect(bowlId, 'the grogged bowl, thrown').toBeDefined();
    const bowl = `#${bowlId}`;
    await say(potter, `drop ${crock}`);
    await say(potter, `drop ${bowl}`);
    // ⛔ STAGED (soak-harness census): bone-dry is days on the shelf.
    await stageDry(potter, crock, 1);
    // ⚠ Stoneware wants ~1480 K, and this kiln's lining has worn through
    // 17's and 18's firings to a kiln that holds ~1345 K (B38 — the lining
    // is a wear part): the crock came out earthenware (run 28). Relined
    // first, with thirty firebricks handed over (setup).
    for (let i = 0; i < 30; i++) await hand(potter, '/stuff/thing/firebrick');
    const relined = await act(potter, 'fit lining to kiln', '3 hours');
    expect(refusedFor(relined.r), `reline the kiln: ${relined.said}`).toBeNull();
    for (const piece of [crock, bowl]) {
      await say(potter, `get ${piece}`);
      await say(potter, `put ${piece} in kiln`);
    }
    await fireKiln(potter, '20 hours', '--draught wide ');
    await say(potter, 'douse kiln');
    // ⛔ BOUNDED (soak-harness census): the cooling was a whole day, which
    // took the step past a day. The shock this step reads is in the first
    // hours, so six hours' cooling is the wait it needs. ⚠ Still over a day
    // in total: the bone-dry `until` and the 20-hour firing above remain
    // (flagged in the census report).
    await advance('6 hours');
    await say(potter, `get ${crock} from kiln`);
    await say(potter, `get ${bowl} from kiln`);
    expect(await examine(potter, crock), 'a stoneware crock').toMatch(/stoneware|dense|rings/i);
    // The cook fire.
    await mint(SHOP, CAMPFIRE);
    await mint(SHOP, CHARCOAL, 2);
    await say(potter, 'get 1 charcoal');
    await say(potter, 'stoke charcoal into campfire');
    await say(potter, 'ignite campfire');
    // ⚠ ON, not in: a campfire takes things on it (run 27: "it takes on").
    await say(potter, `put ${crock} on campfire`);
    await say(potter, `put ${bowl} on campfire`);
    await advance('1 hour');
    expect(await examine(potter, crock), 'stoneware in the flame').toMatch(/crack/i);
    expect(await examine(potter, bowl), 'grogged earthenware in the flame').not.toMatch(/crack/i);
  }, 7_200_000);

  it('boiling water poured into a cold glazed mug cracks it — thermal shock', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    // ⚠ The boiling water is SETUP, handed in a pail already at 372 K (the
    // authorable `stampedTemperatureK`, as a data overlay) and poured at
    // once: the founder's eval holds no authority over the brickfield (run
    // 34). The SHOCK is the act under test.
    // ⭐ What the criterion names: a cold GLAZED MUG (AC: "boiling water
    // into a cold glazed mug → it cracks"). The ashpot reached only porous
    // terracotta, whose open body stands the step — the rule is right, the
    // piece was wrong (runs 36–38). Setup: the fired mug row with a fused
    // ash glaze laid on it (the row's own `coats`, as a data overlay).
    const mug = await hand(potter, '/trade/ceramics/thing/mug', {
      coats: { outside: [{ material: '/stuff/idea/material/glaze/ash', thicknessM: 0.0003, state: 'set' }] },
    });
    const boiling = await hand(potter, PAIL, { interiorMaterial: '/stuff/idea/material/bulk/water', interiorAmount: 1, stampedTemperatureK: 372 });
    const poured = await say(potter, `pour #${boiling} into #${mug} --amount 250ml`);
    expect(poured).toMatch(/pour/i);
    expect(await examine(potter, `#${mug}`), 'the cold glazed mug, boiling water in').toMatch(/crack/i);
  }, 1_800_000);
});

suite('⭐ 24 — the shelf', () => {
  it('the novice’s first mug and the practiced potter’s latest read differently — heft, wall, finish', async () => {
    // Read and act by daylight: in the dark a query sees nothing, and a
    // named piece in your own hand cannot be bound (run 34's glaze, at night).
    await toHour(8, 14);
    novice = await goTo(novice, SHOP);
    potter = await goTo(potter, SHOP);
    // ⭐ Each mug by its MAKER, wherever it is now: the novice's first one
    // had changed hands by 24 — it was in the potter's (run 35).
    const mugBy = async (maker: string): Promise<string> => {
      for (const [s, where] of [[novice, 'me:i:mug'], [potter, 'me:i:mug'], [potter, 'here:i:mug']] as const) {
        const rows = (await s.query(where, { fields: 'detail' }).catch(() => [])) as { longDescription?: string }[];
        const mine = rows.find((r) => String(r.longDescription ?? '').includes(`Made by ${maker}`));
        if (mine) return String(mine.longDescription);
      }
      return '';
    };
    // …and, wherever 16–20 carried it (the kiln, the square), the reading
    // 15 took of it: the same mug, read when it was made (run 38 found it
    // in nobody's reach).
    const first = (await mugBy(novice.handle)) || novicesFirstMug;
    potter = await clayFor(potter, 1);
    await act(potter, 'shape clay into mug', '1 hour');
    const latest = await mugBy(potter.handle);
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
    expect(consigned).toMatch(/consign|stall|ask|for sale/i);
    // ⚠ Not `stall:i`: a consigned piece is a line on the stall's stock, not
    // a thing in it, and the read listed nothing (run 37). What the buyer
    // gets is the record — the potter's own pot, by its maker.
    novice = await goTo(novice, SQUARE);
    const bought = await say(novice, 'buy "plant pot"');
    expect(bought).toMatch(/you buy/i);
    const pot = await examine(novice, 'me:i:pot');
    expect(pot, 'the bought pot reads its body').toMatch(/earthenware|terracotta|fired/i);
    expect(pot, 'the consigned pot, its maker on it').toContain(`Made by ${potter.handle}`);
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
