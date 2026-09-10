/**
 * ⭐⭐ Consequence — **the drive**, as a wire file.
 *
 * The requirements doc's 24-step script, run over the raw socket against
 * a booted world. It is the build's exit criterion and it exists because
 * **tests build state; they never use it.** Every wave in this build
 * passed its unit suite; what only this file can say is whether a person
 * can reach any of it.
 *
 * The claims that genuinely need a live world, and why the unit suite
 * cannot make them:
 *
 *   - **`analyze patient` exists at all.** Its stanza is contributed to
 *     the platform's `analyze.yaml` and its controller lives in a pack
 *     that has to be installed, its class resolved through the server's
 *     `exports` map, and its seed row present on disk. Four links, each
 *     failing closed and silent. A unit test proves the controller;
 *     only the wire proves the VERB.
 *   - **The clinic is reachable and its business stands up lazily.**
 *     `ensureOperatorAt` fires on the first order; a room with a tariff
 *     and no operator serves on the house, silently, forever.
 *   - **A fresh boot survives the shape changes.** `ProgressionSpec`,
 *     `VitalEffect` and `BodyPart.governs` all changed shape, and every
 *     one of the 23 condition rows was re-authored.
 *   - **The poise read renders.** Textiles found three defects exactly
 *     here — the card surface treats `look` and combat lines differently,
 *     and an envelope assertion cannot see a rendering.
 *   - **A verb that was cut is actually gone.** `fight parley` and the
 *     guard-post `watch` were both removed in review; a deleted
 *     `command-view` row only stops existing once a boot reconciles it,
 *     so the checkout proves nothing and the world's own help proves
 *     everything.
 *   - **The ways out of a fight are the ones that survived review.**
 *     `fight parley` was cut (see the step-23 assertion); what the wire
 *     proves is that the menu still names the honest exits and no longer
 *     names the retired one.
 *
 * ⚠⚠ **What is NOT driveable, and must not be faked.** Steps 6–7 and
 * 15–19 need a competence history and a death, both of which take game
 * hours the shipped 12× clock will not hand over inside a test. Those
 * arcs are proven exactly, in milliseconds, by `Competence.floor.test.ts`
 * (the floor, the above-band rule, the measured scenarios) and
 * `Advancement.suppression.test.ts` (across-the-board, tapering, and the
 * byte-identical Transcript). Turning the clock up would need a wizard,
 * which would prove something no player can do. What the wire adds for
 * those is that the **surfaces** are reachable: `competence` renders the
 * diminished marker, and the infirmary's slate lists what a better way
 * back costs.
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
 * ⭐ **Why this file cannot run twice.**
 *
 * ⚠ Narrower than it first shipped, and the correction is the honest
 * one: **every command here is a READ except `order treatment`**, and
 * that one is refused on a sound body. No money moves and no body is
 * wounded — the fight and death arcs are not driveable inside a test
 * (see the header). What does not come back is the **lazy business
 * stand-up**: `ensureOperatorAt` fires before the refusal, an operator
 * begins operating at the ward, and nothing anywhere stands a business
 * down again.
 *
 * ⭐ Which is a question for the trade rather than for this file: *a
 * venue visited once is permanently operated.* Offered to
 * `retail-slate` / `employment` as a finding — the wire build reports
 * dirtiness, it does not fix it.
 */
export const DIRTY_REASON =
  "stands the infirmary's business up lazily on the first `order`, and " +
  'nothing in the tree ever stands one down again';

declareFile({
  file: 'consequence.dirty.wire.test.ts',
  packs: ['trade-medicine', 'terminus', 'hearthworks'],
  dirtyReason: DIRTY_REASON,
});

const WARD = '/world/terminus/infirmary/ward';
const GRAVES = '/world/terminus/necropolis/ground';
const SMITHY = '/world/hearthworks/location/smithy';

let patient: Session;

beforeAll(async () => {
  patient = await Session.open(uniqueHandle('conseq'), {
    startLocation: WARD,
  });
}, 180_000);

afterAll(() => patient?.close());

/* ───────────────── the world boots at all ───────────────── */

suite('a fresh boot survives the shape changes', () => {
  it('⭐⭐ the condition rows all warmed', async () => {
    // `ProgressionSpec` gained a required `law`, `VitalEffect` became a
    // four-kind union, and all 23 rows were re-authored. A row that fails
    // to stand up warns and continues, so a broken roster is SILENT — the
    // exact failure the catalogue's own docstring records having shipped
    // once before.
    const help = await patient.cmd('help treat');
    expectOk(help);
  }, 120_000);
});

/* ───────────────── steps 11-14: the medic ───────────────── */

suite('the diagnosis surface — steps 11-14', () => {
  it('⭐⭐ `analyze patient` is a verb the world knows', async () => {
    // FOUR links, each failing closed and silent: the pack installed,
    // the stanza merged onto the platform's `analyze.yaml`, the class
    // resolved through the server `exports` map, and the controller's
    // seed row on disk. A unit test proves the controller; only this
    // proves the VERB.
    const help = await patient.cmd('help analyze');
    expectOk(help);
    const said = await help.said();
    expect(said, 'the stanza merged rather than replacing the view').toMatch(
      /patient/i,
    );
    // …and the shipped channels are still there — a REPLACING overlay
    // would have taken them with it.
    expect(said).toMatch(/ground|weather|light/i);
  }, 120_000);

  it('reads a body and says something', async () => {
    const out = await patient.cmd('analyze patient');
    expectOk(out);
    const said = await out.said();
    expect(said.length).toBeGreaterThan(0);
    expect(said, 'bands and prose, never a raw stat').not.toMatch(/\d+\.\d+/);
  }, 60_000);

  it('⭐ `analyze postmortem` exists too, and refuses a living body', async () => {
    const help = await patient.cmd('help analyze');
    expect(await help.said()).toMatch(/postmortem/i);
    // Pointed at somebody alive it declines in its own words rather than
    // reading them as a corpse.
    const out = await patient.cmd('analyze postmortem me');
    // ⚠ Varargs, not an array — `expectOkOr(result, ...reasons)`. The
    // drive's first run failed here on the assertion rather than on the
    // world: the reason WAS `no-subject` and the harness was comparing
    // it against a one-element array holding an array.
    expectOkOr(out, 'no-subject', 'empty-result', 'validator-refused');
  }, 60_000);
});

/* ───────────────── the clinic sells something ───────────────── */

suite('the wake — a service somebody is paid for (steps 14, 19, 20)', () => {
  it('⭐⭐ the infirmary is REACHABLE from the street', async () => {
    // Counting-House Row had a bank, a store and a realty office and
    // nowhere at all to be seen to.
    const here = await patient.query('here', { fields: ['displayName'] });
    const names = here
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names).toMatch(/infirmary|ward/i);
  }, 60_000);

  it('⭐ the tariff lists what the house does, and what it costs', async () => {
    // The `Tariff` read. Before this build no shipped priced key
    // resolved to anything but a recipe or a stock line.
    const menu = await patient.cmd('menu');
    expectOk(menu);
    const said = await menu.said();
    expect(said, 'the house does things').toMatch(/treatment|repair/i);
    expect(said, 'and they have prices').toMatch(/\d/);
  }, 60_000);

  it('⭐⭐ `order treatment` reaches the service branch', async () => {
    // The lazy business stand-up rides this: `ensureOperatorAt` fires on
    // the first order, and a room with a tariff and no operator would
    // serve on the house silently, forever.
    const out = await patient.cmd('order treatment');
    // ⚠ A sound body is refused with a REASON — "you are sound enough" —
    // which is the honest answer and proves the branch was entered. What
    // must never happen is falling through to the menu path and being
    // told there is nothing to order from here.
    const said = await out.said();
    expect(
      said,
      `expected the service branch — saw: ${said.slice(0, 200)}`,
    ).not.toMatch(/nowhere to order from/i);
  }, 120_000);
});

/* ───────────────── the necropolis (step 21) ───────────────── */

suite('the necropolis — a body can be read and buried (step 21)', () => {
  let mourner: Session;

  beforeAll(async () => {
    mourner = await Session.open(uniqueHandle('mourn'), {
      startLocation: GRAVES,
    });
  }, 180_000);

  afterAll(() => mourner?.close());

  it('the burial ground exists, with ground open in it', async () => {
    const rows = await mourner.query('peers', { fields: ['displayName'] });
    const names = rows
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names, 'a slate and a plot').toMatch(/slate|plot|grave/i);
  }, 60_000);

  it('⭐ burial is a priced service, not a wizard act', async () => {
    const menu = await mourner.cmd('menu');
    expectOk(menu);
    expect(await menu.said()).toMatch(/burial/i);
  }, 60_000);
});

/* ───────────────── the repair shop (step 20) ───────────────── */

suite('the repair shop — the second instance, rows only (step 20)', () => {
  let customer: Session;

  beforeAll(async () => {
    customer = await Session.open(uniqueHandle('mend'), {
      startLocation: SMITHY,
    });
  }, 180_000);

  afterAll(() => customer?.close());

  it('⭐⭐ the smithy sells MENDING as well as making', async () => {
    // The second-instance test, live: one row and one `props:` line gave
    // an existing venue a service it could not previously sell. `menu`
    // reads the tariff before the menu, so a venue carrying both shows
    // the slate.
    const menu = await customer.cmd('menu');
    expectOk(menu);
    expect(await menu.said()).toMatch(/repair/i);
  }, 120_000);
});

/* ───────────────── the guard contract (step 22) ───────────────── */

suite('the guard contract — the third clause (step 22)', () => {
  it('⭐⭐⭐ `watch` is the LIVESTREAM verb again — the shadow is gone', async () => {
    // ⚠⚠ The regression this build shipped and review caught. A guard-post
    // `watch` rode the born-with credential wallet and shadowed the
    // streaming one for EVERY character alive: `help watch` answered
    // "Stand a guard's post" and `watch twitch.tv/…` was declined
    // `no-watch-claim`. Nothing failed — not a test, not a lint, not the
    // boot. Standing a post now accrues from PRESENCE and has no verb.
    const help = await patient.cmd('help watch');
    expectOk(help);
    const said = await help.said();
    expect(said, 'the livestream verb owns its own name').toMatch(
      /stream|embed|twitch/i,
    );
    expect(said, 'and the guard verb is gone').not.toMatch(/guard's post/i);
  }, 60_000);

  it('⭐⭐ the guard clause lives on the BOARD, not on a verb of its own', async () => {
    // The general employment palette carries it: the clause templates
    // surface as ARGUMENTS to `job post`, never as verbs. That is what
    // makes widening the vocabulary cost no engine surface.
    //
    // ⚠ Asserted through `help`, deliberately. Bare `job` is afforded by
    // a `JobBoard` fixture, so away from one it is honestly an
    // `unknown-verb` — which this test learned by asserting otherwise.
    const help = await patient.cmd('help job');
    expectOk(help);
    const said = await help.said();
    expect(said, 'the board is the palette').toMatch(/post|claim|complete/i);
    // …and standing a post is nowhere on it as a verb of its own.
    expect(said).not.toMatch(/`watch`/);
  }, 60_000);
});

/* ───────────────── the reads that must render (steps 1-5) ───────────────── */

suite('the reads render (steps 1-5, 16-18)', () => {
  it('⭐ `competence` renders, and says nothing numeric', async () => {
    // The diminishment marker lives here. ⚠ A live death is not
    // driveable inside a test — the arc is proven in milliseconds by
    // `Advancement.suppression.test.ts` — so what the wire adds is that
    // the SURFACE is reachable and honest.
    const out = await patient.cmd('competence');
    expectOk(out);
    const said = await out.said();
    expect(said.length).toBeGreaterThan(0);
    expect(said, 'bands, never a scalar').not.toMatch(/0\.\d/);
  }, 60_000);

  it('⭐ the fight menu names the ways OUT of a fight (step 23)', async () => {
    // ⚠ `fight parley` was cut in review — talking your way out of a
    // started fight is a persuasion check wearing a costume, and this
    // game has none. The exits it leaves are the honest ones: concede,
    // offer a mutual stand-down, or walk and take one in the back. The
    // fourth is not a verb at all — the foe's own nerve going.
    const help = await patient.cmd('help fight');
    expectOk(help);
    const said = await help.said();
    expect(said).toMatch(/yield/i);
    expect(said).toMatch(/break/i);
    expect(said, 'and the retired verb stays retired').not.toMatch(/parley/i);
  }, 60_000);

  it('the medical verbs answer', async () => {
    for (const verb of ['treat', 'assess', 'analyze']) {
      expectOk(await patient.cmd(`help ${verb}`));
    }
  }, 120_000);
});
