/**
 * InfluenceApi — the common cross-stock dispatcher. Covers that
 * `'consumer'` delegates to `ConsumerApi` and `'producer'` to `ProducerApi`,
 * that the still-reserved `'capital'` stock returns a defined zero standing
 * tagged with that stock (never a throw), and that `bandOf` reads the
 * delegated band.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { InfluenceApi } from '../influence';
import { ConsumerApi } from '../consumer';
import { ProducerApi } from '../producer';
import { InfluenceStanding } from '../../lib/standing/InfluenceStanding';
import { Band } from '../../lib/standing/Band';

afterEach(() => vi.restoreAllMocks());

const S = '/platform/agent/Avatar/subject';

describe('InfluenceApi', () => {
  it('delegates the consumer stock to ConsumerApi', () => {
    const stub = new InfluenceStanding(S, 'consumer', 7, Band.fromScalar(7));
    vi.spyOn(ConsumerApi, 'standingOf').mockReturnValue(stub);

    const st = InfluenceApi.standingOf(S, 'consumer');
    expect(st).toBe(stub);
    expect(st.stock).toBe('consumer');
    expect(InfluenceApi.bandOf(S, 'consumer').name).toBe('familiar'); // 7 ≥ familiar(5)
  });

  it('delegates the producer stock to ProducerApi', () => {
    const stub = new InfluenceStanding(S, 'producer', 20, Band.fromScalar(20));
    vi.spyOn(ProducerApi, 'standingOf').mockReturnValue(stub);

    const st = InfluenceApi.standingOf(S, 'producer');
    expect(st).toBe(stub);
    expect(st.stock).toBe('producer');
    expect(InfluenceApi.bandOf(S, 'producer').name).toBe('established'); // 20 ≥ established(20)
  });

  it('returns a defined zero standing for the reserved capital stock (no throw)', () => {
    const st = InfluenceApi.standingOf(S, 'capital');
    expect(st.stock).toBe('capital');
    expect(st.scalar).toBe(0);
    expect(st.band.name).toBe('dormant');
  });
});
