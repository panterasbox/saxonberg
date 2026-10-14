/**
 * The growth rule — ⭐⭐ the whole knowledge model, and the reason a map
 * can be WRONG.
 *
 * A new observation identical in `(kind, place, dir, to, channel)` to
 * the latest claim for that key bumps its `lastSeen`. A differing one is
 * APPENDED. Nothing is ever removed and nothing is ever corrected.
 *
 * That is what lets the world change under a map without the map
 * quietly agreeing: wall up an exit somebody has walked and their map
 * still shows it; when they next look, the new observation lands beside
 * the old one and both render. A merge would pick a winner and hide
 * that it did, which turns a knowledge model back into a truth model.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationApi } from '../../../../api/navigation';
import { DocumentApi } from '../../../../api/document';
import { StuffApi } from '../../../../api/stuff';
import type { MapClaim, MapDocument } from '../../../../lib/location/MapClaim';

const VIEWER = '/platform/agent/Avatar/mapper';
const LOCALITY = 'test/mapville';
const HALL = '/test/map/zone/hall#a/one';

/** The one map document, as the stubbed store holds it. */
let saved: MapDocument | null;

function claim(over: Partial<MapClaim> = {}): MapClaim {
  return {
    kind: 'place',
    place: HALL,
    channel: 'seen',
    firstSeen: 100,
    lastSeen: 100,
    recordedBy: VIEWER,
    ...over,
  };
}

beforeEach(() => {
  StuffApi.clearAll();
  saved = null;
  vi.spyOn(DocumentApi, 'saveMap').mockImplementation((async (
    _owner: string,
    _locality: string,
    data: Record<string, unknown>,
  ) => {
    saved = data as unknown as MapDocument;
  }) as never);
  vi.spyOn(DocumentApi, 'readMaps').mockImplementation((async () =>
    saved
      ? [{ path: `/home/mapper/map/${LOCALITY}`, data: saved }]
      : []) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the first observation', () => {
  it('writes a claim', async () => {
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [claim()]);
    expect(saved?.locality).toBe(LOCALITY);
    expect(saved?.claims).toHaveLength(1);
    expect(saved?.claims[0]!.place).toBe(HALL);
  });

  it('⚠ a place with no handle is never offered one — the caller drops it', async () => {
    // The null-handle rule lives on the writer (`Avatar`), which does
    // not call here at all for a handle-less place. What this layer
    // guarantees is the degenerate guard: nothing to record, nothing
    // written.
    await NavigationApi.recordPlace(VIEWER, LOCALITY, []);
    expect(saved).toBeNull();
  });

  it('records nothing without a viewer key or a locality', async () => {
    await NavigationApi.recordPlace('', LOCALITY, [claim()]);
    await NavigationApi.recordPlace(VIEWER, '', [claim()]);
    expect(saved).toBeNull();
  });
});

describe('⭐⭐ the growth rule', () => {
  it('an IDENTICAL observation bumps lastSeen and appends nothing', async () => {
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [claim()]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({ firstSeen: 500, lastSeen: 500 }),
    ]);
    expect(saved?.claims).toHaveLength(1);
    expect(saved?.claims[0]!.firstSeen).toBe(100); // when you FIRST saw it
    expect(saved?.claims[0]!.lastSeen).toBe(500); // when you last did
  });

  it('⭐⭐ a DIFFERING observation is APPENDED — the old claim survives', async () => {
    // You walked east. Somebody walled it. You look again and see none.
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({ kind: 'edge', dir: 'east', toLabel: '/test/map/zone/yard' }),
    ]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({
        kind: 'edge',
        dir: 'east',
        toLabel: null,
        firstSeen: 900,
        lastSeen: 900,
      }),
    ]);
    expect(saved?.claims).toHaveLength(2);
    // ⭐ Both are there, with their dates. Nothing picked a winner.
    expect(saved?.claims.map((c) => c.lastSeen)).toEqual([100, 900]);
  });

  it('⚠⚠ RESIDENCY is not a claim — a resolved `to` does not duplicate the edge', async () => {
    /*
     * The defect a browser drive found, and nothing else could: the key
     * held `to` as well as `toLabel`. `to` is the far side's durable
     * handle *if it happened to be resident when the observation was
     * taken*, so perceiving a place cold (`to: null`) and then walking
     * the same edge (`to` resolved) wrote TWO claims, and the live map
     * rendered `north → crossing` twice, both "recorded just now".
     *
     * ⚠ And unbounded: residency evicts the cold tail, so a corridor
     * walked across a long session appended a claim per flip.
     */
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({
        kind: 'edge',
        dir: 'north',
        to: null,
        toLabel: '/test/map/zone/crossing',
      }),
    ]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({
        kind: 'edge',
        dir: 'north',
        to: '/test/map/zone/crossing',
        toLabel: '/test/map/zone/crossing',
        firstSeen: 700,
        lastSeen: 700,
      }),
    ]);
    expect(saved?.claims).toHaveLength(1);
    expect(saved?.claims[0]!.firstSeen).toBe(100);
    expect(saved?.claims[0]!.lastSeen).toBe(700);
  });

  it('⭐ and the far side CHANGING still appends — the label is the key', async () => {
    // The case that put `toLabel` in the key in the first place, and it
    // must survive dropping `to`: east→yard then east→cellar is a real
    // disagreement about the world and both claims stand.
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({ kind: 'edge', dir: 'east', toLabel: '/test/map/zone/yard' }),
    ]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({
        kind: 'edge',
        dir: 'east',
        toLabel: '/test/map/zone/cellar',
        firstSeen: 800,
        lastSeen: 800,
      }),
    ]);
    expect(saved?.claims).toHaveLength(2);
    expect(saved?.claims.map((c) => c.toLabel)).toEqual([
      '/test/map/zone/yard',
      '/test/map/zone/cellar',
    ]);
  });

  it('⭐ the CHANNEL is part of the key — provenance is not collapsible', async () => {
    // "You saw it from the doorway" and "a board said so" are two
    // different claims about the world, and both stand.
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({ channel: 'seen' }),
    ]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({ channel: 'published', firstSeen: 200, lastSeen: 200 }),
    ]);
    expect(saved?.claims).toHaveLength(2);
    expect(saved?.claims.map((c) => c.channel).sort()).toEqual([
      'published',
      'seen',
    ]);
  });

  it('⭐ nothing changed ⇒ NO DOCUMENT WRITE', async () => {
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [claim()]);
    const writes = vi.mocked(DocumentApi.saveMap).mock.calls.length;
    // The same observation again, at the same moment.
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [claim()]);
    expect(vi.mocked(DocumentApi.saveMap).mock.calls.length).toBe(writes);
  });

  it('a later observation of a DIFFERENT place appends', async () => {
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [claim()]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [
      claim({ place: '/test/map/zone/hall#a/two', lastSeen: 300 }),
    ]);
    expect(saved?.claims).toHaveLength(2);
  });

  it('⚠ nothing is ever REMOVED', async () => {
    for (const n of [100, 200, 300]) {
      await NavigationApi.recordPlace(VIEWER, LOCALITY, [
        claim({ kind: 'edge', dir: 'east', toLabel: `/x/${n}`, lastSeen: n, firstSeen: n }),
      ]);
    }
    expect(saved?.claims).toHaveLength(3);
  });
});

describe('the read', () => {
  it('returns the document, claims and all', async () => {
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [claim()]);
    const docs = await NavigationApi.readMap(VIEWER, LOCALITY);
    expect(docs).toHaveLength(1);
    expect(docs[0]!.locality).toBe(LOCALITY);
    expect(docs[0]!.claims).toHaveLength(1);
  });

  it('a locality with no map reads as nothing', async () => {
    expect(await NavigationApi.readMap(VIEWER, 'test/elsewhere')).toEqual([]);
  });

  it('tolerates a malformed document rather than throwing', async () => {
    vi.mocked(DocumentApi.readMaps).mockResolvedValue([
      { path: '/home/mapper/map/x', data: { nonsense: true } },
    ] as never);
    const docs = await NavigationApi.readMap(VIEWER, 'x');
    expect(docs[0]!.locality).toBe('');
    expect(docs[0]!.claims).toEqual([]);
  });
});

describe('⭐ charted and told — each with a writer (maritime D9)', () => {
  const BAND = '/test/sea/the-westerlies';

  it('a chart read twice bumps; a chart that draws the band elsewhere APPENDS', async () => {
    const right = claim({ kind: 'band', place: BAND, channel: 'charted', where: 'from the bar to the rock' });
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [right]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [{ ...right, lastSeen: 200 }]);
    expect(saved?.claims).toHaveLength(1);
    expect(saved?.claims[0]!.lastSeen).toBe(200);
    const wrong = { ...right, where: 'ten miles south of the bar', lastSeen: 300 };
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [wrong]);
    expect(saved?.claims.map((c) => c.where)).toEqual([
      'from the bar to the rock',
      'ten miles south of the bar',
    ]);
  });

  it('two pilots telling the same thing are two sources', async () => {
    const told = claim({ kind: 'band', place: BAND, channel: 'told', toldBy: '/test/pilot/a' });
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [told]);
    await NavigationApi.recordPlace(VIEWER, LOCALITY, [{ ...told, toldBy: '/test/pilot/b' }]);
    expect(saved?.claims.map((c) => c.toldBy)).toEqual(['/test/pilot/a', '/test/pilot/b']);
  });
});
