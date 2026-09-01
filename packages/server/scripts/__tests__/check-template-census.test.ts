/**
 * check-template-census — the pure decision: which fields of a domain
 * row are template-path references (residences wave 1, D17). The walk,
 * the retired-channel grep and the constants scan are exercised by the
 * script run in CI; what a unit test pins is the FIELD GRAMMAR — a new
 * shape (a floorplan room, an `{template, onto}` populate) must be
 * seen, and prose that merely looks like a path must not.
 */

import { describe, it, expect } from 'vitest';
import { refsOf } from '../check-template-census';

describe('refsOf — the template-path field grammar', () => {
  it('reads plain and {template, onto} populates', () => {
    const refs = refsOf({
      populates: [
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

  it('a rowless reference is exactly what the resolve step refuses', () => {
    // The clause-(b) decision in miniature: refs minus the row set.
    const rows = new Set(['/obj/_test/lane']);
    const refs = refsOf({ populates: ['/obj/_test/lane', '/obj/_test/ghost'] });
    const unresolved = refs.filter((r) => !rows.has(r.path));
    expect(unresolved).toEqual([{ field: 'populates', path: '/obj/_test/ghost' }]);
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
