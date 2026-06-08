import { describe, it, expect } from 'vitest';
import { Door } from '../Door';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { SmellConduit } from '../SmellConduit';

describe('Door — SmellConduit gating', () => {
  it('exposes a smell conduit alongside the other three', () => {
    const door = makeStuff(() => new Door());
    const conduits = door.getConduits();
    const smell = conduits.find((c) => c.conduitKind === 'smell') as
      | SmellConduit
      | undefined;
    expect(smell).toBeDefined();
  });

  it('closed door blocks smell (transmissivity 0)', () => {
    const door = makeStuff(() => new Door());
    door.setOpen(false);
    const smell = door
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit;
    expect(smell.transmissivity('A', 'B')).toBe(0);
    expect(smell.transmissivity('B', 'A')).toBe(0);
  });

  it('open door transmits smell (transmissivity 1)', () => {
    const door = makeStuff(() => new Door());
    door.setOpen(true);
    const smell = door
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit;
    expect(smell.transmissivity('A', 'B')).toBe(1);
  });
});
