/**
 * LineAccess (energy B2) — ⭐ the pole a lineman reaches, and the storm duck.
 *
 * `sever`/`splice` write the catalogue's cut; `onStormExposure` cuts an
 * OVERHEAD line on a roll and leaves a BURIED one alone (storm-safe by
 * construction). This is the `StormExposed` integration B0 deferred here.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LineAccess from '../thing/LineAccess';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

/** A stub catalogue recording sever/splice. */
function stubCatalogue() {
  const cut = new Set<string>();
  return {
    sever: (n: string) => cut.add(n),
    splice: (n: string) => cut.delete(n),
    isCut: (n: string) => cut.has(n),
    supplyStateAt: async (n: string) => (cut.has(n) ? 'cut' : null),
    cut,
  };
}

function pole(nodeRef: string, buried: boolean): {
  line: LineAccess;
  cat: ReturnType<typeof stubCatalogue>;
} {
  const line = makeStuff(() => new LineAccess());
  line.nodeRef = nodeRef;
  line.buried = buried;
  const cat = stubCatalogue();
  (line as unknown as { _catalogue: unknown })._catalogue = cat;
  return { line, cat };
}

describe('LineAccess', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('sever and splice write the catalogue cut', () => {
    const { line, cat } = pole('main:avenue', false);
    line.sever();
    expect(cat.isCut('main:avenue')).toBe(true);
    expect(line.isCut()).toBe(true);
    line.splice();
    expect(cat.isCut('main:avenue')).toBe(false);
  });

  it('⭐ an overhead pole faults in a storm (rate 1)', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('1'); // energy.stormFaultRate = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const { line, cat } = pole('main:avenue', false);
    line.onStormExposure(0);
    expect(cat.isCut('main:avenue')).toBe(true);
  });

  it('⭐ a buried manhole is storm-safe — it faults never', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('1');
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const { line, cat } = pole('main:manhole', true);
    line.onStormExposure(0);
    expect(cat.isCut('main:manhole')).toBe(false);
  });

  it('an overhead pole does NOT fault when the roll misses', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('0.2');
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // above the rate
    const { line, cat } = pole('main:avenue', false);
    line.onStormExposure(0);
    expect(cat.isCut('main:avenue')).toBe(false);
  });

  it('the state line reports live vs cut (rendered to look via the augmenter)', () => {
    const { line } = pole('main:avenue', false);
    expect(line.stateLine()).toMatch(/live/i);
    line.sever();
    expect(line.stateLine()).toMatch(/cut|dead/i);
  });
});
