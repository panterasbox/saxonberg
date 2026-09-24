/**
 * Ground — ⭐⭐ **the drive**, and the first four steps of it are the four
 * confirmed failures that opened the cycle.
 *
 * Driven on master before any of this was written, in the room a brand-new
 * character opens their eyes in:
 *
 *     sit                 → empty-result[target]
 *     lie / kneel         → empty-result[target]
 *     look floor / ground → empty-result[target]
 *     sit on the ground   → command-rejected: shape-fall-through
 *     stand               → ok
 *
 * Every one of those must now be a success, and the reason they were
 * failures is worth carrying into this file because it is not the obvious
 * one. *No room has a floor* is true and is half of it. The other half:
 * a view's `default:` is applied **at assembly**, so the word `ground` was
 * reaching MQL all along and matching nothing — because the scope walk pools
 * a thing's own `getKeywords()` and `pushDetails` gives a detail the pool
 * `[<its id>]`, never its authored keyword list. So `default-floor`'s
 * `details.floor.keywords: [ground]` was dead text, and **attaching that row
 * to all 139 Locations would have fixed `look floor` and left `sit`
 * broken.** Hence the keyword union on the class, and hence this file
 * driving the bare verbs rather than only the reads.
 *
 * ⚠ What a socket cannot settle, and where it lives instead:
 *
 *  - steps 22–23, the invented material, need AUTHORING —
 *    `lib/ground/__tests__/InventedMaterial.test.ts`;
 *  - step 24, the census, is `pnpm lint:ground` and its `--report`;
 *  - steps 16–17, the mine and the field behaving exactly as before, are
 *    `metal-chain.dirty.wire.test.ts` and `farming.dirty.wire.test.ts`
 *    passing unchanged — a regression claim is better made by the suites
 *    that already assert those flows than by re-asserting them here;
 *  - step 8's logout/login round-trip is two sessions on one boot, which IS
 *    settleable and is here.
 *
 * ⭐ **Clean, and that is a finding** (the `pets.wire.test.ts` precedent).
 * Every act here is a posture, a read or a refusal, so the world after a run
 * is the world before it. ⚠ Step 14 — *spill a liquid in a room that had no
 * floor before; it pools, and `look floor` says so* — is the one step that
 * would dirty it, and it is **not here**: pouring over a socket needs a
 * vessel with liquid in it reachable from a known start location, which in
 * practice means a funded session and the hospitality flow. The seam itself
 * (`BulkableLogic.floorSurfaceNear` finding the room's floor through
 * `getFloor()`, on a room that has one only because this build gave it one)
 * is asserted in `lib/stuff/__tests__/Location.floor.test.ts`. The live pour
 * is offered to the bulk slate as a wire step needing a funded session.
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

declareFile({
  file: 'ground.wire.test.ts',
  packs: [
    'saxonberg-lounge',
    'terminus',
    'hinkley-hills',
    'eternal-university',
    'world-seed',
    'hearthworks',
    'rejection',
    'trade-forestry',
    'generic-objects',
    'ground',
  ],
});

// The rooms the drive names. Each is a DIFFERENT way a floor is decided.
const CROSSING = '/world/terminus/university-avenue/location/crossing';   // rung 1, a row with a detail
const SQUARE = '/world/terminus/market/square';                            // rung 2, three words
const YARD = '/world/terminus/goods-yards/yard';                           // rung 1, the gutter
const LANE = '/world/terminus/hinkley-hills/location/lane';                // rung 2, graded dirt
const HEATH = '/world/moor/stormy-heath';                                  // an authored peat floor
const SMITHY = '/world/terminus/hearthworks/location/smithy';              // the forge floor
const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';      // an interior, minted
const CLEARING = '/world/terminus/rejection/hanging-wood/oak-clearing';    // a Wood, on grade
const HALL = '/world/terminus/terminal/location/hall';                     // a big interior, unauthored

/**
 * Every session the file opens, closed together.
 *
 * ⚠ Held in named variables below rather than searched for by handle:
 * `uniqueHandle('ground-street')` returns `wire-ground-street-…`, so a
 * `startsWith('ground-street')` lookup silently found NOTHING and five
 * assertions failed as `Cannot read properties of undefined` — a harness
 * bug wearing the costume of a product failure. Found on the first drive run.
 */
const open: Session[] = [];

async function at(where: string | undefined, tag: string): Promise<Session> {
  const s = await Session.open(
    uniqueHandle(`ground-${tag}`),
    where ? { startLocation: where } : {},
  );
  open.push(s);
  return s;
}

/** What `look <what>` says, as plain prose. */
async function look(s: Session, what: string): Promise<string> {
  return plain(await (await s.cmd(`look ${what}`)).said());
}

const NOT_FOUND = /don't see|can't see|don't understand|nothing (here|like that)/i;

let newcomer: Session;
let street: Session;
let moor: Session;
let wood: Session;
let yard: Session;

beforeAll(async () => {
  // ⭐ Step 1 — a brand-new character, and DELIBERATELY no `startLocation`:
  // the whole defect lived in the default landing, which is a
  // warren-MINTED Lounge room. A room nobody authored could never have
  // been fixed by editing a row.
  newcomer = await at(undefined, 'new');
}, 180_000);

afterAll(() => {
  for (const s of open) s?.close();
});

suite('1–3 · the four confirmed failures — a new character can sit down', () => {
  it('⭐⭐ `sit` sits you down on the ground', async () => {
    const r = await newcomer.cmd('sit');
    expectOk(r);
    const said = plain(await r.said());
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/sit/i);
  });

  it('`stand` gets you up again', async () => {
    expectOk(await newcomer.cmd('stand'));
  });

  it('`lie` lies you down, and `stand` recovers', async () => {
    expectOk(await newcomer.cmd('lie'));
    expectOk(await newcomer.cmd('stand'));
  });

  it('`kneel` kneels, and `stand` recovers', async () => {
    expectOk(await newcomer.cmd('kneel'));
    expectOk(await newcomer.cmd('stand'));
  });
});

suite('4 · the floor answers, and says what it is made of', () => {
  it('⭐ `look floor` answers', async () => {
    const said = await look(newcomer, 'floor');
    expect(said).not.toMatch(NOT_FOUND);
  });

  it('⭐ `look ground` answers too — the word the verbs default to', async () => {
    const said = await look(newcomer, 'ground');
    expect(said).not.toMatch(NOT_FOUND);
  });

  it('⭐⭐ and the answer names the MATERIAL, in words', async () => {
    // The derived sentence the augmenter appends. Boards indoors: *boards*
    // is the census's most-claimed material by a wide margin, so the plain
    // default is a board floor.
    const said = await look(newcomer, 'floor');
    expect(said).toMatch(/\bit is\b.*\b(oak|boards|laid)\b/i);
  });
});

suite('5 · the form a person actually types', () => {
  it('⭐⭐ `sit on the ground` — the binder fix', async () => {
    // On master this was `command-rejected: shape-fall-through`: with no
    // `prepositions:` the binder consumed `on` AS the target and the
    // leftover word tripped "too many arguments".
    const r = await newcomer.cmd('sit on the ground');
    expectOk(r);
    await newcomer.cmd('stand');
  });

  it('…and `lie on the ground` / `kneel on the ground` too', async () => {
    expectOk(await newcomer.cmd('lie on the ground'));
    expectOk(await newcomer.cmd('stand'));
    expectOk(await newcomer.cmd('kneel on the ground'));
    expectOk(await newcomer.cmd('stand'));
  });
});

suite('6–7, 12 · three more rooms, and none of them reads as earth', () => {
  it('a street: you can sit on it, and it reads as paving', async () => {
    street = await at(CROSSING, 'street');
    const s = street;
    expectOk(await s.cmd('sit'));
    const said = await look(s, 'floor');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/granite|paving|flags/i);
  });

  it('⭐ the dorm room: sittable, and a BUILT floor rather than earth', async () => {
    const s = await at(DORM, 'dorm');
    expectOk(await s.cmd('sit'));
    const said = await look(s, 'floor');
    expect(said).not.toMatch(NOT_FOUND);
    // Step 7 / step 12: an interior must never read as whatever is under
    // the building. `onGrade` derives false indoors at datum, which is what
    // keeps the ladder off rung 3 entirely.
    expect(said).not.toMatch(/\bearth\b|\bloam\b|\bmire\b/i);
  });

  it('a big unauthored interior: sittable, and reads as built', async () => {
    const s = await at(HALL, 'hall');
    expectOk(await s.cmd('sit'));
    expect(await look(s, 'floor')).not.toMatch(NOT_FOUND);
  });
});

suite('8 · logout and back in — the same floor, not a second one', () => {
  it('⭐ the dorm has exactly ONE floor across a session boundary', async () => {
    const first = await at(DORM, 'rt1');
    const before = await look(first, 'floor');
    expect(before).not.toMatch(NOT_FOUND);
    first.close();

    const again = await at(DORM, 'rt2');
    const after = await look(again, 'floor');
    // ⚠ The failure this guards: `ensureFloor` running twice, or
    // `applyAdornments` re-adding rather than rebuilding, would leave the
    // room with two floors — and the tell is an ambiguity prompt or a
    // doubled line, not an error.
    expect(after).toBe(before);
    expect(after).not.toMatch(/which (floor|one)\?/i);
  });
});

suite('10 · the moor: the AUTHOR’s floor, not a derived guess', () => {
  it('⭐ reads as peat, and as the row wrote it', async () => {
    moor = await at(HEATH, 'moor');
    const s = moor;
    const said = await look(s, 'ground');
    expect(said).not.toMatch(NOT_FOUND);
    // The authored prose survives (rung 1 wins), and the derived sentence
    // names the material the row authored.
    expect(said).toMatch(/peat/i);
    // ⚠ Its KIND is the one thing in the game that changes with the
    // weather: earth in a dry spell, mire once the storm has filled it.
    expect(said).toMatch(/bare earth|waterlogged to mire/i);
  });

  it('…and you can sit on it', async () => {
    expectOk(await moor.cmd('sit'));
    await moor.cmd('stand');
  });
});

suite('11 · the forge floor is still the forge floor', () => {
  it('⭐ it reads as dressed stone — and is now sittable, which it was not', async () => {
    const s = await at(SMITHY, 'forge');
    const said = await look(s, 'floor');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/granite|stone|paving/i);
    // ⚠ `forge-floor` authored NO `staticSlots`: it was the one floor in
    // the game you could pour molten iron onto and not sit down on.
    expectOk(await s.cmd('sit'));
    await s.cmd('stand');
  });
});

suite('15 · the floor is a thing commands can reach', () => {
  it('`search floor` reaches it', async () => {
    const r = await newcomer.cmd('search floor');
    const said = plain(await r.said());
    expect(said).not.toMatch(NOT_FOUND);
  });

  it('⭐ `look at the ground` — with the article and the preposition', async () => {
    const said = plain(await (await newcomer.cmd('look at the ground')).said());
    expect(said).not.toMatch(NOT_FOUND);
  });
});

suite('18–19 · outdoors, over ground nobody described', () => {
  it('⭐ a WOOD answers what its ground is like — where only a field could', async () => {
    // AC 14: before this build, only a field could say anything about the
    // dirt it stood on, because the model was farming's. A wood answers now.
    //
    // ⚠⚠ This step read *"It is oak, laid as boards"* — the INDOOR default —
    // on the first drive, and chasing it is what found the real bug: the
    // biome roster was never warmed, so `getBiome()` answered null for every
    // room in the world, `isSkyExposed` answered its documented
    // false-when-nothing-resolves, and the ladder never reached rung 3. With
    // `BiomeCatalogue` standing the roster up, a wood reads its own ground.
    //
    // ⭐ So the assertion is the strong one: **earth**, off the ground pack's
    // procedural character, seeded from the address. Not *"it answers"*.
    wood = await at(CLEARING, 'wood');
    const said = await look(wood, 'ground');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/loam|clay|sand/i);
    expect(said).toMatch(/bare earth|loose underfoot|waterlogged to mire/i);
  });

  it('…and it is sittable, like any other ground', async () => {
    expectOk(await wood.cmd('sit'));
    await wood.cmd('stand');
  });
});

suite('20 · ⭐⭐ THE ROAD WALK — four roads, and two of them agree', () => {
  it('the university crossing reads as its own prose', async () => {
    const said = await look(street, 'floor');
    expect(said).toMatch(/granite/i);
    expect(said).toMatch(/set as paving/i);
  });

  it('the market square reads as cobbles — from three words on the room', async () => {
    const s = await at(SQUARE, 'square');
    const said = await look(s, 'floor');
    expect(said).toMatch(/granite/i);
    expect(said).toMatch(/set as paving/i);
  });

  it('the goods yards read the same as the square, and nobody chose it', async () => {
    yard = await at(YARD, 'yard');
    const said = await look(yard, 'floor');
    expect(said).toMatch(/granite/i);
    expect(said).toMatch(/set as paving/i);
  });

  it("⭐ Hinkley's lane is a MADE road of dirt, and reads differently", async () => {
    const s = await at(LANE, 'lane');
    const said = await look(s, 'floor');
    expect(said).toMatch(/loam/i);
    expect(said).toMatch(/beaten flat/i);
  });
});

suite('21 · the wear and the gutter are details OF THE FLOOR', () => {
  it('⭐ `look paving` in the crossing answers the worn diagonal track', async () => {
    const said = await look(street, 'track');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/diagonal|worn|pale/i);
  });

  it('⭐ `look gutter` in the yard still binds, now that the floor owns it', async () => {
    // It MOVED from the room's `details:` to the paving row's. A room's
    // fixtures are in the `reachable` scope, so nothing about targeting it
    // changed — which is the claim.
    const said = await look(yard, 'gutter');
    expect(said).not.toMatch(NOT_FOUND);
    expect(said).toMatch(/channel|water/i);
  });
});

suite('13 · a place that is not standable has no floor, and says so', () => {
  it('⚠ the void refuses a seat rather than offering earth', async () => {
    // The `noDefaultFloor` opt-out, live. It was documented in three places
    // for two builds while NO CODE READ IT; the void row uses it now, and
    // mid-air and mid-water will.
    const s = await at('/platform/location/void', 'void');
    const r = await s.cmd('sit');
    // Either nothing to sit on, or a refusal — never a floor made of earth.
    const said = plain(await r.said());
    if (!said.match(NOT_FOUND)) expectRefused(r);
    expect(await look(s, 'floor')).toMatch(NOT_FOUND);
  });
});
