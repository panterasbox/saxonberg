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

describe('QuantityApi.loadTagTables', () => {
  afterEach(() => {
    // Clear out tag tables registered via these tests so the next
    // test doesn't observe leftover state.
    for (const u of Quantity._registeredTagTableUnits()) {
      Quantity._clearTagTable(u);
    }
  });

  it('loads from the production YAML when no path is passed', () => {
    const result = QuantityApi.loadTagTables();
    expect(result.registered.length).toBeGreaterThan(0);
    // Spot check: kg should have a 'medium' threshold of 5.
    expect(Quantity.fromTag('medium', 'kg').rawValue()).toBe(5);
    // K should have 'warm' = 2700.
    expect(Quantity.fromTag('warm', 'K').rawValue()).toBe(2700);
  });

  it('rejects a YAML with negative thresholds', () => {
    withTempYaml(
      `kg:
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
  - { tag: bogus, threshold: 0 }
`,
      (path) => {
        expect(() => QuantityApi.loadTagTables(path)).toThrow(
          /schema validation/
        );
      }
    );
  });

  it('rejects malformed YAML', () => {
    withTempYaml(
      `kg:
  - tag: missing-threshold
`,
      (path) => {
        expect(() => QuantityApi.loadTagTables(path)).toThrow(
          /schema validation/
        );
      }
    );
  });
});

describe('QuantityApi.reloadTagTables', () => {
  afterEach(() => {
    for (const u of Quantity._registeredTagTableUnits()) {
      Quantity._clearTagTable(u);
    }
  });

  it('replaces an existing table when the file changes', () => {
    withTempYaml(
      `kg:
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
  - { tag: feather,  threshold: 0.001 }
  - { tag: medium,   threshold: 5 }
  - { tag: heavy,    threshold: 100 }
  - { tag: enormous, threshold: 500 }
`,
      (path) => {
        const result = QuantityApi.reloadTagTables(path);
        expect(result.registered).toContain('kg');
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
  - { tag: medium, threshold: 5 }
lumen:
  - { tag: glow,  threshold: 1 }
  - { tag: lamp,  threshold: 100 }
`,
      (path) => {
        QuantityApi.loadTagTables(path);
        expect(Quantity._registeredTagTableUnits()).toContain('lumen');
      }
    );

    withTempYaml(
      `kg:
  - { tag: medium, threshold: 5 }
`,
      (path) => {
        const result = QuantityApi.reloadTagTables(path);
        expect(result.removed).toContain('lumen');
        expect(Quantity._registeredTagTableUnits()).not.toContain('lumen');
        // kg still works.
        expect(Quantity.fromTag('medium', 'kg').rawValue()).toBe(5);
      }
    );
  });
});
