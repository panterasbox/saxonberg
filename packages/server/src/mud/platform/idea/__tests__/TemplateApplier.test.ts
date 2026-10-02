import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { Idea } from '../../../lib/stuff/Idea';
import TemplateApplier from '../TemplateApplier';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../../lib/mixin';

/**
 * Tests for the applier's three-phase dispatch and its three modes.
 *
 * Phase 1 — property fields: `setX` method preferred over bracket-
 * assign. Async setters are awaited; a throw aborts the apply.
 *
 * Phase 2 — instruction fields: `applyX` is required; absence throws a
 * clear configuration error.
 *
 * Phase 3 — seed fields: `seedX` is required, same rule, and the phase
 * runs at MINT ONLY. (Added 2026-10-01 with the rename from
 * `PersistentHydrator`.)
 *
 * The modes — `mint` / `go-live` / `restore` — decide which phases run
 * and whether a `birthOnly` field is pushed. ⚠⚠ `go-live` skipping
 * `birthOnly` is the coin fix: see the describe block at the bottom.
 */

class PropertyFieldBacking extends Idea {
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
  };

  public name: string = '';
  public calls: string[] = [];

  public setName(value: string): void {
    this.calls.push(`setName(${value})`);
    this.name = value;
  }
}

class BracketAssignBacking extends Idea {
  static fieldMeta: FieldMeta = {
    rawField: { persistent: true },
  };
  public rawField: number = 0;
  // No setRawField method — exercises the bracket-assign fallback.
}

class AsyncSetterBacking extends Idea {
  static fieldMeta: FieldMeta = {
    flag: { persistent: true },
  };
  public flag: string = '';
  public sideEffectFired: boolean = false;

  public async setFlag(value: string): Promise<void> {
    // Force the await — anything that depends on the side effect
    // completing must see the post-await value.
    await Promise.resolve();
    this.sideEffectFired = true;
    this.flag = value;
  }
}

class ThrowingSetterBacking extends Idea {
  static fieldMeta: FieldMeta = {
    oops: { persistent: true },
  };

  public async setOops(_value: unknown): Promise<void> {
    await Promise.resolve();
    throw new Error('boom from async setter');
  }
}

class InstructionFieldBacking extends Idea {
  static fieldMeta: FieldMeta = {
    exits: { instruction: true },
  };
  public appliedSpecs: unknown[] = [];

  public async applyExits(spec: unknown): Promise<void> {
    await Promise.resolve();
    this.appliedSpecs.push(spec);
  }
}

class MisconfiguredInstructionBacking extends Idea {
  static fieldMeta: FieldMeta = {
    missingApplier: { instruction: true },
  };
  // Deliberately no applyMissingApplier method.
}

class MixedFieldBacking extends Idea {
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    exits: { instruction: true },
  };
  public order: string[] = [];
  public name: string = '';

  public setName(value: string): void {
    this.order.push(`set:${value}`);
    this.name = value;
  }
  public async applyExits(_spec: unknown): Promise<void> {
    this.order.push('apply:exits');
  }
}

/**
 * A backing exercising all three phases plus `birthOnly`, with an
 * ordered log so the phase sequence is observable.
 */
class ThreePhaseBacking extends Idea {
  static fieldMeta: FieldMeta = {
    label: { persistent: true },
    count: { persistent: true, birthOnly: true },
    layout: { instruction: true },
    history: { persistent: true, seed: true },
  };

  public label = '';
  public count = 0;
  public history: string[] = [];
  public order: string[] = [];

  public setLabel(v: string): void {
    this.order.push('set:label');
    this.label = v;
  }
  public setCount(v: number): void {
    this.order.push('set:count');
    this.count = v;
  }
  public async applyLayout(_v: unknown): Promise<void> {
    this.order.push('apply:layout');
  }
  public async seedHistory(v: string[]): Promise<void> {
    this.order.push(`seed:history(${v.length})`);
  }
}

/** A seed field whose host declares no `seedX` — a configuration bug. */
class MissingSeederBacking extends Idea {
  static fieldMeta: FieldMeta = {
    chronicle: { persistent: true, seed: true },
  };
  public chronicle: string[] = [];
}

function hydrator(): TemplateApplier {
  return makeStuff(() => new TemplateApplier());
}

const ALL = {
  label: 'a thing',
  count: 500,
  layout: { n: 1 },
  history: ['one', 'two'],
};

describe('TemplateApplier — two-phase dispatch', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('Phase 1 — property fields', () => {
    it('prefers a set<Field> method over bracket-assign when present', async () => {
      const b = makeStuff(() => new PropertyFieldBacking());
      await hydrator().apply(b, { name: 'Castle' }, { mode: 'mint' });
      expect(b.calls).toEqual(['setName(Castle)']);
      expect(b.name).toBe('Castle');
    });

    it('falls back to bracket-assign when no set<Field> method exists', async () => {
      const b = makeStuff(() => new BracketAssignBacking());
      await hydrator().apply(b, { rawField: 42 }, { mode: 'mint' });
      expect(b.rawField).toBe(42);
    });

    it('awaits async set<Field> methods so side effects complete', async () => {
      const b = makeStuff(() => new AsyncSetterBacking());
      await hydrator().apply(b, { flag: 'lit' }, { mode: 'mint' });
      expect(b.sideEffectFired).toBe(true);
      expect(b.flag).toBe('lit');
    });

    it('propagates async setter throws and aborts hydrate', async () => {
      const b = makeStuff(() => new ThrowingSetterBacking());
      await expect(
        hydrator().apply(b, { oops: 'anything' }, { mode: 'mint' })
      ).rejects.toThrow(/boom from async setter/);
    });

    it('skips fields absent from data even when set<Field> is defined', async () => {
      const b = makeStuff(() => new PropertyFieldBacking());
      await hydrator().apply(b, {}, { mode: 'mint' });
      expect(b.calls).toEqual([]);
      expect(b.name).toBe('');
    });
  });

  describe('Phase 2 — instruction fields', () => {
    it('dispatches to apply<Field> when an instruction field is declared', async () => {
      const b = makeStuff(() => new InstructionFieldBacking());
      const spec = { north: { destination: '/some/path' } };
      await hydrator().apply(b, { exits: spec }, { mode: 'mint' });
      expect(b.appliedSpecs).toEqual([spec]);
    });

    it('throws with a clear diagnostic when the applier is missing', async () => {
      const b = makeStuff(() => new MisconfiguredInstructionBacking());
      await expect(
        hydrator().apply(b, { missingApplier: {} }, { mode: 'mint' })
      ).rejects.toThrow(/applyMissingApplier/);
    });

    it('skips instruction fields absent from data', async () => {
      const b = makeStuff(() => new InstructionFieldBacking());
      await hydrator().apply(b, {}, { mode: 'mint' });
      expect(b.appliedSpecs).toEqual([]);
    });
  });

  describe('Phase ordering', () => {
    it('runs all property fields before any instruction is applied', async () => {
      const b = makeStuff(() => new MixedFieldBacking());
      await hydrator().apply(b, { name: 'Foyer', exits: {} }, { mode: 'mint' });
      expect(b.order).toEqual(['set:Foyer', 'apply:exits']);
    });
  });
});

describe('TemplateApplier — the three phases, in order', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('runs property, then instruction, then seed', async () => {
    const b = makeStuff(() => new ThreePhaseBacking());
    await hydrator().apply(b, ALL, { mode: 'mint' });
    expect(b.order).toEqual([
      'set:label',
      'set:count',
      'apply:layout',
      'seed:history(2)',
    ]);
  });

  it('a seed field with no seed<Field> throws, naming the field', async () => {
    const b = makeStuff(() => new MissingSeederBacking());
    await expect(
      hydrator().apply(b, { chronicle: ['x'] }, { mode: 'mint' }),
    ).rejects.toThrow(/seed field 'chronicle'.*declares no 'seedChronicle'/s);
  });

  it('a seed field is ALSO a property field — phase 1 still assigns it', async () => {
    // The authored value has to stay readable on the instance; phase 3
    // adds the ledger write, it does not replace the assignment.
    const b = makeStuff(() => new ThreePhaseBacking());
    await hydrator().apply(b, { history: ['a'] }, { mode: 'mint' });
    expect(b.history).toEqual(['a']);
  });
});

describe('TemplateApplier — the three modes', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('mint runs all three phases', async () => {
    const b = makeStuff(() => new ThreePhaseBacking());
    await hydrator().apply(b, ALL, { mode: 'mint' });
    expect(b.order).toContain('apply:layout');
    expect(b.order).toContain('seed:history(2)');
    expect(b.count).toBe(500);
  });

  it('⚠⚠ go-live SKIPS a birthOnly field, and seeds nothing', async () => {
    // The coin. A live stack holds 500; the row authors 1. Going live
    // must leave the live count alone — and must not re-write the
    // host's authored history into its ledger a second time.
    const b = makeStuff(() => new ThreePhaseBacking());
    b.setCount(500);
    b.order = [];
    await hydrator().apply(
      b,
      { label: 'edited', count: 1, layout: { n: 2 }, history: ['one'] },
      { mode: 'go-live' },
    );
    expect(b.count).toBe(500); // ⬅ the money fix
    expect(b.label).toBe('edited'); // an ordinary edit still lands
    expect(b.order).toContain('apply:layout'); // instructions still run
    expect(b.order).not.toContain('seed:history(1)');
    expect(b.order).not.toContain('set:count');
  });

  it('⚠ restore does NOT skip a birthOnly field', async () => {
    // A record replays what this instance actually had, so the stack's
    // real count is exactly what must come back. Confusing restore with
    // go-live would empty every logged-out player's purse.
    const b = makeStuff(() => new ThreePhaseBacking());
    await hydrator().apply(b, { count: 500 }, { mode: 'restore' });
    expect(b.count).toBe(500);
  });

  it('restore runs phase 1 only', async () => {
    const b = makeStuff(() => new ThreePhaseBacking());
    await hydrator().apply(b, ALL, { mode: 'restore' });
    expect(b.order).toEqual(['set:label', 'set:count']);
  });
});
