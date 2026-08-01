/**
 * The stamp snippet for DEFAULT-exported classes, across every source
 * shape the transform is handed.
 *
 * This is the case that had no coverage and broke the running game while
 * the whole unit suite stayed green. The two transform paths do not see
 * the same source:
 *
 *   - the **Vite plugin** (tests) reads raw TypeScript, where
 *     `export default class Foo` is a class declaration carrying the
 *     `default` modifier;
 *   - the **Node loader hook** (dev + production) chains LAST, so it
 *     reads tsx's already-compiled output, where the compiler has
 *     lowered that same declaration to `class Foo {…}` plus
 *     `export { Foo as default };`.
 *
 * `findExportedClassNames` accepted the compiled clause and reported
 * `'default'`, but the local-name resolver did not recognise it, so
 * `transformSource` returned the source with NO stamp. Every
 * default-exported class was therefore stamped under Vitest and stamped
 * nowhere in the real server — and since `FromModule` fails closed on an
 * unstamped caller, every policy naming one silently denied. It surfaced
 * as `eval` being unable to run a single statement in the live game
 * (`ScriptApi.compileSandboxed` is gated to `/lib/script/EvalScript`)
 * while all 19 of `EvalScript`'s own tests passed.
 *
 * The lesson these cases encode: test the transform against the source
 * the LOADER sees, not only the source the plugin sees.
 *
 * A `.js` test for the same reason as its sibling — the loader subsystem
 * is deliberately plain JS.
 */

import { describe, it, expect } from 'vitest';
import { transformSource } from '../transform.js';

const FILE =
  'file:///proj/packages/server/src/mud/lib/script/EvalScript.ts';

/** The `{ … }` argument of the injected stamp call, or null if unstamped. */
function stampFields(source) {
  const out = transformSource(source, FILE);
  const m = out.match(/stamp\(import\.meta\.url, \{ ([^}]*) \}\)/);
  return m ? m[1] : null;
}

describe('the auto-injected stamp — default exports', () => {
  it('raw TS: `export default class Foo`', () => {
    expect(
      stampFields('export default class Foo { bar() {} }\n'),
    ).toBe('default: Foo');
  });

  it('compiled: `export { Foo as default }` — the regression', () => {
    // What tsx emits for the declaration above, and what the Node
    // loader hook actually receives.
    expect(
      stampFields('class Foo { bar() {} }\nexport { Foo as default };\n'),
    ).toBe('default: Foo');
  });

  it('compiled: `export default Foo;`', () => {
    expect(
      stampFields('class Foo { bar() {} }\nexport default Foo;\n'),
    ).toBe('default: Foo');
  });

  it('a named export alongside the default keeps both', () => {
    expect(
      stampFields('class A {}\nclass B {}\nexport { A, B as default };\n'),
    ).toBe('A: A, default: B');
  });

  it('a re-exported default is NOT stamped here', () => {
    // Same rule the named-export path follows: a class is stamped at the
    // module that DECLARES it, never at one that forwards it — otherwise
    // one class would carry two module identities and `FromModule` would
    // mean whichever module happened to load first.
    expect(
      stampFields(`export { Foo as default } from './other';`),
    ).toBeNull();
  });

  it('a module with no exports at all gets no stamp call', () => {
    const src = 'const x = 1;\nconsole.log(x);\n';
    expect(transformSource(src, FILE)).toBe(src);
  });
});
