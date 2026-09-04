/**
 * `StuffApi.resolveClassFile` — the ONE place a class-namespace path
 * becomes a file (content-packs, the capability rung). A kernel root
 * resolves into the kernel tree exactly as before; a registered pack
 * root resolves into that pack's `src/` and reports the origin; a pack
 * path with no backing file is an error naming the pack — never a
 * fallback to the kernel.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { StuffApi } from '../stuff';
import { ModuleApi } from '../module';

let src: string;

beforeAll(() => {
  src = mkdtempSync(join(tmpdir(), 'pack-src-'));
  mkdirSync(join(src, 'thing'), { recursive: true });
  writeFileSync(join(src, 'thing', 'Widget.ts'), 'export default class Widget {}\n');
  ModuleApi.registerPackSource(src, '/fixture-resolve');
});
afterAll(() => rmSync(src, { recursive: true, force: true }));

describe('StuffApi.resolveClassFile', () => {
  it('a kernel root resolves into the kernel tree', () => {
    const r = StuffApi.resolveClassFile('/platform/thing/Thing');
    expect(r.origin).toBe('kernel');
    expect(r.file.replace(/\\/g, '/')).toMatch(/\/src\/mud\/platform\/thing\/Thing\.ts$/);
  });

  it('a pack root resolves into the pack src/ and says so', () => {
    const r = StuffApi.resolveClassFile('/fixture-resolve/thing/Widget');
    expect(r.origin).toEqual({ root: '/fixture-resolve', srcRoot: src.replace(/\\/g, '/') + '/' });
    expect(r.file).toBe(src.replace(/\\/g, '/') + '/thing/Widget.ts');
  });

  it('a pack path with no file is an error naming the pack root — no kernel fallback', () => {
    expect(() => StuffApi.resolveClassFile('/fixture-resolve/thing/Missing')).toThrow(
      /'\/fixture-resolve' is a capability pack's, and its src\/ has no 'thing\/Missing\.ts'/,
    );
  });

  it('an unregistered root is the kernel tree\'s — and resolution, not a prefix list, decides whether it exists', async () => {
    const r = StuffApi.resolveClassFile('/nowhere/thing/X');
    expect(r.origin).toBe('kernel');
    await expect(StuffApi.loadClassByPath('/nowhere/thing/X')).rejects.toThrow(/failed to import/);
  });

  it('the traversal guard is the only shape rule', () => {
    expect(() => StuffApi.resolveClassFile('platform/thing/Thing')).toThrow(/must start with \//);
    expect(() => StuffApi.resolveClassFile('/platform/../secret')).toThrow(/cannot contain/);
  });

  it('loadClassByPath imports a pack class through the table', async () => {
    const cls = (await StuffApi.loadClassByPath('/fixture-resolve/thing/Widget')) as { name: string };
    expect(cls.name).toBe('Widget');
  });
});
