/**
 * The bench: the queue, the amortization, and the paper.
 *
 * ⭐⭐ The claim under test is **the bench holds nothing of yours**. It
 * takes samples, it works over game-time, and what it gives back is an
 * object in a room — so a customer who logged out still has their assay.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import AssayBench from '../thing/instrument/AssayBench';
import ReadingRecord from '@saxonberg/server/mud/platform/thing/ReadingRecord';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

function bench(): AssayBench {
  return makeStuff(() => new AssayBench());
}

function batch(n: number, who = 'p1'): {
  samples: Stuff[];
  customer: string;
  customerLabel: string;
  seconds: number;
} {
  return {
    samples: Array.from({ length: n }, () => ({}) as Stuff),
    customer: who,
    customerLabel: who,
    seconds: 100,
  };
}

describe('AssayBench — the queue', () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ the batch is AMORTIZED — the trip is what you pay for', () => {
    const b = bench();
    const one = b.secondsFor(1);
    const eight = b.secondsFor(8);
    // Lighting the muffle costs the same either way, so eight samples
    // cost far less than eight trips. Carrying one sample in is a
    // decision you should feel bad about.
    expect(eight).toBeLessThan(8 * one);
    expect(eight).toBe(b.getSetupS() + 8 * b.getPerSampleS());
  });

  it('a free bench takes the next batch and marks itself busy', () => {
    const b = bench();
    b.enqueue(batch(2));
    expect(b.isBusy()).toBe(false);
    const taken = b.takeNext();
    expect(taken?.samples).toHaveLength(2);
    expect(b.isBusy()).toBe(true);
  });

  it('⭐ a busy bench takes NOTHING — one fire, one batch', () => {
    const b = bench();
    b.enqueue(batch(1, 'a'));
    b.enqueue(batch(1, 'c'));
    expect(b.takeNext()?.customer).toBe('a');
    expect(b.takeNext()).toBeNull();
    b.release();
    expect(b.takeNext()?.customer).toBe('c');
  });

  it('⭐ a queue tells you where you are in it', () => {
    const b = bench();
    expect(b.enqueue(batch(1, 'a'))).toBe(0);
    expect(b.enqueue(batch(1, 'c'))).toBe(1);
    b.takeNext();
    // One on the fire and one waiting: a newcomer is third.
    expect(b.enqueue(batch(1, 'e'))).toBe(2);
  });

  it('⚠ the queue is RUNTIME — a restart empties it, and nothing was taken', () => {
    // A queue that survived a restart would be a promise the world clock
    // can no longer keep: the timers are gone. The honest behaviour is
    // an empty bench with the samples still sitting on it.
    const b = bench();
    b.enqueue(batch(3));
    expect(b.constructor).not.toHaveProperty('persistentFields', ['pending']);
    const meta = (AssayBench as unknown as { fieldMeta: Record<string, unknown> })
      .fieldMeta;
    expect(meta).not.toHaveProperty('pending');
    expect(meta).not.toHaveProperty('busy');
  });
});

describe('ReadingRecord — the paper', () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ names who read it, with what, and how well', () => {
    const paper = makeStuff(() => new ReadingRecord());
    paper.inscribe({
      channel: 'grade',
      subjectLabel: 'a lump of ore',
      reading: '17.3 % ± 0.4 metal by mass — fair ore.',
      value: 17.3,
      unit: '%',
      band: 'proficient',
      takenBy: '/platform/agent/Avatar/p1',
      takenByLabel: 'Iwe',
      takenWith: '/trade/mining/thing/instrument/AssayBench',
      takenWithGrade: 'fine',
      takenOn: 1_000,
      sampledAt: '/test/mine/north-face',
      sampledBy: '/platform/agent/Avatar/p2',
      sampledOn: 500,
      tell: null,
    });
    const read = paper.getLongDescription();
    expect(read).toMatch(/Assayed by Iwe/);
    expect(read).toMatch(/a proficient hand/);
    expect(read).toMatch(/17\.3 %/);
    expect(read).toMatch(/north face/);
    expect(read).toMatch(/at assay bench/);
    // ⚠ A BAND about the READER, never a number — the honesty firewall
    // is *no quantity without a referent*, and a band's referent is a
    // Discipline while a score's referent is nothing. (The figures in
    // the reading itself are about the ROCK, and are the whole point.)
    expect(paper.getBand()).toMatch(
      /^(untrained|novice|competent|proficient|expert)$/,
    );
    expect(read).not.toMatch(/proficient[^.]*\d/);
  });

  it('⭐⭐ the provenance path is never RESOLVED — a worked-out face still reads', () => {
    const paper = makeStuff(() => new ReadingRecord());
    paper.inscribe({
      channel: 'grade',
      subjectLabel: 'ore',
      reading: 'x',
      value: null,
      unit: '',
      band: 'competent',
      takenBy: 'p',
      takenByLabel: 'somebody',
      takenWith: '',
      takenWithGrade: '',
      takenOn: 0,
      // A place that does not exist and never will.
      sampledAt: '/test/mine/collapsed-gallery',
      sampledBy: 'p',
      sampledOn: 0,
      tell: null,
    });
    expect(paper.getLongDescription()).toMatch(/collapsed gallery/);
  });

  it('carries the assayer’s tell about the SAMPLE, when there is one', () => {
    const paper = makeStuff(() => new ReadingRecord());
    paper.inscribe({
      channel: 'chemistry',
      subjectLabel: 'a portion of milk',
      reading: 'milk; the sample is tainted.',
      value: null,
      unit: '',
      band: 'competent',
      takenBy: 'p',
      takenByLabel: 'the assayer',
      takenWith: '',
      takenWithGrade: '',
      takenOn: 0,
      sampledAt: '/test/farm/dairy',
      sampledBy: 'p',
      sampledOn: 0,
      tell: 'This has been 6 hours in the carrying, and it shows.',
    });
    expect(paper.getLongDescription()).toMatch(/6 hours in the carrying/);
  });
});
