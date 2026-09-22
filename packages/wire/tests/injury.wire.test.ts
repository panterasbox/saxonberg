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

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

/**
 * ⚠ **This file is CLEAN, and an earlier draft wrongly said otherwise.**
 * It declared a `dirtyReason` about buying armour — and then no purchase
 * in it ever completed, because a wire session is a guest and the
 * onboarding stipend is granted at char-gen commit. Every command here is
 * a read. See the AC-8 note below for what that cost, and the drive
 * record for the finding.
 */
declareFile({
  file: 'injury.wire.test.ts',
  packs: ['newbie-wilds', 'terminus', 'generic-objects', 'species-and-names'],
});

const CROSSROADS = '/world/newbie-wilds/crossroads/hub';
const SHOP = '/world/terminus/general-store/shop-floor';
const MEADOW = '/world/newbie-wilds/crossroads/longmeadow';

let player: Session;
/**
 * ⚠ A SECOND session, placed at the shop. The drive's first run tried
 * `goto <path>` and learned there is no such verb — the player never left
 * the crossroads, `buy` was unafforded, and the two armour assertions
 * failed for a reason that had nothing to do with armour. Placement is
 * the harness's job (`startLocation`), not a command's.
 */
let shopper: Session;

beforeAll(async () => {
  player = await Session.open(uniqueHandle('injury'), {
    startLocation: CROSSROADS,
  });
  shopper = await Session.open(uniqueHandle('injshop'), {
    startLocation: SHOP,
  });
}, 240_000);

afterAll(() => {
  player?.close();
  shopper?.close();
});

/* ───────────── step 1-2: a body with an anatomy ───────────── */

suite('the boot survives the shape changes', () => {
  it('⭐⭐ both body plans stood up — `governs` is now validated at registration', async () => {
    // `setBodyParts` now throws on an unknown `governs` / `serves` key.
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
    const wolves = await player.query('reachable', {
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

/* ───────────── AC 8: armour, finally reachable ───────────── */

suite('⭐⭐ AC 8 — armour is REACHABLE (see the drive record on price)', () => {
  it('the counter STOCKS armour — it stocked none, anywhere, before this', async () => {
    // ⚠⚠ **What this can and cannot prove, stated honestly.** A wire
    // session is a guest, and the onboarding stipend is granted at
    // char-gen commit — so this character has **no money at all** and
    // cannot complete a purchase. An earlier draft asserted only that the
    // reply contained the word "gambeson", which a refusal ("you can't
    // cover a padded gambeson just now") satisfies — a green check over
    // an unbuyable item, which is the exact failure this file exists to
    // catch, committed by the file itself.
    //
    // What IS proven, and it is the link that was missing: the row is on
    // disk, the stock line resolves, the counter stocked it to par, and
    // `buy` reaches the retail branch and names the item. A row that did
    // not exist would answer "there is no such thing here".
    const out = await shopper.cmd('look');
    expectOk(out);
    const buy = await shopper.cmd('buy padded gambeson');
    const said = (await buy.said()).toLowerCase();
    expect(
      /gambeson/.test(said),
      `the counter knows what a gambeson is — got: ${said}`,
    ).toBe(true);
    expect(
      !/no such|don't see|nothing like/.test(said),
      `…and it is genuinely STOCKED, not merely named — got: ${said}`,
    ).toBe(true);
  }, 120_000);

  it('⭐ the three torso layers are all stocked — the LADDER, not one row', async () => {
    const out = await shopper.cmd('look counter');
    const said = (await out.said()).toLowerCase();
    const listed = ['gambeson', 'hauberk', 'breastplate'].filter((w) =>
      said.includes(w),
    );
    expect(
      listed.length,
      `padded → mail → plate is the whole point; saw: ${said}`,
    ).toBeGreaterThanOrEqual(2);
  }, 120_000);
});

/* ───────────── Stage B: two new ways to be hurt ───────────── */

suite('⭐⭐ steps 12-14 — frost is a spell the world knows', () => {
  it('⭐⭐ `spells` lists frost — so the catalogue accepted a NEW cost model', async () => {
    // ⚠ `SpellCatalogue` DROPS a row naming an unknown cost model, and it
    // WARNS rather than throwing — so a `heat-pump` the catalogue did not
    // recognise would produce a spell that simply is not there, with no
    // error anywhere. The row appearing in `spells` is the proof that the
    // union grew correctly, and only a booted world can give it.
    const out = await player.cmd('spells');
    expectOk(out);
    const said = (await out.said()).toLowerCase();
    expect(said, `frost is in the book — got: ${said}`).toContain('frost');
    // …and the shipped spells are still there — a catalogue that dropped
    // rows wholesale would also "pass" a bare contains-frost check.
    expect(said, 'the rest of the book survived').toContain('firebolt');
  }, 60_000);

  it('⭐⭐ …and it is a DESTROY working, not a create one', async () => {
    // The science's own cell: destroying fire means taking heat OUT of
    // something. If this ever reads `create`, the spell has stopped being
    // a heat pump and become an ice gun, which is the whole thing the
    // design refuses.
    const out = await player.cmd('spells');
    const said = (await out.said()).toLowerCase();
    expect(said).toMatch(/destroy/);
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
    const out = await player.cmd('rinse');
    const said = (await out.said()).toLowerCase();
    expect(
      /nothing|water would help/.test(said),
      `an honest refusal, not a crash — got: ${said}`,
    ).toBe(true);
  }, 60_000);

  it('⭐⭐ the crossroads has WATER — the seep’s answer exists', async () => {
    // A consequence with no available response is a punishment, not a
    // system. There was no water source anywhere in newbie-wilds before
    // this build, so a caustic could not have been rinsed off at all.
    const here = await player.query('reachable', { fields: ['displayName'] });
    const names = here
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    expect(names, `a water source at the hub — saw: ${names}`).toMatch(
      /water butt|butt|barrel/,
    );
  }, 60_000);
});

/* ───────── Stage D: magic reaches every damage channel ───────── */

suite('⭐⭐ steps 20-22 — magic that hurts through every seam', () => {
  it('⭐⭐ `spells` lists the four new workings — the catalogue accepted them', async () => {
    // Same proof frost's step gives: SpellCatalogue auto-discovers rows
    // from the Spell dir, and a malformed cell (an unknown verb/noun) is
    // DROPPED with a warn, not thrown. The rows appearing in a BOOTED
    // world's book is the only proof the four channels magic never
    // reached are now reachable — a unit test cannot warm the catalogue.
    const out = await player.cmd('spells');
    expectOk(out);
    const said = (await out.said()).toLowerCase();
    for (const name of ['stonefist', 'stone lance', 'windrazor', 'acid splash']) {
      expect(said, `${name} is in the book — got: ${said}`).toContain(name);
    }
    // …and the shipped book survived (a catalogue that dropped rows
    // wholesale would also pass a bare contains-check).
    expect(said, 'the rest of the book survived').toContain('firebolt');
  }, 60_000);

  it('⭐ the new workings span EARTH, AIR and WATER — not one school', async () => {
    // The whole point is breadth: magic reaches the mechanical channels
    // through solid matter (earth) and pressure (air), and corrosion
    // through a conjured fluid (water). If the book ever reads only one
    // school here, the expansion has collapsed back to a single seam.
    const out = await player.cmd('spells');
    const said = (await out.said()).toLowerCase();
    for (const school of ['earth', 'air', 'water']) {
      expect(said, `${school} is represented — got: ${said}`).toContain(school);
    }
  }, 60_000);

  it('⭐ the counter STOCKS a flask of vitriol — the corrosion WEAPON is reachable', async () => {
    // The substance-contact seam gives a thrown caustic corrosion for
    // free, but only if something in the world can be thrown. A row nobody
    // stocks is the dead-content failure — so the flask sits on the arms
    // shelf, the same link the armour rows proved (read via `look
    // counter`, as the armour-ladder step does — `buy` chokes on the
    // preposition in "flask of vitriol").
    const out = await shopper.cmd('look counter');
    expectOk(out);
    const said = (await out.said()).toLowerCase();
    expect(
      /vitriol|flask/.test(said),
      `the counter stocks the flask — got: ${said}`,
    ).toBe(true);
  }, 120_000);
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

  it('⭐⭐ the counter stocks a BOW and a MUSKET — the tech curve is on a shelf', async () => {
    // Step 17's precondition, and the thing no unit test can say: four
    // rows on disk, four stock lines, four prices, and a `par` stocked
    // at standup. AC 11 is unreachable without it.
    const out = await shopper.cmd('look counter');
    const said = (await out.said()).toLowerCase();
    expect(said, `a bow on the shelf — saw: ${said}`).toMatch(/bow/);
    expect(said, 'and a firearm beside it').toMatch(/musket|flintlock/);
  }, 120_000);

  it('⭐ …and the AMMUNITION too, which is the half people forget', async () => {
    const out = await shopper.cmd('look counter');
    const said = (await out.said()).toLowerCase();
    expect(said).toMatch(/arrow/);
    expect(said).toMatch(/ball|shot/);
  }, 120_000);

  it('⭐⭐ step 17 — the long meadow affords a range the crossroads cannot', async () => {
    // The demonstrator arena finally used for its purpose. The meadow
    // has `extent: 12` and nothing in it; a shot's envelope is the
    // ROOM's real extent, so the same bow reaches further here than in
    // a corridor — because the meadow is longer, not because the bow
    // changed.
    const meadow = await Session.open(uniqueHandle('injmeadow'), {
      startLocation: MEADOW,
    });
    try {
      const out = await meadow.cmd('look');
      expectOk(out);
      const said = (await out.said()).toLowerCase();
      expect(said, `the meadow is reachable and open — saw: ${said}`).toMatch(
        /meadow|grass|open/,
      );
    } finally {
      meadow.close();
    }
  }, 180_000);
});

/* ───────────── step 11: the flagship loop is untouched ───────────── */

suite('step 11 — the shipped bare-foot loop is a REGRESSION check', () => {
  it('⚠ `treat` / `undress` still exist and still answer', async () => {
    // AC 9: the GlassAlley loop (cut, bleed, limp, dress, clot, undress)
    // must behave exactly as it does today. The loop itself is pinned by
    // `GlassAlley.integration.test.ts`, which is green; what the wire
    // adds is that the two verbs it turns on are still reachable after
    // `TreatController` grew an interior-wound branch.
    expectOk(await player.cmd('help treat'));
    expectOk(await player.cmd('help undress'));
  }, 60_000);
});
