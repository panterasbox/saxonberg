/**
 * The nose: acuity, adaptation from presence, naming depth, separation,
 * dominance and the own-smell rule, against a staged signal.
 */

import '../../../../test-bootstrap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Smell } from '../Smell';
import { installAromas } from './aroma-fixtures';
import { soilBody } from '../../cleanliness/__tests__/soil-fixtures';
import { seedKernelContentStore } from '../../security/__tests__/test-setup';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { TemplatePaths } from '../../paths';

let now = 1_000_000;
beforeEach(() => {
  seedKernelContentStore();
  installAromas([
    'grain',
    { word: 'sulfur' },
    { word: 'smoke' },
    { word: 'peat-smoke', parents: ['smoke'], discipline: 'malting' },
    { word: 'wet-peat-smoke', parents: ['smoke', 'peat-smoke'], discipline: 'malting' },
    { word: 'sweat' },
    { word: 'tar' },
    { word: 'oak' },
  ]);
  now = 1_000_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  const find = StuffApi.findByTemplatePath.bind(StuffApi);
  vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((path: string) =>
    path === TemplatePaths.worldClockRegistry ? ({} as never) : find(path)) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const signal = (word: string, ou: number, stuffId = 'elsewhere') =>
  Smell.of([{ stuffId, word, ou, hops: 0 }]);

/** A body with no born shift, so the arithmetic reads plainly. */
function nose() {
  const body = soilBody();
  vi.spyOn(body, 'bornSensitivity').mockReturnValue(0);
  return body;
}

function withBand(body: ReturnType<typeof nose>, discipline: string, band: string) {
  vi.spyOn(MixinApi, 'isAdvancing').mockReturnValue(true);
  const b = body as unknown as { competenceDigestCached: () => unknown };
  b.competenceDigestCached = () => [{ discipline, band }];
}

describe('who detects what', () => {
  it('below 1 OU nobody reads it, and competence does not change that', () => {
    const body = nose();
    expect(body.nose(signal('grain', 0.5)).isEmpty()).toBe(true);
    withBand(body, 'malting', 'expert');
    expect(body.nose(signal('peat-smoke', 0.5)).isEmpty()).toBe(true);
  });

  it('a keen species reads what an ordinary nose cannot', () => {
    const body = nose();
    const profile = (acuity: string) =>
      vi.spyOn(body, 'getSpecies').mockReturnValue({
        getOlfactoryProfile: () => ({ acuity }),
      } as never);
    profile('normal');
    expect(body.nose(signal('grain', 0.5)).isEmpty()).toBe(true);
    profile('keen');
    expect(body.nose(signal('grain', 0.5)).isEmpty()).toBe(false);
    profile('none');
    expect(body.nose(signal('grain', 5000)).isEmpty()).toBe(true);
  });

  it('dominance is the note furthest past its threshold, whatever the mass', () => {
    const body = nose();
    withBand(body, 'malting', 'expert');
    const mixed = Smell.of([
      { stuffId: 'a', word: 'sulfur', ou: 2000, hops: 0 },
      { stuffId: 'b', word: 'grain', ou: 50, hops: 0 },
    ]);
    expect(body.nose(mixed).dominant?.word).toBe('sulfur');
  });

  it('two bodies are not born with the same nose', () => {
    const a = soilBody();
    const b = soilBody();
    vi.spyOn(a, 'getIdentityPath').mockReturnValue('/x/a');
    vi.spyOn(b, 'getIdentityPath').mockReturnValue('/x/b');
    expect(a.bornSensitivity('tar')).not.toBe(b.bornSensitivity('tar'));
    expect(Math.abs(a.bornSensitivity('tar'))).toBeLessThanOrEqual(0.2);
  });
});

describe('naming', () => {
  it('depth by band over a three-deep chain, at the same strength', () => {
    const body = nose();
    const smell = signal('wet-peat-smoke', 500);
    expect(body.nose(smell).dominant?.name).toBe('smoke');
    withBand(body, 'malting', 'novice');
    expect(body.nose(smell).dominant?.name).toBe('peat smoke');
    withBand(body, 'malting', 'competent');
    expect(body.nose(smell).dominant?.name).toBe('wet peat smoke');
    expect(body.nose(smell).dominant?.ou).toBe(500);
  });

  it('a word with no discipline behind it is common knowledge', () => {
    installAromas([{ word: 'stale-sweat', parents: ['sweat'] }]);
    expect(nose().nose(signal('stale-sweat', 40)).dominant?.name).toBe('stale sweat');
  });

  it('the maker counts: a malt reads deep to a nose trained on the making', () => {
    const body = nose();
    withBand(body, 'distilling', 'competent');
    const made = Smell.of([
      { stuffId: 'g', word: 'wet-peat-smoke', ou: 500, hops: 0, maker: 'distilling' },
    ]);
    expect(body.nose(made).dominant?.name).toBe('wet peat smoke');
  });

  it('two notes naming to one word merge', () => {
    const body = nose();
    const both = Smell.of([
      { stuffId: 'a', word: 'peat-smoke', ou: 40, hops: 0 },
      { stuffId: 'b', word: 'wet-peat-smoke', ou: 60, hops: 0 },
    ]);
    const scent = body.nose(both);
    expect(scent.notes).toHaveLength(1);
    expect(scent.dominant?.ou).toBe(100);
  });

  it('separation counts by band; a deliberate read keeps all you can name', () => {
    const body = nose();
    const three = Smell.of(
      ['tar', 'oak', 'grain'].map((word, i) => ({
        stuffId: word,
        word,
        ou: 100 - i,
        hops: 0,
      })),
    );
    expect(body.nose(three).notes).toHaveLength(1);
    expect(body.nose(three, { deliberate: true }).notes).toHaveLength(3);
  });
});

describe('adaptation', () => {
  const place = (id: string) => ({ stuffId: id }) as never;
  const MIN = 60;

  it('presence counts: a first read half an hour in reads two bands under', () => {
    const body = nose();
    body.onMoved(null, place('yard'));
    now += 30 * MIN;
    expect(body.nose(signal('tar', 900)).dominant?.ou).toBeCloseTo(1);
  });

  it('continuous however long the gap between reads', () => {
    const body = nose();
    body.onMoved(null, place('yard'));
    now += MIN;
    body.nose(signal('tar', 900));
    now += 20 * MIN;
    expect(body.nose(signal('tar', 9000)).dominant?.ou).toBeCloseTo(10);
  });

  it('time away brings it back', () => {
    const body = nose();
    body.onMoved(null, place('yard'));
    now += 30 * MIN;
    body.nose(signal('tar', 9000));
    body.onMoved(place('yard'), place('lane'));
    now += 20 * MIN;
    body.onMoved(place('lane'), place('yard'));
    expect(body.nose(signal('tar', 900)).dominant?.ou).toBeCloseTo(900);
  });

  it('moving straight between places sharing a smell keeps the adaptation', () => {
    const body = nose();
    body.onMoved(null, place('yard'));
    now += 30 * MIN;
    body.nose(signal('tar', 9000));
    body.onMoved(place('yard'), place('next'));
    now += 20 * MIN;
    expect(body.nose(signal('tar', 9000)).dominant?.ou).toBeCloseTo(10);
  });

  it('a stay says nothing about what you have just put your nose to', () => {
    const body = nose();
    body.onMoved(null, place('yard'));
    now += 60 * MIN;
    expect(body.nose(signal('tar', 900), { close: true }).dominant?.ou).toBeCloseTo(900);
    // …but what the air has already done to this nose still counts.
    body.nose(signal('oak', 900));
    expect(body.nose(signal('oak', 900), { close: true }).dominant?.ou).toBeCloseTo(1);
  });

  it('linkdead holds it still: neither rising nor falling', () => {
    const body = nose();
    body.onMoved(null, place('yard'));
    now += 5 * MIN;
    const first = body.nose(signal('tar', 900)).dominant?.ou;
    body.freezeNose();
    now += 60 * MIN;
    expect(body.nose(signal('tar', 900)).dominant?.ou).toBeCloseTo(first!);
  });

  it('your own smell starts adapted; what you carry is not you', () => {
    const body = nose();
    const own = Smell.of([{ stuffId: body.stuffId, word: 'sweat', ou: 1800, hops: 0 }]);
    expect(body.nose(own).dominant?.ou).toBeCloseTo(2);
    const carried = Smell.of([
      { stuffId: body.stuffId, word: 'tar', ou: 1800, hops: 0, carried: true },
    ]);
    expect(body.nose(carried).dominant?.ou).toBeCloseTo(1800);
  });
});
