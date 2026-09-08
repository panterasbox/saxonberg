/**
 * The campus farm — the ground reads three ways, refuses the two
 * improvements it does not need, and the herdbook drafts a head.
 *
 * Ported from `e2e/tests/drive-farmstead.spec.ts` (207 lines, 4
 * expects). It drove a browser and took fourteen screenshots.
 *
 * ⭐⭐ **The ground is the point.** The university's field carries an
 * AUTHORED `GroundCharacter` — a pin on the home field's own spot, which
 * says *this ground was improved*. So the readings must agree with the
 * ROW and not with the procedural layer underneath it, and the two
 * improvement verbs must REFUSE, in the words that teach why. That chain
 * — row → zone citation → hydrator → `lookupField` → the fold → four
 * separate verbs — is exactly what a unit test cannot walk.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice — and the original spec says it
 * plainly, which is what makes it a finding rather than a nuisance:**
 *
 *   *"The yard holds ONE spade, ONE scythe, ONE kit and ONE plough, they
 *   are takeable, and nothing puts them back — so a second character
 *   arriving after the first has an empty yard and cannot farm at all.
 *   That is a real fact about the shipped farm."*
 *
 * The tailor's shop has the identical problem, and there the port could
 * put the tools back because the shop is one room. Here the plough is
 * fetched from a different building, so this file states the reason
 * instead. **A teaching farm that can outfit exactly one student is the
 * finding**; it belongs to whoever owns the campus.
 */
export const DIRTY_REASON =
  'takes the yard’s only spade, scythe, soil kit and plough, and nothing ' +
  'puts them back — the next character finds an empty yard';

declareFile({
  file: 'farmstead.dirty.wire.test.ts',
  packs: ['trade-farming', 'trade-ranching', 'eternal-university'],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/eternal/campus-farm/location/yard';

let p: Session;

async function carried(): Promise<string> {
  const rows = await p.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

beforeAll(async () => {
  p = await Session.open(uniqueHandle('farm'), { startLocation: YARD });
}, 120_000);

afterAll(() => p?.close());

suite('the yard outfits you', () => {
  it('the tools are PROPS in the yard, not stock in a shop', async () => {
    /*
     * ⚠ Asserted on the INVENTORY, not on the pickup echo: "you pick up"
     * is the same sentence whether or not you already had it, and a
     * teaching farm hands you the tools rather than selling them.
     */
    for (const t of ['spade', 'scythe', 'kit', 'plough']) {
      await p.cmd(`get ${t}`);
    }
    const inv = await carried();
    expect(inv).toMatch(/spade/i);
    expect(inv).toMatch(/scythe/i);
    expect(inv).toMatch(/soil test kit|kit/i);
  }, 180_000);

  it('⚠⚠ the light check is not ceremony', async () => {
    /*
     * A room that authors no light is PITCH BLACK, and the tell is every
     * object reading "something". A farm you cannot see is not a farm.
     * ⚠ After the spade, because the spade is what AFFORDS `measure`.
     */
    expect(await p.prose('measure light')).toMatch(/: [1-9][0-9]* lux/i);
  }, 60_000);

  it('⭐ and the farm knows WHERE it is', async () => {
    // Without a zone `address:` this answers nothing — the address walk
    // is what puts the campus on the map.
    expect(await p.prose('analyze address')).toMatch(/terminus\/city\/campus/i);
  }, 60_000);
});

suite('⭐⭐ the ground reads three ways, and agrees with its own row', () => {
  it('texture is the ribbon test — no instrument, no expertise', async () => {
    expect(await p.prose('measure texture')).toMatch(/loam/i);
  }, 60_000);

  it('acidity needs the kit, and answers with an error bar', async () => {
    expect(await p.prose('measure acidity')).toMatch(/pH \d\.\d/i);
  }, 60_000);

  it('⭐ the soil card is per-viewer, and a BELIEF', async () => {
    // It is a record of YOUR sampling, not a property of the dirt.
    expect(await p.prose('analyze soil')).toMatch(/spadeful/i);
  }, 60_000);

  it('⭐⭐ the two improvements REFUSE, in the words that teach why', async () => {
    // This ground was improved already — the authored GroundCharacter.
    // Draining ground that sheds its own water, or liming sweet ground,
    // is money in a ditch, and the refusal says so.
    expect(await p.prose('ditch')).toMatch(
      /sheds its own water|already off this ground/i
    );
    expect(await p.prose('lime')).toMatch(/sweet enough|money in a ditch/i);
  }, 120_000);
});

suite('the ley and the furrow', () => {
  it('⭐⭐ hay and grazing are the SAME draw on the same grass', async () => {
    // ⚠ On day one it refuses, correctly: the ley is short and even,
    // and there is nothing on it worth a scythe yet.
    expect(await p.prose('mow')).toMatch(
      /nothing on it worth a scythe|first swathe/i
    );
  }, 60_000);

  it('⭐ a man-drawn share goes in about half as far as a beast’s', async () => {
    expect(await p.prose('plough')).toMatch(
      /traces over your shoulders|turned and clean|want a plough/i
    );
  }, 120_000);
});

suite('the herdbook — you file, you do not hold the pen', () => {
  it('the book on the byre door is readable', async () => {
    expect(await p.prose('look herdbook')).toMatch(/hide-bound|ruled columns/i);
  }, 60_000);

  it('⭐ head 3 is a deterministic function of (herdId, index)', async () => {
    // The same draft always cuts the same beast — seeded, never drawn.
    expect(await p.prose('draft 3')).toMatch(
      /cut number 3 out of|the college herd/i
    );
  }, 120_000);

  it('⭐⭐ …and it answers to what it IS', async () => {
    /*
     * The species binding folds its own `commonNames` in, so the head
     * that comes out of a CATTLE herd is a **cow**. Until it did,
     * `handle cow` answered *"that is not an animal you can work with"*
     * about the cow standing in front of you — and the row's authored
     * keywords had never worked either, because a `Creature` is not
     * `Perceptible`.
     */
    const said = await p.prose('handle cow');
    expect(said).toMatch(
      /run a hand down the spine|get a hand on it, barely|swings hard into you/i
    );
    expect(said, 'the cow must answer to being a cow').not.toMatch(
      /not an animal you can work with/i
    );
  }, 120_000);
});
