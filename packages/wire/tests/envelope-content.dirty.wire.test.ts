/**
 * The envelope — the CONTENT half (split from `envelope.wire.test.ts` by
 * test-world-lifecycle D8): the two Terminus streets under a public-lighting
 * service. The testbed has no public lighting, so these steps stay on the
 * placeholder content they were written against, unchanged; build 2 moves
 * them. Everything else of the envelope drive stands in the scaffold.
 *
 * The clock precondition is the original file's: it must be the small hours
 * (the guard below says so, and how to get there).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain } from '../src/harness';

export const DIRTY_REASON =
  'stands on two Terminus streets and reads the realm treasury as broke — ' +
  'state the realm’s own lighting settlement and every other drive spend; ' +
  'nothing here produces it again';

declareFile({
  file: 'envelope-content.dirty.wire.test.ts',
  packs: [
    'terminus',
    'world-seed',
    'hearthworks',
    'rejection',
    'generic-objects',
    'eternal-university',
    'saxonberg-lounge',
    'trade-fuel',
  ],
  dirtyReason: DIRTY_REASON,
});

/** A funded street: the avenue association pays for this one. */
const CROSSING = '/world/terminus/university-avenue/place/crossing';
/** ⭐ Lamps standing, NOBODY PAYING — Mayfield Row is outside the city. */
const MAYFIELD = '/world/terminus/mayfield-row/street';

const open: Session[] = [];


/**
 * ⚠⚠ **The clock is the precondition, and it PERSISTS.**
 *
 * `t = 0` is Arienle 1 at 00:00 — midnight at the vernal equinox, and a
 * new moon — but `WorldClockState` is written to the database, so a
 * world booted against a used dev DB restores wherever the last one
 * left off. The first run of this file found every night assertion
 * failing because it was **the middle of the afternoon**.
 *
 * Nothing here may set the clock: `setScale` is an operator act and the
 * eval sandbox exposes only `StuffApi` / `MqlApi` / `ContainmentApi` /
 * `MixinApi`. So the file ASSERTS the condition it needs rather than
 * assuming it, and says plainly what to do about it — a drive that
 * silently tests the wrong hour is worse than one that stops.
 *
 *     pnpm --filter @saxonberg/server reset:db   # then re-run
 */
async function assertItIsDark(s: Session): Promise<void> {
  const sky = squash(plain(await (await s.cmd('analyze sky')).said()));
  // ⚠⚠ **This guard could not fail, and it was written to catch exactly
  // the thing it let through.** It matched `/moon/i` — and the DAYLIGHT
  // reading says *"Daylight over …; the season is spring. The moon is
  // new."* So a drive run against a dev DB whose clock had walked into
  // the afternoon passed the guard and then failed three assertions with
  // a confusing message, which is the failure mode the guard exists to
  // replace. Found at the sweep (2026-09-25).
  //
  // ⭐ Now it is a NEGATIVE first: whatever else the sky says, it must not
  // say `Daylight`. The positive terms follow, and the loose ones
  // (`moon`, `set`, `dark`) are gone — every one of them appears in a
  // sentence about a sunny day.
  const night =
    !/daylight/i.test(sky) && /night|below the horizon|twilight/i.test(sky);
  if (!night) {
    throw new Error(
      'envelope drive: the world clock is NOT in the small hours — ' +
        `'analyze sky' says "${sky}". Every night assertion in this ` +
        'file needs one. The wire world restores its clock from the ' +
        'database, so drop it and re-run:\n' +
        '    pnpm --filter @saxonberg/server reset:db',
    );
  }
}

async function at(where: string, tag: string, committees: string[] = []): Promise<Session> {
  const s = await Session.open(uniqueHandle(`env-${tag}`), {
    startLocation: where,
    ...(committees.length ? { committees } : {}),
  });
  open.push(s);
  return s;
}


const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

async function say(s: Session, cmd: string): Promise<string> {
  return squash(plain(await (await s.cmd(cmd)).said()));
}

afterAll(() => {
  for (const s of open) s?.close();
});

// ───────────────────── the town's own lamps ─────────────────────

suite('⭐⭐ the town lights its streets — and a broke town does not', () => {
  let lit: Session;
  let unpaid: Session;

  beforeAll(async () => {
    lit = await at(CROSSING, 'lit');
    unpaid = await at(MAYFIELD, 'unpaid');
    await assertItIsDark(lit);
  }, 180_000);

  /**
   * ⭐⭐ **A fresh realm SHIPS BROKE, so its streets ship DARK — and that
   * is the mechanism working, not failing.**
   *
   * The boot log of a fresh world is full of
   * `EmploymentLogic: … opened with no advance — treasury-short 50
   * zorkmids`. There is one treasury per currency, it starts empty, and
   * `settleStreetLighting` computes `n` from the balance **first** — so
   * `n = 0`, nothing is appropriated, and nothing is lit.
   *
   * Requirements S3: *"When the town does not pay, the streets go dark
   * — that is the failure mode and it is the point."* This is that
   * sentence, observed live, on the realm as it ships.
   *
   * ⚠ The **lit** half therefore cannot be driven here: funding the
   * treasury needs `BankingApi`, and a wire session has
   * `StuffApi`/`MqlApi`/`ContainmentApi`/`MixinApi` and nothing else.
   * It is proven instead by `PublicLighting.test.ts` (lit iff night ∧
   * funded, and the three prose states) and `Locality.lighting.test.ts`
   * (the seniority order, the single appropriation leg, and the
   * short-treasury refusal).
   */
  it('⭐ a FUNDED street on a broke realm is dark, and its lamps STAND COLD', async () => {
    expect(await say(lit, 'look')).toMatch(/pitch dark|Shapes and edges/i);
    await lit.drainProse();
    const lamps = await say(lit, 'look lamps');
    expect(lamps).toMatch(/stand cold/i);
    // ⚠ NOT "broken", and NOT "there are none". A lapsed service is a
    // different fact from a street that never had lamps, and a player
    // must be able to tell them apart.
    expect(lamps).not.toMatch(/broken/i);
  });

  it('⭐ steps 5+7 — Mayfield Row: lamps NOBODY EVEN FUNDS, on a dark street', async () => {
    // A second route to the same sentence, and the more interesting
    // one: this street is OUTSIDE the city, so its covering locality is
    // the realm, which declares no lighting service at all. The
    // standards are there; nobody has ever paid for them.
    //
    // ⚠ Both reads in ONE test, dark street first. Split across two
    // tests the second one kept receiving the FIRST one's response —
    // a harness correlation artefact, not a product failure, and
    // exactly the kind of thing that reads as one.
    await unpaid.drainProse();
    expect(await say(unpaid, 'look')).toMatch(/pitch dark|Shapes and edges/i);
    await unpaid.drainProse();
    expect(await say(unpaid, 'look lamps')).toMatch(/stand cold/i);
  });
});

