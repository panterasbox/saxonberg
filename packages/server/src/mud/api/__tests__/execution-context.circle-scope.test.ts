/**
 * The sandbox scope taint on the ExecutionContext (Wave 1):
 * frame-0 metadata carriage, the set-once establish seam, and the
 * omni sentinel. Tests are frame-mutator-allowlisted (*.test.ts), so
 * they plant scoped roots directly.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../execution-context';
import { SecurityError } from '../../lib/security/errors';

const SCOPE = '/home/test-player';

afterEach(() => {
  ExecutionContextApi._clearForTesting();
});

describe('getCircleScope', () => {
  it('is null outside any context', () => {
    expect(ExecutionContextApi.getCircleScope()).toBeNull();
  });

  it('is null under an unscoped root', () => {
    ExecutionContextApi.runRoot(null, 'test', () => {
      expect(ExecutionContextApi.getCircleScope()).toBeNull();
    });
  });

  it('reads the scope planted on the root, at any depth', () => {
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
        // nested non-root frames don't disturb the frame-0 read
        ExecutionContextApi.run(null, null, 'inner', undefined, () => {
          expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
        });
      },
      { circleScope: SCOPE }
    );
  });

  it('carries the omni sentinel distinctly from null', () => {
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        expect(ExecutionContextApi.getCircleScope()).toBe(OMNI_SCOPE);
      },
      { circleScope: OMNI_SCOPE }
    );
  });

  it('survives async boundaries (ALS carriage)', async () => {
    await ExecutionContextApi.runRootGuarded(
      null,
      'test',
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
      },
      'rethrow',
      { circleScope: SCOPE }
    );
  });

  it('a fresh root replaces the scope (no leakage between trees)', () => {
    ExecutionContextApi.runRoot(
      null,
      'outer',
      () => {
        ExecutionContextApi.runRoot(null, 'inner', () => {
          expect(ExecutionContextApi.getCircleScope()).toBeNull();
        });
        expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
      },
      { circleScope: SCOPE }
    );
  });
});

describe('establishCircleScope', () => {
  it('establishes on an unscoped root; readable downstream', () => {
    ExecutionContextApi.runRoot(null, 'test', () => {
      expect(ExecutionContextApi.getCircleScope()).toBeNull();
      ExecutionContextApi.establishCircleScope(SCOPE);
      expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
      ExecutionContextApi.run(null, null, 'inner', undefined, () => {
        expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
      });
    });
  });

  it('throws on re-establish (set-once)', () => {
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        expect(() =>
          ExecutionContextApi.establishCircleScope('/home/other')
        ).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
  });

  it('throws outside any frame context', () => {
    expect(() => ExecutionContextApi.establishCircleScope(SCOPE)).toThrow(
      SecurityError
    );
  });
});

describe('getJurisdictionBound', () => {
  it('is null by default and reads the planted bound', () => {
    expect(ExecutionContextApi.getJurisdictionBound()).toBeNull();
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        expect(ExecutionContextApi.getJurisdictionBound()).toBe(
          '/world/terminus'
        );
        expect(ExecutionContextApi.getCircleScope()).toBeNull();
      },
      { jurisdictionBound: '/world/terminus' }
    );
  });
});
