/**
 * Tests for `@TestOnly` — the decorator that asks *what process is
 * this* rather than *who is calling*.
 *
 * ⭐ The two things worth pinning, and the second is the one that
 * decays silently:
 *
 *  1. Outside a test environment the member REFUSES, and the refusal
 *     is worth reading — it names the seam, the three signals that
 *     would make a process a test environment, and what to reach for
 *     instead. ⚠ The first version deleted the property outright, which
 *     left the caller holding `TypeError: X.advance is not a function`:
 *     the strongest guarantee and the worst diagnostic.
 *  2. The substitution survives TypeScript's decorator emit.
 *     `__decorate` threads one descriptor through every decorator and
 *     then calls `Object.defineProperty` itself at the end, which is
 *     why the decorator only records the name and the withhold runs
 *     from the class's module tail. A refactor that moved it into the
 *     decorator would look right, pass a reading, and quietly put the
 *     live method back — so the assertion here is on the OUTCOME after
 *     the tail has run.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { SecurityApi } from '../../../api/security';
import { TestOnly } from '../decorators';
import { SecurityError } from '../errors';
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
  it('⛔ outside a test environment the member REFUSES', () => {
    class Subject {
      @TestOnly
      static seam(): string {
        return 'reached';
      }
      static ordinary(): string {
        return 'ordinary';
      }
    }
    // Before the tail runs the live method is still there — the
    // decorator only records.
    expect(Subject.seam()).toBe('reached');

    asProduction(() => SecurityApi.decorateApiClass(Subject));

    expect(() => Subject.seam()).toThrow(SecurityError);
    // ⭐ and the class is otherwise untouched.
    expect(Subject.ordinary()).toBe('ordinary');
  });

  it('⭐⭐ the refusal is WORTH READING — that is the point of it', () => {
    class Clocky {
      @TestOnly('Reach for the unit test instead.')
      static jump(): void {}
    }
    asProduction(() => SecurityApi.decorateApiClass(Clocky));

    let message = '';
    try {
      Clocky.jump();
    } catch (e) {
      message = (e as Error).message;
    }

    // names the seam
    expect(message).toContain('Clocky.jump');
    // says WHAT it is, not merely that something failed
    expect(message).toMatch(/TEST-ONLY seam/);
    // says what would make this a test environment — all three signals,
    // because a reader hitting this has no other way to find them
    expect(message).toContain('VITEST');
    expect(message).toContain('NODE_ENV=test');
    expect(message).toContain('SAXONBERG_TEST_WORLD=1');
    // ⭐ and the seam's OWN guidance, which is the half no generic
    // message can supply
    expect(message).toContain('Reach for the unit test instead.');
    expect(message).toContain('call-security.md');
  });

  it('⚠ a bare @TestOnly still refuses, just without the guidance line', () => {
    class Bare {
      @TestOnly
      static seam(): void {}
    }
    asProduction(() => SecurityApi.decorateApiClass(Bare));
    expect(() => Bare.seam()).toThrow(/Bare\.seam is a TEST-ONLY seam/);
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

  it('is idempotent — a second tail pass recognises its own stub', () => {
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

  it('⚠ the stub is not wrapped by the static-wrap pass', () => {
    // A body that only throws has nothing to gate, and a frame-pushing
    // shell around it would put the security framework in the stack of
    // every refusal for no reason.
    class Shelled {
      @TestOnly
      static gone(): void {}
    }
    asProduction(() => SecurityApi.decorateApiClass(Shelled));
    const fn = Shelled.gone as unknown as { _testOnlyWithheld?: boolean };
    expect(fn._testOnlyWithheld).toBe(true);
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
    expect(SecurityApi.getTestOnlyMembers(WorldClockApi)?.has('advance')).toBe(
      true,
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
