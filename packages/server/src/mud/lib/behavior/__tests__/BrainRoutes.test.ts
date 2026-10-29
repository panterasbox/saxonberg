/**
 * A worker brain's `ways:` config, read once (review R2-D8).
 */

import { describe, it, expect } from 'vitest';
import { BrainRoutes } from '../BrainRoutes';

describe('BrainRoutes', () => {
  it('reads each row with a place and both legs; skips the rest', () => {
    const routes = new BrainRoutes({
      ways: [
        { to: '/x/hacks', go: ['north', 'east'], back: ['west', 'south'] },
        { to: '/x/pit', go: ['down'], back: [] }, // no way back: no route
        { to: '', go: ['up'], back: ['down'] }, // no place: no route
        'nonsense',
        { to: '/x/store', go: ['west', 7], back: ['east'] }, // a non-string step is dropped
      ],
    });
    expect(routes.all().map((r) => r.to)).toEqual(['/x/hacks', '/x/store']);
    expect(routes.to('/x/hacks')?.back).toEqual(['west', 'south']);
    expect(routes.to('/x/store')?.go).toEqual(['west']);
    expect(routes.to('/x/pit')).toBeNull();
  });

  it('no `ways:` is no routes', () => {
    expect(new BrainRoutes({}).all()).toEqual([]);
  });
});
