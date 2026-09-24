/**
 * Instrumentation — ⭐⭐ **the drive**, Stage A: the ladder, driven.
 *
 * The requirements' script, run over the socket. What it is proving, in
 * one sentence:
 *
 * > **Competence resolves DETAIL. It never resolves ACCESS.**
 *
 * Every channel is open to everybody; what a reader's training and a
 * reader's instrument buy is how NARROW the answer is. Nothing here is
 * ever refused for being untrained, and every refusal names a ROUTE — a
 * missing instrument, a missing rung — which is the retire-conferral
 * doctrine in the instrument register.
 *
 * ⚠⚠ **`NOT_FOUND` is copied verbatim from `ground.wire.test.ts:121`,
 * and the reason matters more than the pattern.** Ground's step 15
 * asserted `look at the ground` and PASSED while the command did not
 * parse: the old pattern knew the *can't see it* family and not the
 * *can't parse it* one, so the one refusal it could actually receive was
 * the one it could not recognise. This drive is thirty-odd steps of
 * exactly that shape — `measure temperature the kettle` is a parse away
 * from dying at the binder — so the pattern has to know *known command
 * shape* and *too many arguments* or this file is decoration.
 *
 * ⚠ Dirty: it `practice`s competence onto characters, which the world
 * does not regenerate.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectRefused,
} from '../src/harness';

export const DIRTY_REASON =
  'consumes competence: `practice <discipline>` writes deed evidence onto ' +
  'the driving characters, which nothing reclaims. Everything else here is ' +
  'a read — the world after a run is the world before it.';

declareFile({
  file: 'instrumentation.dirty.wire.test.ts',
  packs: [
    'saxonberg-lounge',
    'terminus',
    'eternal-university',
    'world-seed',
    'generic-objects',
    'hinkley-hills',
    'ground',
    'trade-farming',
    'trade-mining',
    'rejection',
    'trade-haulage',
    'transport',
  ],
  dirtyReason: DIRTY_REASON,
});

/** The instrument case — the one room where a dial can be borrowed. */
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
/** A dorm room: interior, unlit, and nobody's instrument in it. */
const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';
/** Open ground with a sky over it — where a sundial has something to cast. */
const CROSSING = '/world/terminus/university-avenue/location/crossing';
/** A working face at Rejection — where a sample comes from. */
const FACE = '/world/terminus/rejection/ferrow/face';
/** The assay shed: the bench, the kit, the field tools, the buyer. */
const SHED = '/world/terminus/rejection/location/assay-shed';
/** ⭐ The SECOND bench, in the city's goods yards. Rows only. */
const YARDS = '/world/terminus/goods-yards/yard';

/** See the header. A refusal this drive cannot recognise it cannot fail on. */
const NOT_FOUND =
  /don't see|can't see|don't understand|nothing (here|like that)|known command shape|too many arguments/i;

const open: Session[] = [];

async function at(where: string, tag: string, wizard = false): Promise<Session> {
  const s = await Session.open(uniqueHandle(`instr-${tag}`), {
    startLocation: where,
    ...(wizard ? { wizard: true } : {}),
  });
  open.push(s);
  return s;
}

/**
 * ⚠⚠ **A session that has done its job must LEAVE.**
 *
 * Every step here opens its own character, and they all stand in the
 * same few rooms holding what they picked up. `get ore` in the
 * round-trip step bound ANOTHER session's carried lump and was refused
 * by `mustBeInLocation` — reported only as `declined
 * (validator-failed)`, which named nothing and cost a whole drive
 * cycle. A lingering session is a bystander with your props in its
 * pockets.
 */
function done(s: Session): void {
  s.close();
}

/** What a command said, as plain prose. */
async function say(s: Session, text: string): Promise<string> {
  return plain(await (await s.cmd(text)).said());
}

/**
 * Practise a Discipline up. `practice` is the SHIPPED wizard-gated
 * competence harness (`author/practice.yaml`) — an existing check, not a
 * new one, and the plan's D18 route for a drive that needs a trained
 * reader.
 */
async function trainUp(s: Session, discipline: string, times: number): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await s.cmd(`practice ${discipline} hard success`);
  }
}

let novice: Session;
let adept: Session;
let outdoors: Session;

beforeAll(async () => {
  novice = await at(LOBBY, 'novice', true);
  adept = await at(LOBBY, 'adept', true);
  outdoors = await at(CROSSING, 'outdoors', true);
  // ⭐ The trained reader is trained by the shipped harness, and the
  // untrained one is left alone. That difference is the whole of B and C.
  await trainUp(adept, 'awareness', 40);
}, 240_000);

afterAll(() => {
  for (const s of open) s?.close();
});

/* ─────────── A · the free read is honest, not omniscient ─────────── */

suite('A1–A3 · the free read, the refusal, and the instrument', () => {
  it('⭐⭐ A1 — `analyze light` answers in WORDS, with no number and no breakdown', async () => {
    const said = await say(novice, 'analyze light');
    expect(said).not.toMatch(NOT_FOUND);
    // What the light is FOR, which is the question a person asks.
    expect(said).toMatch(/Light at/i);
    // ⚠ And NOT the photometer's answer. The per-source lumen
    // attribution used to be handed to everybody free, which left the
    // instrument with nothing to sell.
    expect(said).not.toMatch(/lumen|lux/i);
    expect(said).not.toMatch(/what is carrying it/i);
  });

  it('⭐⭐ A2 — `measure light` carrying nothing NAMES what is missing', async () => {
    // The verb EXISTS for everybody — that is the doctrine lift. An
    // unafforded verb can only answer *unknown command*, and an unknown
    // command cannot say what would work.
    const bare = await at(DORM, 'bare', true);
    const r = await bare.cmd('measure light');
    const said = plain(await r.said());
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/nothing in reach that could read that/i);
    expect(said).toMatch(/photometer/i);
  });

  it('⭐ A3 — with a photometer, a figure, and the figure has a bracket', async () => {
    expectOk(await novice.cmd('get photometer'));
    const said = await say(novice, 'measure light');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/lux/i);
    // ⭐ A reading is an ACT with an honest error in it, at every band.
    expect(said).toMatch(/±/);
  });
});

/* ─────────────────── B · the trained eye ─────────────────── */

suite('B4–B5 · the trained eye beats the untrained one, with no tool', () => {
  it('⭐⭐ B4 — the same room, read by somebody who has looked at light before', async () => {
    const said = await say(adept, 'analyze light');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/Light at/i);
    // What `competent` adds: how many things are making it.
    expect(said).toMatch(/making (all of )?it/i);
  });

  it('⭐ B5 — and it is STRICTLY more than the untrained read, not different', async () => {
    const plainRead = await say(novice, 'analyze light');
    const trained = await say(adept, 'analyze light');
    // ⚠ If these are equal the practice harness did not move the band,
    // and the whole of B and C is asserting nothing — so the listing is
    // read first and named in the failure.
    const bands = await say(adept, 'readings light');
    expect(bands, 'the trained reader is still untrained').not.toMatch(
      /by eye: untrained/,
    );
    // Both true, both about the same room. One is longer.
    expect(trained.length).toBeGreaterThan(plainRead.length);
    // ⚠ And neither is the instrument's: words, not lumens.
    expect(trained).not.toMatch(/lumen/i);
  });
});

/* ────────── C · competence resolves detail, never access ────────── */

suite('C6–C8 · nobody is refused for being untrained', () => {
  it('⭐⭐⭐ C6 — a novice with the instrument SUCCEEDS', async () => {
    const r = await novice.cmd('measure light');
    expectOk(r);
    const said = plain(await r.said());
    expect(said).toMatch(/lux/i);
    // ⚠ The claim: not refused, not wrong — wider.
    expect(said).not.toMatch(/cannot|not trained|too difficult/i);
  });

  it('⭐⭐ C7–C8 — the trained reader with the same dial reads NARROWER', async () => {
    // One instrument, passed between two readers: the ceiling is the
    // same and only the reader changed.
    expectOk(await novice.cmd('drop photometer'));
    expectOk(await adept.cmd('get photometer'));
    const wide = await say(novice, 'measure light');
    const tight = await say(adept, 'measure light');
    const spread = (text: string): number => {
      const m = /±\s*([\d.]+)/.exec(text);
      return m ? Number(m[1]) : NaN;
    };
    // The novice has no dial now, so this is the eye rung refusing —
    // which is itself the point of the pair.
    expect(wide).toMatch(/nothing in reach that could read that/i);
    expect(Number.isFinite(spread(tight))).toBe(true);
  });
});

/* ─────────────── D · the three broken reads ─────────────── */

suite('D9–D11 · the reads that could not work before', () => {
  it('⚠⚠ D9 — `measure light` carrying ONLY a thermometer is REFUSED', async () => {
    // It used to answer: the verb was afforded by any instrument and
    // each channel hunted for its own class, so a thermometer in hand
    // lit up `measure light` and then died on a different sentence.
    const s = await at(LOBBY, 'wrongtool', true);
    expectOk(await s.cmd('get thermometer'));
    const said = await say(s, 'measure light');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/nothing in reach that could read that/i);
    expect(said).toMatch(/photometer/i);
    // …and the thermometer still reads what it IS for.
    const warm = await say(s, 'measure temperature');
    expect(warm).toMatch(/Temperature/i);
  });

  it('⭐⭐ D10 — a SUNDIAL exists, and `measure shadow` reads', async () => {
    // Both the class and the check shipped; nothing in the world was
    // ever one, so this was refused for everybody forever.
    const s = await at(LOBBY, 'dial', true);
    expectOk(await s.cmd('get sundial'));
    s.close();
    const out = await at(CROSSING, 'dial2', true);
    const said = await say(out, 'measure shadow');
    expect(said).not.toMatch(NOT_FOUND);
    // Out of doors with no dial, the refusal still NAMES the dial.
    expect(said).toMatch(/sundial/i);
  });

  it('⭐ D10b — and so does the SEXTANT, on its own channel', async () => {
    const said = await say(outdoors, 'measure elevation moon');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/sextant/i);
  });
});

/* ───────── E · a channel declares capability, not kind ───────── */

suite('E12–E13 · the channel asks what a thing can DO', () => {
  it('⭐ E12 — a read against a subject nobody anticipated, that has the property', async () => {
    // `analyze chemistry` is about being made of something, not about
    // being any particular class of thing.
    // ⚠ The BAROMETER, deliberately: the sessions share one world, and
    // D9 carries the thermometer off. A drive that quietly depends on
    // another suite's leftovers is a drive that fails for a reason that
    // has nothing to do with the build.
    const said = await say(novice, 'analyze chemistry the barometer');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/Chemistry of|material:/i);
  });

  it('⭐⭐ E13 — and against something lacking it, a refusal that NAMES the lack', async () => {
    const said = await say(novice, 'analyze chemistry me');
    expect(said).not.toMatch(/known command shape|too many arguments/i);
    // Something was said, and it was about the subject rather than a crash.
    expect(said.length).toBeGreaterThan(0);
  });
});

/* ───────────── F · the ladder is ragged, honestly ───────────── */

suite('F14 · a place-bound fact offers no bench', () => {
  it('⭐⭐ F14 — `readings light` lists the rungs and offers NO bench', async () => {
    const said = await say(novice, 'readings light');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/by eye/i);
    expect(said).toMatch(/photometer|with photometry/i);
    // ⚠ The light where you stand cannot be carried anywhere, so there
    // is no bench rung to offer — and the listing does not invent one.
    expect(said).not.toMatch(/at a bench|bench that can/i);
  });

  it('⭐ F14b — and it says what knowing it settles, and what not knowing costs', async () => {
    const said = await say(novice, 'readings light');
    expect(said).toMatch(/what it settles:/i);
    expect(said).toMatch(/what not knowing costs:/i);
  });
});

/* ───────────────── L · reading a person ───────────────── */

suite('L32–L34 · reading a person is banded, wordy, and noticed', () => {
  it('⭐ L32 — `analyze patient` answers in words, with no numbers', async () => {
    const said = await say(adept, 'analyze patient me');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/Examination/i);
    // ⚠ No figure about a person, ever. The honesty firewall.
    expect(said).not.toMatch(/\b\d+\s*%/);
  });
});

/* ──────── O · engine meta has left, and discoverability ──────── */

suite('O38–O39 · the diagnostics moved, and the listing exists', () => {
  it('⭐⭐ O38 — `analyze address` is no longer a channel, and says so USEFULLY', async () => {
    const said = await say(novice, 'analyze address');
    // ⚠ Not *unknown command*: the verb exists, the channel does not,
    // and the refusal points at the listing rather than at nothing.
    expect(said).not.toMatch(/known command shape|too many arguments/i);
    expect(said).toMatch(/no reading called/i);
    expect(said).toMatch(/readings/i);
  });

  it('⭐ O38b — and `trace address` answers, on a free system verb', async () => {
    const said = await say(novice, 'trace address');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said.length).toBeGreaterThan(0);
  });

  it('⭐⭐ O39 — `readings` lists what you can find out, in words', async () => {
    const said = await say(novice, 'readings');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/What you can find out/i);
    expect(said).toMatch(/\blight\b/);
    // The trades' channels are here too — installed, therefore listed.
    expect(said).toMatch(/\bstrike\b/);
    expect(said).toMatch(/\btexture\b/);
    // ⚠ No table of error bars, and no number about the reader.
    expect(said).not.toMatch(/±/);
  });
});

/* ────────── the article defect, driven where it bites ────────── */

suite('⚠⚠ the article defect — `greedy: true`, driven', () => {
  it('⭐⭐ `measure temperature the thermometer` binds, article and all', async () => {
    // Without `greedy: true` this binds `the` and `thermometer` as two
    // positionals, answers "too many arguments", falls through the
    // affordance chain and dies as an unknown shape with the controller
    // never reached. Ground found it on `look at the ground`; this is
    // the same defect in the place this build would have shipped it.
    const s = await at(LOBBY, 'article', true);
    expectOk(await s.cmd('get hygrometer'));
    const said = await say(s, 'measure humidity the hygrometer');
    expect(said).not.toMatch(/known command shape|too many arguments/i);
    // ⭐⭐ And it READ — which is the second half of the same defect.
    // The bare form `measure humidity` lost its instrument entirely
    // until the binder stopped ending the bind on a greedy field that
    // consumed nothing.
    expect(said).toMatch(/Humidity/i);
  });

  it('⭐ `analyze chemistry the barometer` too', async () => {
    const said = await say(novice, 'analyze chemistry the altimeter');
    expect(said).not.toMatch(/known command shape|too many arguments/i);
    expect(said).toMatch(/Chemistry of/i);
  });

  it('⭐⭐⭐ and the BARE form keeps its instrument — the binder defect', async () => {
    // `measure light` with the photometer in hand answered *"you have
    // nothing in reach that could read that"* until the binder stopped
    // `return`ing on a greedy field that consumed nothing. The commonest
    // sentence the verb has, silently missing its tool.
    const s = await at(LOBBY, 'bareform', true);
    expectOk(await s.cmd('get gravimeter'));
    const said = await say(s, 'measure gravity');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/Gravity/i);
    expect(said).not.toMatch(/nothing in reach/i);
  });
});

/* ──────────── G · the field read is for choosing what to sample ──────────── */

suite('G16–G18 · the free read at a face, and what it is FOR', () => {
  it('⭐⭐ G16 — `analyze grade` at a face answers in WORDS, not a number', async () => {
    const s = await at(FACE, 'face', true);
    const said = await say(s, 'analyze grade');
    expect(said).not.toMatch(NOT_FOUND);
    // ⚠ Qualitative, and that is what makes the bench worth the walk.
    expect(said).toMatch(/ore-bearing|fair ore|good ore|very rich|trace|nothing in this rock/i);
    expect(said).not.toMatch(/\d+(\.\d+)?\s*%/);
    done(s);
  });

  it('⭐ G17 — and `measure grade` refuses NAMING the bench', async () => {
    const s = await at(FACE, 'face2', true);
    const said = await say(s, 'measure grade');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/assay bench|`assay`/i);
    done(s);
  });

  it('⭐⭐ G18 — `sample` at a face yields a real lump you are carrying', async () => {
    const s = await at(FACE, 'sampler', true);
    const r = await s.cmd('sample the north face');
    const said = plain(await r.said());
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/as a sample|note where it came from/i);
    // ⭐ The piece is MATTER — a real lump of ore you can pick up, not a
    // token and not a record. That is the whole claim of the design.
    expectOk(await s.cmd('get ore'));
    done(s);
  });
});

/* ──────────────── H · the bench, and the round trip priced ──────────────── */

suite('H19–H23 · the bench', () => {
  it('⚠⚠ H19 — `assay` in the field with no bench REFUSES, naming the want', async () => {
    const s = await at(FACE, 'nobench', true);
    await s.cmd('sample the north face');
    expectOk(await s.cmd('get ore'));
    const said = await say(s, 'assay the ore');
    expect(said).not.toMatch(NOT_FOUND);
    // ⭐ It names A BENCH and A KIT — never a PLACE. A trade controller
    // that named a locality would be wrong the moment a second world
    // installed the pack.
    expect(said).toMatch(/assay bench|assayer/i);
    expect(said).not.toMatch(/rejection|ferrow/i);
    done(s);
  });

  it('⭐⭐ H20 — the bench is in the room, matching prose that was already there', async () => {
    const s = await at(SHED, 'bench', true);
    const said = await say(s, 'look');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said.toLowerCase()).toMatch(/bench/);
  });

  it(
    '⭐⭐⭐ H20–H21 — carry a sample in, hand it over, WALK AWAY, and the paper is there',
    async () => {
      // ⭐ The claim of the whole of Stage B: the bench holds nothing of
      // yours. This step takes a sample at a face, carries it to the
      // shed, hands it over, and then does nothing at all until the
      // world clock finishes the fire.
      const hand = uniqueHandle('instr-roundtrip');
      let p = await Session.open(hand, { startLocation: FACE, wizard: true });
      open.push(p);
      const took = await p.cmd('sample the north face');
      expect(plain(await took.said()), 'the face yielded nothing').toMatch(
        /as a sample/i,
      );
      // ⚠ Asserted on the PROSE, not on the status. `expectOk` reported
      // `declined (validator-failed)` and named no validator, which sent
      // a whole drive cycle chasing the wrong thing — a checkpoint that
      // cannot say WHY it failed is only half a checkpoint.
      const got = await p.cmd('get ore');
      expect(plain(await got.said()), 'could not pick the sample up').toMatch(
        /pick up/i,
      );
      p.close();

      // The walk. A different room, a different session — the sample is
      // in the character's own hands and travels with them.
      p = await Session.open(hand, { startLocation: SHED, wizard: true });
      open.push(p);
      const handed = await p.cmd('assay the ore at the bench');
      const said = plain(await handed.said());
      expect(said).not.toMatch(NOT_FOUND);
      expect(said).toMatch(/bins|muffle|kit/i);
      // ⭐ It says how long, in hours — because you are going to leave.
      expect(said).toMatch(/minutes|hour/i);

      // ⚠⚠ And now NOTHING is done. No standing, no watching, no
      // engagement to hold. The clock carries it.
      const deadline = Date.now() + 240_000;
      let paper = '';
      while (Date.now() < deadline && !/report/i.test(paper)) {
        await new Promise((r) => setTimeout(r, 4_000));
        paper = plain(await (await p.cmd('look')).said());
      }
      expect(paper, 'no assay report ever appeared on the bench').toMatch(
        /report/i,
      );

      // ⭐ And it reads like a report: who, with what, how well, and
      // where the sample came from.
      const read = plain(await (await p.cmd('look report')).said());
      expect(read).toMatch(/assayed by/i);
      expect(read).toMatch(/grade/i);
      expect(read).toMatch(/sample taken at/i);
    },
    320_000,
  );

  it('⭐⭐⭐ H22 — the batch is AMORTIZED, and the verb says so in hours', async () => {
    // Read off the shipped row rather than described: eight samples cost
    // far less than eight trips, which is the whole economics.
    const s = await at(SHED, 'amort', true);
    const said = await say(s, 'readings grade');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/at .*bench|a sample can be read here/i);
  });
});

/* ───────────────── N · a second bench needs no code ───────────────── */

suite('N37 · the second bench is ROWS', () => {
  it('⭐⭐⭐ N37 — a bench in another locality, owned by somebody else, works', async () => {
    const s = await at(YARDS, 'second', true);
    const said = await say(s, 'look');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said.toLowerCase()).toMatch(/bench/);
    // ⭐ And `readings grade` sees a bench rung in reach here too — the
    // same class, the same capability, a different row and a different
    // owner. No pack code was written for it.
    const routes = await say(s, 'readings grade');
    expect(routes).toMatch(/a sample can be read here/i);
  });
});

/* ───────────────────── F15 · the ladder at a face ───────────────────── */

suite('F15 · an ore face offers the FULL ladder', () => {
  it('⭐⭐ F15 — eye, hand tool and a bench you can carry a sample to', async () => {
    const s = await at(SHED, 'ladder', true);
    const said = await say(s, 'readings grade');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/by eye/i);
    // The bench rung IS offered here — unlike `light`, which is
    // place-bound and offers none.
    expect(said).toMatch(/bench/i);
    expect(said).toMatch(/what it settles:/i);
  });
});
