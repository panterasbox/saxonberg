/**
 * Relative `FromModule` gate strings — the loader transform rewrites
 * `./x` / `../x` (relative to the DECLARING file's module directory) to
 * their absolute, mud-rooted form at load time, so the runtime matcher
 * only ever sees absolute globs. Only `FromModule` is rewritten;
 * absolute globs, `FromTemplate`, and non-gate strings are untouched.
 *
 * A `.js` test because the loader subsystem is deliberately plain JS
 * (it bootstraps TS loading), untyped by tsc (`allowJs` off) — a `.ts`
 * test importing it would trip TS7016. vitest still discovers it.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveRelativeModuleGates,
  transformSource,
} from '../transform.js';

// A file at src/mud/obj/command/governance/Foo.ts → module dir
// /obj/command/governance.
const FILE =
  'file:///proj/packages/server/src/mud/obj/command/governance/Foo.ts';

describe('resolveRelativeModuleGates', () => {
  it('resolves ./sibling against the declaring file dir', () => {
    const out = resolveRelativeModuleGates(
      `@CallSecurity(FromModule('./OfficeController'))`,
      FILE,
    );
    expect(out).toContain(
      `FromModule('/obj/command/governance/OfficeController')`,
    );
  });

  it('resolves ../ up a directory', () => {
    const out = resolveRelativeModuleGates(
      `FromModule("../author/WizardController")`,
      FILE,
    );
    expect(out).toContain(`FromModule("/obj/command/author/WizardController")`);
  });

  it('resolves a relative glob and keeps the ** segment', () => {
    const out = resolveRelativeModuleGates(`FromModule('./**')`, FILE);
    expect(out).toContain(`FromModule('/obj/command/governance/**')`);
  });

  it('preserves a #Export suffix (and resolves ../../../ to root)', () => {
    expect(
      resolveRelativeModuleGates(`FromModule('./Sibling#Export')`, FILE),
    ).toContain(`FromModule('/obj/command/governance/Sibling#Export')`);
    expect(
      resolveRelativeModuleGates(`FromModule('../../../api/office#OfficeApi')`, FILE),
    ).toContain(`FromModule('/api/office#OfficeApi')`);
  });

  it('leaves absolute FromModule globs untouched', () => {
    const src = `FromModule('/obj/command/author/GotoController')`;
    expect(resolveRelativeModuleGates(src, FILE)).toBe(src);
  });

  it('leaves FromTemplate and non-gate strings untouched', () => {
    const src =
      `FromTemplate('./x'); const p = './some/path'; loadYaml('../data.yaml');`;
    expect(resolveRelativeModuleGates(src, FILE)).toBe(src);
  });
});

describe('transformSource applies the relative-gate rewrite', () => {
  it('rewrites a relative gate in a real (stampable) module', () => {
    const src =
      `export class Foo {\n` +
      `  @CallSecurity(FromModule('../author/DestructController'))\n` +
      `  static m() {}\n` +
      `}\n`;
    const out = transformSource(src, FILE);
    expect(out).toContain(
      `FromModule('/obj/command/author/DestructController')`,
    );
    // ...and still stamps (the two passes coexist).
    expect(out).toContain('__callSecModuleApi.stamp(import.meta.url');
  });
});
