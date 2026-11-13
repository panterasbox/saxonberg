/**
 * Paint and adhesives — ⭐⭐ **a building's outside, the coat that weathers,
 * paint made from what ships, glue, and the hazards**, driven over the wire
 * (the paint requirements' drive; numbering kept).
 *
 * The BLOCKING drive: instant, short and staged steps only. The span steps
 * — 7 (a year of weather takes the coat), 10 (lime carbonating over days),
 * 14 (a heap of rags warming for weeks), 16 (gum gathering through a warm
 * spell), 20 (a lake fading in a window), 23 (a hide line in a damp cellar)
 * — have staged twins here and their real clocks in
 * `paint.soak.dirty.wire.test.ts`.
 *
 * Staged twins (wizard `eval` as the founder): 7 strips the cottage's coat
 * and ages its fabric 60 days; 12 reads `shouldPersist()` staged and sold;
 * 14 sets the rag heap's core past its oily ignition point.
 *
 * Steps NOT driven here, and why:
 *  - 13 (paint a ship from the quay; she sails → no landing) — the Hesper
 *    starts at the bar, not alongside; the rule is unit-proved
 *    (`Structure.landing.test.ts`, the sailed-ship case).
 *  - 16/17 (tap pine, cut the gum) — Hanging Wood's pines and the still are
 *    rows over shipped mechanisms; the blade tap is unit-proved
 *    (`SapStandard.test.ts`), the gather is the soak's.
 *  - 18 (turpentine in a shut room) — a pour joins only like with like
 *    (B28), and the fumes need an open dish; the vapor and its Condition
 *    are rows; recorded on the MR.
 *  - 21 (Tam on his round), 22–24 (boil hide glue; glue and steam a joint)
 *    — long acts; 23/24 are unit-proved (`Assembled.glue.test.ts`).
 *
 * ⚠⚠ `.dirty.`: it buys from the colorman, mills and stirs, paints the
 * towpath cottage, sets oily rags alight in the colorman's shed — none of it
 * produced again.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  nourish,
  hand,
  advanceWorldClock,
  pinWeather,
  unpinWeather,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  "buys from the colorman, mills, stirs and paints the towpath cottage, and sets oily rags " +
  "alight in the colorman's shed — none of it produced again";

declareFile({
  file: 'paint.dirty.wire.test.ts',
  packs: [
    'terminus', 'rejection', 'residence', 'trade-painting', 'trade-forestry', 'trade-distilling',
    'trade-chandlery', 'trade-coopering', 'trade-milling', 'trade-farming', 'trade-tanning', 'trade-fishing',
    'trade-ranching', 'trade-dairying', 'trade-quarrying', 'trade-shopkeeping', 'water',
    'world-seed', 'generic-objects', 'base-library',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const SHOP = '/world/terminus/wharfside/colorman/location/shop';
const YARD = '/world/terminus/wharfside/colorman/location/yard';
const SHED = '/world/terminus/wharfside/colorman/location/shed';
const TOWPATH = '/world/terminus/valley-road/towpath';
const COTTAGE_ROOM = '/world/terminus/wharfside/cottage/location/room';
const COTTAGE = '/world/terminus/wharfside/cottage';
const KIT = '/system/residence/thing/householders-kit';
/** What `measure paint` reads a wall with — a rule or a gauging rod. */
const ROD = '/trade/coopering/thing/gauging-rod';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command|unknown-verb/i.test(said);
}

/** A command, answering any prompt it raises with the first choice. */
async function run(s: Session, line: string): Promise<CommandResult> {
  let done = false;
  const pending = s.cmd(line).finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = (await s.awaitPrompt(250).catch(() => null)) as
        | { payload?: { promptId?: string; outcome?: { notes?: { kind?: string; matches?: { stuffId?: string }[]; choices?: { response?: string }[] }[] } }; promptId?: string; outcome?: { notes?: { kind?: string; matches?: { stuffId?: string }[]; choices?: { response?: string }[] }[] } }
        | null;
      if (!p || done) continue;
      const payload = p.payload?.promptId ? p.payload : p;
      const id = payload.promptId;
      if (!id) continue;
      const note = payload.outcome?.notes?.find((n) => n.kind?.startsWith('prompt-'));
      if (note?.kind === 'prompt-mql-object') s.answerPrompt(id, note.matches?.[0]?.stuffId ?? '');
      else if (note?.kind === 'prompt-mql-many') s.answerPrompt(id, JSON.stringify(note.matches?.[0]?.stuffId ? [note.matches[0].stuffId] : []));
      else if (note?.kind === 'prompt-choice') s.answerPrompt(id, note.choices?.[0]?.response ?? '');
      else s.answerPrompt(id, 'yes');
    }
  })();
  const r = await pending;
  await new Promise((res) => setTimeout(res, 300));
  return r;
}

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  const r = await run(s, line);
  const said = squash(await r.said());
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${said.slice(0, 400)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return said;
}

/** A durative act: wait for its engagement, then what it said and what followed. */
async function act(s: Session, line: string, timeoutMs = 600_000): Promise<string> {
  await s.drainProse();
  const r = await run(s, line);
  const said = squash(await r.said());
  const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
  if (started?.engagementId) await s.awaitActivity(started.engagementId, timeoutMs);
  await new Promise((res) => setTimeout(res, 500));
  const later = squash(await s.listen(1_500).catch(() => ''));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${said.slice(0, 250)} … ${later.slice(0, 300)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return `${said} ${later}`.trim();
}

async function session(handle: string, at: string, opts: { parcels?: string[] } = {}): Promise<Session> {
  const s = await Session.open(handle, { startLocation: at, ...opts });
  open.push(s);
  await nourish(s).catch(() => {});
  return s;
}

/**
 * As the founder (a wizard), run a staging `eval` standing at `where`. The
 * founder sits on no committee by default, so it is seated on the one over
 * `parcel` — what `eval --parcel` asks (wizard-axis D13).
 */
async function founderEval(where: string, parcel: string, on: string, code: string): Promise<string> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true, committees: [parcel] });
  try {
    const r = await gov.cmd(`eval --parcel ${parcel} --on ${on} ${code}`);
    const said = squash(await r.said());
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] (founder eval --on ${on}) → ${said.slice(0, 200)}`);
    return said;
  } finally {
    gov.close();
  }
}

/** A fresh character with money in the bank. */
async function funded(prefix: string, amount = 400): Promise<string> {
  const handle = uniqueHandle(prefix);
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override ${amount} to ${handle} "wire: paint funding"`));
  } finally {
    gov.close();
  }
  s.close();
  return handle;
}

async function setDial(key: string, value: string): Promise<void> {
  // `config` is the Prime Minister's — the founder's by default.
  const wiz = await Session.open('founder', { startLocation: SHOP });
  try {
    expectOk(await wiz.cmd(`config ${key} ${value}`));
  } finally {
    wiz.close();
  }
}

async function carried(s: Session, keyword: string): Promise<number> {
  return (await s.query(`me:i:${keyword}`, { fields: ['displayName'] }).catch(() => [])).length;
}

afterAll(async () => {
  for (const s of open) s.close();
  await unpinWeather(TOWPATH).catch(() => {});
});

let painter = '';

suite('paint — the blocking drive', () => {
  it('setup: a painter with money', async () => {
    painter = await funded('pnt');
  }, 300_000);

  it("1. the colorman's: a shop, its keeper, and the list bought", async () => {
    const s = await session(painter, SHOP);
    const l = await say(s, 'look');
    expect(l, l).toMatch(/colorman/i);
    for (const line of [
      'buy brush', 'buy "paint pot"', 'buy "oil jar"', 'buy "flax seed"', 'buy "ochre clay"',
      'buy "pot of ochre paint"', 'buy "pot of ochre paint"', 'buy "sign board"', 'buy "gessoed panel"',
    ]) {
      const b = await say(s, line);
      expect(b, b).not.toMatch(/bare|cannot afford|no one/i);
    }
    await say(s, 'buy rags');
    for (let i = 0; i < 4; i++) await say(s, 'buy "cake of lead white"');
    expect(await carried(s, 'brush')).toBeGreaterThanOrEqual(1);
    expect(await carried(s, 'kettle')).toBe(1);
  }, 600_000);

  it('2. flax seed on the quern gives linseed oil', async () => {
    const s = await session(painter, YARD);
    const m = await act(s, 'mill flax');
    expect(m, m).toMatch(/stones|oil|jar/i);
    expect(await carried(s, 'jar')).toBeGreaterThanOrEqual(1);
  }, 900_000);

  it('3. ochre clay on the quern gives yellow ochre', async () => {
    const s = await session(painter, YARD);
    await act(s, 'mill ochre');
    expect(await carried(s, 'yellow ochre')).toBeGreaterThanOrEqual(1);
  }, 900_000);

  it('4. pour the oil, put in the ochre, stir: a yellow oil paint, said in words', async () => {
    const s = await session(painter, SHOP);
    // ⚠ `me:i:kettle`: the shop props a pot of its own (the drive found the
    // oil going into the shop's pot and the ochre into the painter's).
    await say(s, 'pour jar into me:i:kettle');
    await say(s, 'put paper in me:i:kettle');
    await act(s, 'stir me:i:kettle');
    const l = await say(s, 'look me:i:kettle');
    expect(l, l).toMatch(/linseed oil/i);
    expect(l, l).toMatch(/yellow ochre/i);
  }, 600_000);

  // ⭐ `survey` was retired (owner, controller-liquidity W17): the coat is
  // `look`'s, the why is `analyze condition`'s, the job is `measure paint`'s
  // (with a rule or a gauging rod), and the place read is `analyze rooms`.
  it('5. from the towpath the cottage is at hand: look and measure paint', async () => {
    const s = await session(painter, TOWPATH);
    const l = await say(s, 'look cottage');
    expect(l, l).toMatch(/cottage/i);
    expect(l, l).toMatch(/limewash/i);
    await hand(s, ROD);
    const v = await say(s, 'measure paint cottage');
    expect(v, v).toMatch(/square meters/i);
    expect(v, v).toMatch(/litres/i);
  }, 300_000);

  it('6. inside, `analyze rooms` reads the same building', async () => {
    const s = await session(painter, COTTAGE_ROOM);
    const v = await say(s, 'analyze rooms');
    expect(v, v).toMatch(/fabric of the place/i);
  }, 300_000);

  it("7. (staged) the weather has taken the coat: `analyze condition` says so", async () => {
    await founderEval(
      TOWPATH,
      '/world/terminus',
      'cottage',
      '(self.getConditionWord(), self.setCoats({}), self.setWeatheredToS(self.getWeatheredToS() - 5184000), self.getConditionWord())',
    );
    const s = await session(painter, TOWPATH);
    const v = await say(s, 'analyze condition cottage');
    expect(v, v).toMatch(/paint has gone/i);
  }, 300_000);

  it('8. paint the cottage on a dry day: the pot drops, the coat goes on wet and sets', async () => {
    await pinWeather('clear', TOWPATH);
    const s = await session(painter, TOWPATH);
    const p = await act(s, 'paint cottage with "ochre paint"');
    expect(p, p).toMatch(/wet coat|start laying/i);
    const wet = await say(s, 'look cottage');
    expect(wet, wet).toMatch(/wet coat/i);
    // An oil sets in a day or two of free air, slower in the cold.
    for (let h = 0; h < 72; h += 6) await advanceWorldClock('6 hours');
    const set = await say(s, 'look cottage');
    expect(set, set).toMatch(/painted/i);
  }, 1_200_000);

  it('9. paint again in pinned rain: the coat runs', async () => {
    await pinWeather('rain', TOWPATH);
    const s = await session(painter, TOWPATH);
    await act(s, 'paint cottage with "ochre paint"');
    await advanceWorldClock('2 hours');
    const v = await say(s, 'look cottage');
    // Rain runs a wet coat; frost crazes it — either way it set badly.
    expect(v, v).toMatch(/run|crazed/i);
    await unpinWeather(TOWPATH);
  }, 900_000);

  it('11. maintain from the towpath mends the fabric and leaves the coat', async () => {
    const s = await session(painter, TOWPATH);
    await hand(s, KIT);
    const m = await say(s, 'maintain cottage');
    expect(m, m).toMatch(/sound again|nothing that needs doing|brush's work/i);
    const v = await say(s, 'analyze condition cottage');
    expect(v, v).toMatch(/it is sound/i);
  }, 300_000);

  it('12. (staged) the staged cottage keeps no record; sold, it would', async () => {
    const staged = await founderEval(TOWPATH, '/world/terminus', 'cottage', 'self.shouldPersist()');
    expect(staged, staged).toMatch(/false/);
    // Sold: a PERSON comes to hold the cottage's parcel. (The harness's
    // `parcels:` grant keeps a town parcel its group already lets a new
    // character hold, so the transfer is staged directly.)
    await founderEval(TOWPATH, '/world/terminus', 'cottage',
      "ParcelApi.transfer('/world/terminus/wharfside/cottage', { kind: 'player', templatePath: '/platform/agent/Avatar/drive-buyer' })");
    const sold = await founderEval(TOWPATH, '/world/terminus', 'cottage', 'self.shouldPersist()');
    expect(sold, sold).toMatch(/true/);
  }, 300_000);

  it('14. (staged) oily rags heaped in the shed catch', async () => {
    const s = await session(painter, SHED);
    // ⭐ How a painter's rag gets oily: dipped in the pot.
    // A rag is dipped one at a time (the heap is what is dropped together —
    // unit-proved in Rag.test.ts and soaked on the real clock).
    await act(s, 'dip rags in pot');
    await say(s, 'drop rags');
    const caught = await founderEval(SHED, '/world/terminus', 'rags --all', '(self.setCoreTemperatureK(430), self.reconcileHeating(), self.isBurning())');
    // The oily rag catches at its core; the dry stack beside it does not.
    expect(caught, caught).toMatch(/a rag: true/);
    expect(caught, caught).toMatch(/6 rags: false/);
  }, 600_000);

  it('15. grinding white lead again and again: the lead is in the body', async () => {
    // Staged: the dust dial raised so four cakes show what weeks of grinding
    // would; put back after.
    await setDial('metabolism.leadDustDose', '1');
    const s = await session(painter, YARD);
    for (let i = 0; i < 4; i++) await act(s, 'mill cake');
    await setDial('metabolism.leadDustDose', '0.3');
    const a = await say(s, 'assess me');
    expect(a, a).toMatch(/pallid|aching|confused|lead/i);
  }, 1_200_000);

  it('19. letter a sign board in paint, and anyone reads it', async () => {
    const s = await session(painter, SHOP);
    const w = await say(s, 'write ROPEWALK on "sign board" with "ochre paint"');
    expect(w, w).toMatch(/letter/i);
    const r = await say(s, 'read board');
    expect(r, r).toMatch(/ROPEWALK/);
  }, 300_000);

  it('25. the brush is an assembly: bristle glued into a handle', async () => {
    const s = await session(painter, SHOP);
    const l = await say(s, 'look brush');
    expect(l, l).toMatch(/handle/i);
    expect(l, l).toMatch(/bristle/i);
  }, 300_000);
});
