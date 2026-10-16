/**
 * check-shopfronts — the gate FIRES on a counter its house does not list,
 * and stays quiet when the house lists it.
 */

import { describe, it, expect } from 'vitest';
import { checkShopfronts } from '../check-shopfronts';
import type { TemplateRow } from '../pack-roots';

function row(path: string, raw: Record<string, unknown>): [string, TemplateRow] {
  return [path, { path, file: `/content/x/content${path}.yaml`, pack: 'x', raw }];
}

const counter = row('/x/thing/yard', {
  class: '/trade/shopkeeping/thing/Stock',
  data: { businessPath: '/x/idea/house' },
});

describe('check-shopfronts', () => {
  it('quiet when the house lists the counter', () => {
    const rows = new Map([
      counter,
      row('/x/idea/house', {
        class: '/platform/idea/Business',
        data: { operatingLocations: ['/x/thing/yard', '/x/location/room'] },
      }),
    ]);
    expect(checkShopfronts(rows)).toEqual([]);
  });

  it('fires when the house lists only the room', () => {
    const rows = new Map([
      counter,
      row('/x/idea/house', {
        class: '/platform/idea/Business',
        data: { operatingLocations: ['/x/location/room'] },
      }),
    ]);
    const f = checkShopfronts(rows);
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/operatingLocations/);
  });

  it('fires when the house does not exist', () => {
    expect(checkShopfronts(new Map([counter]))).toHaveLength(1);
  });
});
