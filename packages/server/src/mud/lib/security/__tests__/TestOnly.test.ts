/**
 * Tests for `@TestOnly` — the decorator that asks *what process is
 * this* rather than *who is calling*.
 *
 * ⭐ The two things worth pinning, and the second is the one that
 * decays silently:
 *
 *  1. Outside a test environment the member is **gone**, not denied —
 *     `typeof Api.member === 'undefined'`.
 *  2. The removal survives TypeScript's decorator emit. `__decorate`
 *     threads one descriptor through every decorator and then calls
 *     `Object.defineProperty` itself at the end, which is why the
 *     decorator only records the name and the withhold runs from the
 *     class's module tail. A refactor that moved the delete into the
 *     decorator would look right, pass a reading, and quietly put the
 *     method back — so the assertion here is on the OUTCOME after the
 *     tail has run.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { SecurityApi } from '../../../api/security';
import { TestOnly } from '../decorators';
import { WorldClockApi } from '../../../api/worldclock';

/** Run `fn` with this process looking like production. */
function asProduction<T>(fn: () => T): T {
  const saved = {
    vitest: process.env.VITEST,
    vitestWorker: process.env.VITEST_WORKER_ID,
    nodeEnv: process.env.NODE_ENV,
    world: process.env.SAXONBERG_TEST_WORLD,
  };
  delete process.env.VITEST;
  delete process.env.VITEST_WORKER_ID;
  process.env.NODE_ENV = 'production';
  delete process.env.SAXONBERG_TEST_WORLD;
  try {
    return fn();
  } finally {
    if (saved.vitest === undefined) delete process.env.VITEST;
    else process.env.VITEST = saved.vitest;
    if (saved.vitestWorker === undefined) delete process.env.VITEST_WORKER_ID;
    else process.env.VITEST_WORKER_ID = saved.vitestWorker;
    if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.nodeEnv;
    if (saved.world === undefined) delete process.env.SAXONBERG_TEST_WORLD;
    else process.env.SAXONBERG_TEST_WORLD = saved.world;
  }
}

describe('SecurityApi.isTestEnvironment', () => {
  it('is true under vitest', () => {
    expect(SecurityApi.isTestEnvironment()).toBe(true);
  });

  it('is false with no test signal at all', () => {
    expect(asProduction(() => SecurityApi.isTestEnvironment())).toBe(false);
  });

  it('⭐ a world the suite BOOTED says so explicitly', () => {
    // The wire runner scrubs `VITEST` from the server environment it
    // spawns, so a test world cannot be recognised by inheritance —
    // this variable is the whole mechanism.
    expect(
      asProduction(() => {
        process.env.SAXONBERG_TEST_WORLD = '1';
        return SecurityApi.isTestEnvironment();
      }),
    ).toBe(true);
  });

  it('honours NODE_ENV=test', () => {
    expect(
      asProduction(() => {
        process.env.NODE_ENV = 'test';
        return SecurityApi.isTestEnvironment();
      }),
    ).toBe(true);
  });
});

describe('@TestOnly', () => {
  it('⛔ outside a test environment the member DOES NOT EXIST', () => {
    class Subject {
      @TestOnly
      static seam(): string {
        return 'reached';
      }
      static ordinary(): string {
        return 'ordinary';
      }
    }
    // Before the tail runs, the method is still there — the decorator
    // only records.
    expect(typeof Subject.seam).toBe('function');

    asProduction(() => SecurityApi.decorateApiClass(Subject));

    expect(typeof (Subject as { seam?: unknown }).seam).toBe('undefined');
    expect('seam' in Subject).toBe(false);
    expect(Object.getOwnPropertyNames(Subject)).not.toContain('seam');
    // ⭐ and the class is otherwise untouched.
    expect(Subject.ordinary()).toBe('ordinary');
  });

  it('keeps the member in a test environment', () => {
    class Subject {
      @TestOnly
      static seam(): string {
        return 'reached';
      }
    }
    SecurityApi.decorateApiClass(Subject);
    expect(Subject.seam()).toBe('reached');
  });

  it('records what it withheld', () => {
    class Recorded {
      @TestOnly
      static gone(): void {}
    }
    asProduction(() => SecurityApi.decorateApiClass(Recorded));
    expect(SecurityApi.withheldTestOnlySeams()).toContain('Recorded.gone');
  });

  it('is idempotent — a second tail pass finds nothing left', () => {
    class Twice {
      @TestOnly
      static gone(): void {}
    }
    asProduction(() => {
      SecurityApi.decorateApiClass(Twice);
      SecurityApi.decorateApiClass(Twice);
    });
    const hits = SecurityApi.withheldTestOnlySeams().filter(
      (s) => s === 'Twice.gone',
    );
    expect(hits).toHaveLength(1);
  });

  it('⚠ refuses an instance method, because deleting one own descriptor would lie', () => {
    expect(() => {
      class Wrong {
        @TestOnly
        seam(): void {}
      }
      return Wrong;
    }).toThrow(/instance method/i);
  });
});

describe('WorldClockApi.advance is the first consumer', () => {
  it('exists here, because this IS a test environment', () => {
    expect(typeof WorldClockApi.advance).toBe('function');
  });

  it('⭐ and is MARKED, so a reviewer can tell scaffolding from the game', () => {
    // The marker is the point: `advance` is named like a game verb and
    // nothing else in its shape says otherwise. This is also the
    // assertion that fails if someone drops the decorator while the
    // method still works — which, in a test environment, everything
    // else would keep passing through.
    expect(SecurityApi.getTestOnlyMembers(WorldClockApi)).toContain(
      'advance',
    );
  });

  it('⚠ and the clock mutators that are NOT test seams are unmarked', () => {
    const marked = SecurityApi.getTestOnlyMembers(WorldClockApi);
    expect(marked?.has('getNow')).toBeFalsy();
    expect(marked?.has('after')).toBeFalsy();
  });
});

afterEach(() => {
  expect(SecurityApi.isTestEnvironment()).toBe(true);
});
