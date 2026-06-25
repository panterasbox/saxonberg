/**
 * InfluenceApi — the common cross-stock dispatcher. Covers that
 * `'consumer'` delegates to `ConsumerApi`, that a reserved stock
 * (`'patron'`/`'producer'`) returns a defined zero standing tagged with
 * that stock (never a throw), and that `bandOf` reads the delegated band.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { InfluenceApi } from '../influence';
import { ConsumerApi } from '../consumer';
import { InfluenceStanding } from '../../lib/standing/InfluenceStanding';
import { Band } from '../../lib/standing/Band';

afterEach(() => vi.restoreAllMocks());

const S = '/obj/Avatar/subject';

describe('InfluenceApi', () => {
  it('delegates the consumer stock to ConsumerApi', () => {
    const stub = new InfluenceStanding(S, 'consumer', 7, Band.fromScalar(7));
    vi.spyOn(ConsumerApi, 'standingOf').mockReturnValue(stub);

    const st = InfluenceApi.standingOf(S, 'consumer');
    expect(st).toBe(stub);
    expect(st.stock).toBe('consumer');
    expect(InfluenceApi.bandOf(S, 'consumer').name).toBe('familiar'); // 7 ≥ familiar(5)
  });

  it('returns a defined zero standing for a reserved stock (no throw)', () => {
    for (const stock of ['patron', 'producer'] as const) {
      const st = InfluenceApi.standingOf(S, stock);
      expect(st.stock).toBe(stock);
      expect(st.scalar).toBe(0);
      expect(st.band.name).toBe('dormant');
    }
  });
});
