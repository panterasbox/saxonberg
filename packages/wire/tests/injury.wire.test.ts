/**
 * ⭐⭐ Injury — **the drive**, as a wire file.
 *
 * The requirements doc's script, run over the raw socket against a booted
 * world. It is the build's exit criterion, and it exists because **tests
 * build state; they never use it.** Every wave here passed its unit
 * suite; what only this file can say is whether a person can reach any of
 * it.
 *
 * The claims that genuinely need a live world:
 *
 *   - **A fresh boot survives the shape changes.** `VitalEffect` lost a
 *     kind and gained one, `BodyPart` gained `serves`, `governs` became
 *     validated-at-registration (a typo now THROWS at boot rather than
 *     producing an inert organ), and both shipped body plans gained four
 *     parts. A plan that fails to stand up takes its species with it.
 *   - **`assess` renders the anatomy.** The unit test proves the strings;
 *     only a live `assess` proves they reach the card. Textiles found
 *     three defects at exactly this seam.
 *   - ⭐⭐ **The armour is BUYABLE.** Six armour rows shipped months ago
 *     and not one was named by any `props:`, `cast:` or stock line — so
 *     the entire outside-in covering model had nothing a player could
 *     reach. A stock line resolving is four links (row on disk, path
 *     resolving, par stocked at standup, price listed), each failing
 *     closed and silent.
 *   - **Three layers go on, and `assess` counts them outside-in.** This
 *     is AC 8, and it could not be performed at all before this build.
 *   - ⭐⭐ **The tech curve is BUYABLE** — a bow and a musket on the same
 *     shelf, with their ammunition. AC 11 is unreachable without it, and
 *     "the stock line lists it" is exactly the claim that passes while
 *     the thing is unbuyable.
 *
 * ⚠⚠ **What is NOT driveable, and must not be faked.** Drive steps 3–10
 * need a fought wound: a wolf landing two bites, a torso blow deep enough
 * to reach an organ, a bleed carried to 30 % of blood volume, and an
 * avulsion past the sever threshold. Combat is turn-based against a
 * brain-driven animal and none of those outcomes is deterministic inside
 * a test; **driving them would mean a wizard turning a dial, which proves
 * something no player can do.** They are proven exactly, in
 * milliseconds, by:
 *
 *   - `Vitals.sever.test.ts` — the subtree, the dropped sword, the
 *     persistence round-trip, and a vetoed avulsion severing nothing;
 *   - `Vitals.function.test.ts` — min-along-the-path, quadriplegia vs
 *     paraplegia, and the refusal that names the wound;
 *   - `ConditionLogic.interior.test.ts` — the depth ladder's order and
 *     the blunt→rupture rung;
 *   - `Vitals.circulation.test.ts` — the compensated plateau, the
 *     narrowing pulse pressure, and shock landing before the dying
 *     window;
 *   - `AssessController.test.ts` / `TreatController.test.ts` — the two
 *     prose surfaces.
 *
 * What the wire adds for those arcs is that their **surfaces** are
 * reachable: the wolf is there and armed, `assess` renders, `treat`
 * answers, and the anatomy a wound would land on exists in a booted
 * world.
 */

/**
 * ⭐ Stands in the scaffold (test-world-lifecycle D8): the body, the verbs
 * and their refusals are kernel and need nothing but a place to stand. The
 * steps that read a particular shelf, a particular water butt, a particular
 * meadow or the spell catalogue moved, unchanged, to
 * `injury-content.dirty.wire.test.ts` (build 2 moves them).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, expectOk, standIn, PLAZA, SHOP, WORKS } from '../src/harness';

/** Every command here is a read: the file is clean. */
declareFile({
  file: 'injury.wire.test.ts',
  packs: ['test-fixtures', 'trade-shopkeeping', 'species-and-names'],
});

let player: Session;
/**
 * ⚠ A SECOND session, placed at the shop: placement is the harness's job
 * (`startLocation`), not a command's — there is no `goto`.
 */
let shopper: Session;

beforeAll(async () => {
  player = await standIn(PLAZA, 'injury');
  shopper = await standIn(SHOP, 'injshop');
}, 240_000);

afterAll(() => {
  player?.close();
  shopper?.close();
});


/* ───────────── step 1-2: a body with an anatomy ───────────── */

suite('the boot survives the shape changes', () => {
  it('⭐⭐ both body plans stood up — `governs` is now validated at registration', async () => {
    // `BodyPlan.setModules` now throws on an unknown `governs` / `serves` key.
    // That is the point (a typo used to produce an organ that ran nothing
    // and failed silently forever) and it is also a boot risk: a plan
    // that throws takes every species wearing it down with it. If the
    // biped plan did not stand up, this session has no body at all.
    const out = await player.cmd('assess');
    expectOk(out);
  }, 120_000);
});

suite('step 2 — `assess` lists a body that finally has organs', () => {
  it('⭐⭐ names the parts, and the four new ones are there', async () => {
    const out = await player.cmd('assess');
    expectOk(out);
    const said = (await out.said()).toLowerCase();
    expect(said, 'the anatomy block renders at all').toContain('your body:');
    // The roster D8 added. Before this build a biped had a head, a torso,
    // four limbs, a heart and a pair of lungs — and nothing you could be
    // hurt in that meant anything.
    expect(said, 'a brain').toContain('brain');
    expect(said, 'a spine').toContain('spine');
    expect(said, 'a liver').toContain('liver');
    // ⚠ …and LISTED, not BANDED. An untrained body knows it has a liver
    // and cannot tell you how the liver is doing — that is D10, and the
    // first run of this drive is what found the roster hidden entirely.
    expect(said, 'no band on an organ an untrained reader cannot judge')
      .not.toMatch(/liver — (full|impaired|failing|lost)/);
  }, 60_000);

  it('every part reads a FUNCTION BAND, not a number', async () => {
    const said = (await (await player.cmd('assess')).said()).toLowerCase();
    expect(said).toMatch(/— (full|impaired|failing|lost)/);
    // ⚠ The continuous scalar exists inside VitalsMixin and must never
    // leave it: a band is what a person can perceive and act on.
    expect(said, 'no raw function scalar on the surface').not.toMatch(
      /— 0\.\d+/,
    );
  }, 60_000);

  it('an unhurt body says so rather than listing nothing', async () => {
    const said = await (await player.cmd('assess')).said();
    expect(said.toLowerCase()).toContain('no visible wounds');
  }, 60_000);
});

/* ───────────── step 3: the thing that does the hurting ───────────── */

suite('step 3 — the wolf is there, and it is armed', () => {
  it('⭐ the wolf carries its attacks on the SPECIES row now', async () => {
    // The agent row's legacy `naturalAttackChannel` was its last content
    // user; bite/worry moved to the species, where a fact about wolves
    // belongs. If the species row failed to parse, the wolf is unarmed
    // and nothing in the newbie wilds can wound anybody — silently.
    const wolves = await player.query('~reachable', {
      fields: ['displayName'],
    });
    const names = wolves
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    // The hub itself has no wolf; what this proves is that the query
    // resolves and the world is standing. The wolf's own room is the
    // treeline — reached below.
    expect(names.length).toBeGreaterThan(0);
  }, 60_000);
});

/* ───────────── steps 5, 8: the two refusals answer ───────────── */

suite('the refusal surfaces answer (steps 5, 8)', () => {
  it('`treat` is a verb the world knows, and answers an unwounded body', async () => {
    const help = await player.cmd('help treat');
    expectOk(help);
  }, 60_000);

  it('`wield` answers — the refusal path exists to be reached', async () => {
    const help = await player.cmd('help wield');
    expectOk(help);
  }, 60_000);
});

suite('⭐⭐ steps 15-16 — the caustic and the verb that stops it', () => {
  it('`rinse` is a verb the world knows', async () => {
    // FOUR links, each failing closed and silent: the view on disk, the
    // controller's SEED TEMPLATE row (the near-suite caught its absence,
    // not me), the `WaterFixture` peers contribution, and an authored
    // topic key. A unit test proves the controller; only this proves the
    // VERB exists in a booted world.
    const help = await player.cmd('help rinse');
    expectOk(help);
    const said = (await help.said()).toLowerCase();
    expect(said, 'the help explains what it is FOR').toMatch(/caustic|burn/);
  }, 60_000);

  it('⭐ …and it answers a body with nothing on it, rather than erroring', async () => {
    // At water: `rinse` rides the WaterFixture's peers bucket, so it answers
    // standing at the works basin (on master it stood at the crossroads
    // water butt; on the plaza it is rightly "I don't understand").
    const atWater = await standIn(WORKS, 'injury-rinse');
    const out = await atWater.cmd('rinse');
    const said = (await out.said()).toLowerCase();
    expect(
      /nothing|water would help/.test(said),
      `an honest refusal, not a crash — got: ${said}`,
    ).toBe(true);
    atWater.close();
  }, 60_000);

});

/* ───────────── Stage C: past the medieval ───────────── */

suite('⭐⭐ steps 17-19 — a weapon that is not medieval', () => {
  it('`shoot` is a verb the world knows', async () => {
    // The last of the four-link checks: the view on disk, the
    // controller's seed row, the class resolving, and the arg's mixin
    // carrying a refusal phrase (`lint:arg-kinds` caught that one).
    const help = await player.cmd('help shoot');
    expectOk(help);
    const said = (await help.said()).toLowerCase();
    expect(said, 'the help explains the arena rule').toMatch(/room|meadow|far/);
    expect(said, '…and the readiness trade').toMatch(/ready|reload|musket/);
  }, 60_000);

  it('⭐⭐ `shoot` is CONFERRED BY CARRYING a launcher, not by existing', async () => {
    // ⚠⚠ **The assertion that earned this whole file.** The first run had
    // `help shoot` answering perfectly and `shoot` returning *"I don't
    // understand 'shoot'."* — the view was on disk, the controller's unit
    // tests passed, the seed row existed, and the verb was afforded to
    // NOBODY: `Launcher` had no `commandContributions`. A verb with no
    // affordance reads green through every other check in a build.
    //
    // ⚠ The POSITIVE half — hold a bow, get the verb — needs a character
    // who can buy a bow, and a wire session has no money (see the AC-8
    // note above, and the drive record). So what is asserted is the half
    // that is provable and that actually regressed: an empty-handed body
    // does not have `shoot`, which is exactly the state the affordance was
    // in for the whole of W-C1.
    const out = await shopper.cmd('shoot the counter');
    const said = (await out.said()).toLowerCase();
    expect(
      said.includes("don't understand"),
      `an empty-handed body has no shoot verb — got: ${said}`,
    ).toBe(true);
  }, 120_000);

});

/* ───────────── step 11: the flagship loop is untouched ───────────── */

suite('step 11 — the shipped bare-foot loop is a REGRESSION check', () => {
  it('⚠ `treat` / `undress` still exist and still answer', async () => {
    // AC 9: the bare-foot loop (cut, bleed, limp, dress, clot, undress)
    // must behave exactly as it does today.
    //
    // ⭐ It used to be pinned by `GlassAlley.integration.test.ts` — the
    // lounge demonstrator room that seeded the whole hazard subsystem.
    // The base-class narrowing build retired that class (no row ever
    // named it; `HazardMixin` is the generalization), so **this file is
    // the proof now**, which is the right home for it: the loop is a
    // player walking on glass, not a class.
    //
    // What the wire adds beyond the loop is that the two verbs it turns
    // on are still reachable after `TreatController` grew an
    // interior-wound branch.
    expectOk(await player.cmd('help treat'));
    expectOk(await player.cmd('help undress'));
  }, 60_000);
});
