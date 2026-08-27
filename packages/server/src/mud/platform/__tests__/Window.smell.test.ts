import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import Window from '../thing/Window';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { SmellConduit } from '../../lib/boundary/SmellConduit';

describe('Window — SmellConduit gating', () => {
  it('exposes a smell conduit alongside light + sight', () => {
    const w = makeStuff(() => new Window());
    const smell = w
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit | undefined;
    expect(smell).toBeDefined();
  });

  it('closed shutter blocks smell', () => {
    const w = makeStuff(() => new Window());
    w.close();
    const smell = w
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit;
    expect(smell.transmissivity('A', 'B')).toBe(0);
  });

  it('open shutter transmits smell (mirrors light transmissivity)', () => {
    const w = makeStuff(() => new Window());
    w.open();
    w.setBaseTransmissivity(0.7);
    const smell = w
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit;
    expect(smell.transmissivity('A', 'B')).toBeCloseTo(0.7);
  });
});
