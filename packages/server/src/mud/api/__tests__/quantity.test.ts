import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { QuantityApi } from '../quantity';
import { Quantity } from '../../lib/quantity';

/**
 * Write a temp YAML and clean up after — keeps these tests
 * independent of the production config file.
 */
function withTempYaml(yaml: string, fn: (path: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'quantity-tags-'));
  try {
    const path = join(dir, 'tags.yaml');
    writeFileSync(path, yaml, 'utf-8');
    fn(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Wipe every (unit, scale) registered during a test so cross-test
 * leftover state can't bleed. `_registeredScales` returns a fresh
 * snapshot each call, so iterate the snapshot up-front.
 */
function clearAllScales(): void {
  for (const { unit, scaleName } of Quantity._registeredScales()) {
    Quantity._clearTagTable(unit, scaleName);
  }
}

describe('QuantityApi.loadTagTables', () => {
  afterEach(() => {
    clearAllScales();
  });

  it('loads from the production YAML when no path is passed', () => {
    const result = QuantityApi.loadTagTables();
    expect(result.registered.length).toBeGreaterThan(0);
    // Spot check: kg should have a 'medium' threshold of 5.
    expect(Quantity.fromTag('medium', 'kg').rawValue()).toBe(5);
    // K (color scale) should have 'warm' = 2700.
    expect(Quantity.fromTag('warm', 'K').rawValue()).toBe(2700);
  });

  it('rejects a YAML with negative thresholds', () => {
    withTempYaml(
      `kg:
  default:
    - { tag: bogus, threshold: -1 }
`,
      (path) => {
        expect(() => QuantityApi.loadTagTables(path)).toThrow(
          /schema validation/
        );
      }
    );
  });

  it('rejects a YAML keyed on an unknown unit', () => {
    withTempYaml(
      `nonsense:
  default:
    - { tag: bogus, threshold: 0 }
`,
      (path) => {
        expect(() => QuantityApi.loadTagTables(path)).toThrow(
          /schema validation/
        );
      }
    );
  });

  it('rejects malformed YAML (entry missing threshold)', () => {
    withTempYaml(
      `kg:
  default:
    - tag: missing-threshold
`,
      (path) => {
        expect(() => QuantityApi.loadTagTables(path)).toThrow(
          /schema validation/
        );
      }
    );
  });

  it('rejects a YAML missing the per-unit scale layer', () => {
    // Old (single-level) shape is no longer accepted.
    withTempYaml(
      `kg:
  - { tag: medium, threshold: 5 }
`,
      (path) => {
        expect(() => QuantityApi.loadTagTables(path)).toThrow(
          /schema validation/
        );
      }
    );
  });

  it('registers multiple scales for the same unit', () => {
    withTempYaml(
      `K:
  color:
    - { tag: warm,    threshold: 2700 }
    - { tag: neutral, threshold: 4000 }
  thermal:
    - { tag: frozen,  threshold: 0 }
    - { tag: room,    threshold: 295 }
    - { tag: boiling, threshold: 373 }
`,
      (path) => {
        const result = QuantityApi.loadTagTables(path);
        expect(result.registered).toEqual(
          expect.arrayContaining([
            { unit: 'K', scaleName: 'color' },
            { unit: 'K', scaleName: 'thermal' },
          ])
        );
        // First-registered scale becomes the default.
        expect(Quantity._defaultScaleFor('K')).toBe('color');
        // Default-scale lookup picks 'warm' for 3000 K.
        expect(Quantity.of(3000, 'K').tag()).toBe('warm');
        // Explicit scale name picks the thermal vocabulary on the
        // same numeric.
        expect(Quantity.of(3000, 'K').tag('thermal')).toBe('boiling');
        // 295 K — room temperature on thermal, still 'warm' below
        // the color floor (2700) → falls back to canonical format.
        expect(Quantity.of(295, 'K').tag('thermal')).toBe('room');
      }
    );
  });
});

describe('QuantityApi.reloadTagTables', () => {
  afterEach(() => {
    clearAllScales();
  });

  it('replaces an existing table when the file changes', () => {
    withTempYaml(
      `kg:
  default:
    - { tag: feather, threshold: 0.001 }
    - { tag: medium,  threshold: 5 }
    - { tag: heavy,   threshold: 50 }
`,
      (path) => {
        QuantityApi.loadTagTables(path);
        expect(Quantity.of(75, 'kg').tag()).toBe('heavy');
      }
    );

    // Second YAML changes the heavy threshold and adds an enormous tier.
    withTempYaml(
      `kg:
  default:
    - { tag: feather,  threshold: 0.001 }
    - { tag: medium,   threshold: 5 }
    - { tag: heavy,    threshold: 100 }
    - { tag: enormous, threshold: 500 }
`,
      (path) => {
        const result = QuantityApi.reloadTagTables(path);
        expect(result.registered).toContainEqual({
          unit: 'kg',
          scaleName: 'default',
        });
        // 75 was 'heavy' before; under the new thresholds it's
        // 'medium' (the heavy threshold moved to 100).
        expect(Quantity.of(75, 'kg').tag()).toBe('medium');
        expect(Quantity.of(150, 'kg').tag()).toBe('heavy');
        expect(Quantity.of(600, 'kg').tag()).toBe('enormous');
      }
    );
  });

  it("removes a unit's table when it disappears from the YAML", () => {
    withTempYaml(
      `kg:
  default:
    - { tag: medium, threshold: 5 }
lumen:
  default:
    - { tag: glow,  threshold: 1 }
    - { tag: lamp,  threshold: 100 }
`,
      (path) => {
        QuantityApi.loadTagTables(path);
        expect(Quantity._registeredScales()).toContainEqual({
          unit: 'lumen',
          scaleName: 'default',
        });
      }
    );

    withTempYaml(
      `kg:
  default:
    - { tag: medium, threshold: 5 }
`,
      (path) => {
        const result = QuantityApi.reloadTagTables(path);
        expect(result.removed).toContainEqual({
          unit: 'lumen',
          scaleName: 'default',
        });
        expect(Quantity._registeredScales()).not.toContainEqual({
          unit: 'lumen',
          scaleName: 'default',
        });
        // kg still works.
        expect(Quantity.fromTag('medium', 'kg').rawValue()).toBe(5);
      }
    );
  });

  it('removes one scale of a multi-scale unit while keeping the others', () => {
    withTempYaml(
      `K:
  color:
    - { tag: warm,    threshold: 2700 }
    - { tag: neutral, threshold: 4000 }
  thermal:
    - { tag: frozen,  threshold: 0 }
    - { tag: room,    threshold: 295 }
`,
      (path) => {
        QuantityApi.loadTagTables(path);
      }
    );

    withTempYaml(
      `K:
  color:
    - { tag: warm,    threshold: 2700 }
    - { tag: neutral, threshold: 4000 }
`,
      (path) => {
        const result = QuantityApi.reloadTagTables(path);
        expect(result.removed).toContainEqual({
          unit: 'K',
          scaleName: 'thermal',
        });
        expect(result.removed).not.toContainEqual({
          unit: 'K',
          scaleName: 'color',
        });
        // The remaining scale is still callable.
        expect(Quantity.fromTag('warm', 'K', 'color').rawValue()).toBe(2700);
        // Default scale stays 'color' (it wasn't the one removed).
        expect(Quantity._defaultScaleFor('K')).toBe('color');
      }
    );
  });

  it('promotes a remaining scale to default when the prior default is removed', () => {
    withTempYaml(
      `K:
  color:
    - { tag: warm, threshold: 2700 }
  thermal:
    - { tag: room, threshold: 295 }
`,
      (path) => {
        QuantityApi.loadTagTables(path);
        expect(Quantity._defaultScaleFor('K')).toBe('color');
      }
    );

    // Remove the color scale; thermal should become the new default.
    withTempYaml(
      `K:
  thermal:
    - { tag: room, threshold: 295 }
`,
      (path) => {
        const result = QuantityApi.reloadTagTables(path);
        expect(result.removed).toContainEqual({
          unit: 'K',
          scaleName: 'color',
        });
        expect(Quantity._defaultScaleFor('K')).toBe('thermal');
      }
    );
  });
});
