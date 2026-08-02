import { describe, it, expect, afterEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import PersistentHydrator from '../PersistentHydrator';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

/**
 * Tests for the two-phase dispatch behavior introduced in the
 * spatial+boundary substrate build.
 *
 * Phase 1 — property fields: `setX` method preferred over bracket-
 * assign. Async setters are awaited; throws abort hydrate.
 *
 * Phase 2 — instruction fields: `applyX` method is required; absence
 * throws a clear configuration error.
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

function hydrator(): PersistentHydrator {
  return makeStuff(() => new PersistentHydrator());
}

describe('PersistentHydrator — two-phase dispatch', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('Phase 1 — property fields', () => {
    it('prefers a set<Field> method over bracket-assign when present', async () => {
      const b = makeStuff(() => new PropertyFieldBacking());
      await hydrator().hydrate(b, { name: 'Castle' });
      expect(b.calls).toEqual(['setName(Castle)']);
      expect(b.name).toBe('Castle');
    });

    it('falls back to bracket-assign when no set<Field> method exists', async () => {
      const b = makeStuff(() => new BracketAssignBacking());
      await hydrator().hydrate(b, { rawField: 42 });
      expect(b.rawField).toBe(42);
    });

    it('awaits async set<Field> methods so side effects complete', async () => {
      const b = makeStuff(() => new AsyncSetterBacking());
      await hydrator().hydrate(b, { flag: 'lit' });
      expect(b.sideEffectFired).toBe(true);
      expect(b.flag).toBe('lit');
    });

    it('propagates async setter throws and aborts hydrate', async () => {
      const b = makeStuff(() => new ThrowingSetterBacking());
      await expect(
        hydrator().hydrate(b, { oops: 'anything' })
      ).rejects.toThrow(/boom from async setter/);
    });

    it('skips fields absent from data even when set<Field> is defined', async () => {
      const b = makeStuff(() => new PropertyFieldBacking());
      await hydrator().hydrate(b, {});
      expect(b.calls).toEqual([]);
      expect(b.name).toBe('');
    });
  });

  describe('Phase 2 — instruction fields', () => {
    it('dispatches to apply<Field> when an instruction field is declared', async () => {
      const b = makeStuff(() => new InstructionFieldBacking());
      const spec = { north: { destination: '/some/path' } };
      await hydrator().hydrate(b, { exits: spec });
      expect(b.appliedSpecs).toEqual([spec]);
    });

    it('throws with a clear diagnostic when the applier is missing', async () => {
      const b = makeStuff(() => new MisconfiguredInstructionBacking());
      await expect(
        hydrator().hydrate(b, { missingApplier: {} })
      ).rejects.toThrow(/applyMissingApplier/);
    });

    it('skips instruction fields absent from data', async () => {
      const b = makeStuff(() => new InstructionFieldBacking());
      await hydrator().hydrate(b, {});
      expect(b.appliedSpecs).toEqual([]);
    });
  });

  describe('Phase ordering', () => {
    it('runs all property fields before any instruction is applied', async () => {
      const b = makeStuff(() => new MixedFieldBacking());
      await hydrator().hydrate(b, { name: 'Foyer', exits: {} });
      expect(b.order).toEqual(['set:Foyer', 'apply:exits']);
    });
  });
});
