/**
 * check-template-census — the pure decision: which fields of a domain
 * row are template-path references (residences wave 1, D17). The walk,
 * the retired-channel grep and the constants scan are exercised by the
 * script run in CI; what a unit test pins is the FIELD GRAMMAR — a new
 * shape (a floorplan room, an `{template, onto}` populate) must be
 * seen, and prose that merely looks like a path must not.
 */

import { describe, it, expect } from 'vitest';
import { castRefsOf, refsOf } from '../check-template-census';

describe('refsOf — the template-path field grammar', () => {
  it('reads plain and {template, onto} props/cast', () => {
    const refs = refsOf({
      props: [
        '/stuff/thing/fixture/bed',
        { template: '/trade/hospitality/thing/shaker', onto: '/trade/hospitality/thing/well' },
      ],
    });
    expect(refs.map((r) => r.path)).toEqual([
      '/stuff/thing/fixture/bed',
      '/trade/hospitality/thing/shaker',
      '/trade/hospitality/thing/well',
    ]);
  });

  it('reads exit destinations and doors', () => {
    const refs = refsOf({
      exits: {
        south: { destination: '/obj/_test/steps', door: '/obj/_test/front-doors', bidirectional: true },
        east: { destination: '/obj/_test/lane' },
      },
    });
    expect(refs.map((r) => `${r.field}=${r.path}`)).toEqual([
      'exits.south.destination=/obj/_test/steps',
      'exits.south.door=/obj/_test/front-doors',
      'exits.east.destination=/obj/_test/lane',
    ]);
  });

  it('reads adornments, stock lines, price keys and the scalar fields', () => {
    const refs = refsOf({
      adornments: ['/obj/_test/thing/forge-floor'],
      stockLines: [{ itemTemplatePath: '/obj/_test/goods/torch', par: 4 }],
      prices: { '/obj/_test/goods/torch': 2 },
      roomTemplate: '/obj/_test/yard',
      holderPath: '/obj/_test/lot-holder',
      streetPath: '/obj/_test/lane',
    });
    expect(refs.map((r) => r.path)).toEqual([
      '/obj/_test/thing/forge-floor',
      '/obj/_test/goods/torch',
      '/obj/_test/goods/torch',
      '/obj/_test/yard',
      '/obj/_test/lot-holder',
      '/obj/_test/lane',
    ]);
  });

  it('reads floorplan room rows (the residences programme shape)', () => {
    const refs = refsOf({
      floorplan: [
        { leaf: 'bedroom', room: '/stuff/location/room/bedroom' },
        { leaf: 'hall', room: '/obj/_test/lots/hall', entry: true },
      ],
    });
    expect(refs.map((r) => r.path)).toEqual([
      '/stuff/location/room/bedroom',
      '/obj/_test/lots/hall',
    ]);
  });

  it('⭐ walks composition[].materialPath — a blend names its constituents', () => {
    // ⚠⚠ This was missing, and `bronze` was the proof: it named copper
    // alone and left 12% as nothing, so nothing checked the tin row it
    // claimed in its tags — because nothing checked composition at all.
    const refs = refsOf({
      composition: [
        { materialPath: '/stuff/idea/material/element/copper', fraction: 0.88 },
        { materialPath: '/stuff/idea/material/element/tin', fraction: 0.12 },
      ],
    });
    expect(refs).toEqual([
      { field: 'composition.materialPath', path: '/stuff/idea/material/element/copper' },
      { field: 'composition.materialPath', path: '/stuff/idea/material/element/tin' },
    ]);
  });

  it('an empty composition (a pure element) yields no references', () => {
    expect(refsOf({ composition: [] })).toEqual([]);
  });

  it('a rowless reference is exactly what the resolve step refuses', () => {
    // The clause-(b) decision in miniature: refs minus the row set.
    const rows = new Set(['/obj/_test/lane']);
    const refs = refsOf({ props: ['/obj/_test/lane', '/obj/_test/ghost'] });
    const unresolved = refs.filter((r) => !rows.has(r.path));
    expect(unresolved).toEqual([{ field: 'props', path: '/obj/_test/ghost' }]);
  });

  it('prose, non-slash strings and detail maps are never references', () => {
    expect(
      refsOf({
        shortDescription: 'a lane /with/ a slash in prose? no — no leading key',
        details: { lots: { description: '/obj/_test/never-walked' } },
        keywords: ['/not-a-field'],
      }),
    ).toEqual([]);
  });
});

/**
 * ⚠ The regression this file failed to catch. `populates:` split into
 * `props:`/`cast:` in another build; `refsOf` went on reading the retired
 * name and the census stayed green while 322 of its 462 refs stopped
 * being checked. These pin the CURRENT field names so the next rename
 * fails here rather than going quiet.
 */
describe('refsOf reads the fields content actually uses', () => {
  it('reads cast as well as props', () => {
    const refs = refsOf({ cast: ['/obj/_test/gus'] });
    expect(refs).toEqual([{ field: 'cast', path: '/obj/_test/gus' }]);
  });

  it('⭐ does NOT read the retired populates:', () => {
    expect(refsOf({ populates: ['/obj/_test/lane'] })).toEqual([]);
  });

  it('censuses the reference-Idea citations', () => {
    const refs = refsOf({
      _materialPath: '/stuff/idea/material/alloy/bronze',
      _speciesPath: '/stuff/idea/species/human',
    });
    expect(refs.map((r) => r.field).sort()).toEqual([
      '_materialPath',
      '_speciesPath',
    ]);
  });
});

/**
 * The mine's citations, added when the water build's clause (d) — the
 * meta-gate that flags a path-shaped field `refsOf` does not read —
 * caught eleven of them on the merge. ⭐ That is the gate working
 * exactly as designed on a build that had never met it.
 */
describe('refsOf reads the mining and deposit citations', () => {
  it('the deposit is references all the way down', () => {
    const refs = refsOf({
      stratigraphy: [{ toZ: -60, host: '/stuff/idea/material/rock/slate' }],
      zones: [{ toZ: -45, mineral: '/stuff/idea/material/mineral/malachite' }],
      lode: { strike: 41, gangue: '/stuff/idea/material/mineral/quartz' },
    });
    expect(refs.map((r) => r.field).sort()).toEqual([
      'lode.gangue',
      'stratigraphy.host',
      'zones.mineral',
    ]);
  });

  it('the warren names its grid, its adit and the type it clones per cell', () => {
    const refs = refsOf({
      zonePath: '/obj/_test/diggings',
      aditPath: '/obj/_test/adit',
      typeRows: { face: '/obj/_test/face', stope: '/obj/_test/stope' },
    });
    expect(refs.map((r) => r.field).sort()).toEqual([
      'aditPath',
      'typeRows.face',
      'typeRows.stope',
      'zonePath',
    ]);
  });

  it('⭐ but a claim BLOCK is not a row — it is title over ground', () => {
    // Staking mints *a title and no room*, which is the difference
    // between `stake` and `title buy`. Reading it as a citation reported
    // the mine's own claim ring as a dangling reference.
    expect(refsOf({ claimBlocks: [{ parcelExtent: '/obj/_test/claims/1' }] })).toEqual([]);
  });
});

/**
 * ⚠⚠ **The clause-(d) reader, asserted to FIRE.**
 *
 * A gate that can only be seen passing is not a gate. This one shipped
 * broken: the block was sliced with a lookahead ending in `\Z`, which
 * JS does not have, so the match failed outright on any row whose
 * `cast:` was the LAST key — and the census reported clean over rows it
 * had never read. The first case below is exactly that shape.
 */
describe('castRefsOf — the cast list, including the one at end-of-file', () => {
  it('⭐ reads a `cast:` that is the LAST key in the row (the \\Z bug)', () => {
    const row = [
      'class: /trade/mining/location/MineRoom',
      'data:',
      '  shortDescription: a drift',
      '  cast:',
      '    - /trade/mining/agent/canary',
      '    - /trade/mining/agent/pit-pony',
      '',
    ].join('\n');
    expect(castRefsOf(row)).toEqual([
      '/trade/mining/agent/canary',
      '/trade/mining/agent/pit-pony',
    ]);
  });

  it('stops at the next key, and never swallows the props list below it', () => {
    const row = [
      'data:',
      '  cast:',
      '    - /trade/mining/agent/canary',
      '  props:',
      '    - /trade/mining/thing/timber-set',
      '  shortDescription: a drift',
    ].join('\n');
    expect(castRefsOf(row)).toEqual(['/trade/mining/agent/canary']);
  });

  it('a row with no cast reads as no cast, not as an error', () => {
    expect(castRefsOf('class: /stuff/thing/Prop\ndata:\n  props:\n    - /a/b\n')).toEqual([]);
  });
});
