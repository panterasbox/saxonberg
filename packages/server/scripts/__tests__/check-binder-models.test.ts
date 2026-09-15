/**
 * The binder-model gate, proving it FIRES.
 *
 * ⚠ It reported zero violations the moment it was written, which is the
 * shape of a gate that ships broken and silently passes — a failure this
 * repo has had before. So these fixtures assert the positive: a model
 * missing a bound arg is FOUND, and the three shapes that are legitimately
 * absent are not.
 */

import { describe, it, expect } from 'vitest';
import { scanTest } from '../check-binder-models';

/** `ConsignController` always binds `shelf` (optional, but defaulted). */
const bound = new Map([['ConsignController', new Set(['shelf'])]]);

const test = (body: string): string =>
  `const c = new ConsignController();\n${body}\n`;

describe('check-binder-models', () => {
  it('⭐ FINDS a hand-built model missing an arg the view always binds', () => {
    const v = scanTest(
      'x.test.ts',
      test(`await c.execute({ thing: 'gin', ask: '5' }, ctx);`),
      bound,
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.controller).toBe('ConsignController');
    expect(v[0]?.missing).toEqual(['shelf']);
  });

  it('passes a model that carries it', () => {
    const v = scanTest(
      'x.test.ts',
      test(`await c.execute({ thing: 'gin', ask: '5', shelf: s }, ctx);`),
      bound,
    );
    expect(v).toHaveLength(0);
  });

  it('⚠ does not guess through a spread — it could carry anything', () => {
    const v = scanTest(
      'x.test.ts',
      test(`await c.execute({ ...base, thing: 'gin' }, ctx);`),
      bound,
    );
    expect(v).toHaveLength(0);
  });

  it('ignores a controller whose view binds nothing', () => {
    const v = scanTest(
      'x.test.ts',
      `const c = new LookController();\nawait c.execute({}, ctx);\n`,
      bound,
    );
    expect(v).toHaveLength(0);
  });

  it('ignores a file that constructs no controller at all', () => {
    expect(scanTest('x.test.ts', `await thing.execute({}, ctx);`, bound)).toHaveLength(0);
  });
});
