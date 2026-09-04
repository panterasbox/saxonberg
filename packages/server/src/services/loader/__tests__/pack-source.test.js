/**
 * The loader transform over a CAPABILITY PACK's source — content-packs,
 * the capability rung. A pack ships classes under
 * `packages/content/<pkg>/src/`; the transform must stamp them exactly
 * as it stamps the kernel's `mud/**`, with three pack-specific rules:
 *
 *   1. the file IS transformed (it is outside `/mud/`);
 *   2. its stamp import is the package specifier
 *      `@saxonberg/server/mud/api/module` — the pack's one way to reach
 *      the kernel, and the form that survives the pack moving to its own
 *      repo;
 *   3. a relative `FromModule('./x')` in it is left untouched — pack code
 *      writes absolute gates, because the transform cannot know the
 *      pack's namespace root.
 *
 * A pack's tests (`src/**\/__tests__/`) are not stamped.
 *
 * A `.js` test for the reason the sibling tests give: the loader
 * subsystem is plain JS.
 */

import { describe, it, expect } from 'vitest';
import {
  computeRegistryImportPath,
  isPackSourcePath,
  resolveRelativeModuleGates,
  shouldTransform,
  transformSource,
} from '../transform.js';

const PACK_FILE = 'file:///proj/packages/content/arcana/src/thing/Wand.ts';
const PACK_TEST =
  'file:///proj/packages/content/arcana/src/__tests__/Wand.test.ts';
const KERNEL_FILE = 'file:///proj/packages/server/src/mud/platform/thing/Thing.ts';

describe('isPackSourcePath', () => {
  it('recognises packages/content/<pkg>/src/', () => {
    expect(isPackSourcePath('/proj/packages/content/arcana/src/thing/Wand.ts')).toBe(true);
    expect(isPackSourcePath('/proj/packages/content/arcana/content/x.yaml')).toBe(false);
    expect(isPackSourcePath('/proj/packages/server/src/mud/api/stuff.ts')).toBe(false);
  });
});

describe('shouldTransform', () => {
  it('transforms a pack source file', () => {
    expect(shouldTransform(PACK_FILE)).toBe(true);
  });
  it('does not transform a pack test file', () => {
    expect(shouldTransform(PACK_TEST)).toBe(false);
  });
  it('still transforms the kernel', () => {
    expect(shouldTransform(KERNEL_FILE)).toBe(true);
  });
});

describe('computeRegistryImportPath', () => {
  it('a pack file reaches the registry by package specifier', () => {
    expect(computeRegistryImportPath(PACK_FILE)).toBe(
      '@saxonberg/server/mud/api/module',
    );
  });
  it('a kernel file keeps its source-relative path', () => {
    expect(computeRegistryImportPath(KERNEL_FILE)).toBe('../../api/module');
  });
});

describe('resolveRelativeModuleGates', () => {
  it('leaves a relative gate in a pack file untouched', () => {
    const src = `@CallSecurity(FromModule('./Sibling'))`;
    expect(resolveRelativeModuleGates(src, PACK_FILE)).toBe(src);
  });
});

describe('transformSource', () => {
  it('stamps a pack class with the package-specifier import', () => {
    const out = transformSource(
      `export default class Wand {}\n`,
      PACK_FILE,
    );
    expect(out).toContain(
      `import { ModuleApi as __callSecModuleApi } from '@saxonberg/server/mud/api/module';`,
    );
    expect(out).toContain('__callSecModuleApi.stamp(import.meta.url, { default: Wand });');
  });
});
