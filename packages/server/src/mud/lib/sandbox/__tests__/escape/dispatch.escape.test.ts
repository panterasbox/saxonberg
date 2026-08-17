/**
 * Escape battery — DISPATCH: the Layer-4 proxy check.
 *
 * Adversarial shape: circle context calls a mutator on a live field
 * object via a smuggled ref (and the reverse: field context pokes a
 * circle object). Asserts `SecurityError` AND the `sandbox.boundary`
 * diagnostics receipt carrying the scope pair. Fails without the
 * `#securityGate` boundary check.
 *
 * Scope is minted via the test-allowlisted `runRoot(…, {circleScope})`
 * path (no crossing exists yet at this wave); the crossing waves re-run
 * this battery against genuine crossings.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { Idea } from '../../../stuff/Idea';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { SandboxApi } from '../../../../api/sandbox';

/*
 * ⚠ **20 s, not vitest's 5 s default.** Every sandbox test stands up a
 * circle and runs at least one session ceremony, which costs seconds —
 * so on a loaded full-suite run they time out in ones and twos while
 * passing in isolation, which reads as a flake and is really a budget.
 * The measurement and the argument for raising it per FILE rather than
 * globally live in `escape/round-trip.test.ts`.
 */
vi.setConfig({ testTimeout: 20_000 });


const SCOPE = '/home/escape-tester';

class Pokeable extends Idea {
  private poked = false;
  public poke(): void {
    this.poked = true;
  }
  public wasPoked(): boolean {
    return this.poked;
  }
}

async function tick(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('sandbox-escape: dispatch', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('circle context is denied a mutator on a smuggled field ref', async () => {
    const fieldThing = await StuffApi.create(() => new Pokeable());
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() => fieldThing.poke()).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
    expect(fieldThing.wasPoked()).toBe(false);
  });

  it('field context is denied a poke on a circle object (reverse direction)', async () => {
    const circleThing = await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      () => StuffApi.create(() => new Pokeable()),
      'rethrow',
      { circleScope: SCOPE }
    );
    expect(() => circleThing!.poke()).toThrow(SecurityError);
  });

  it('same-scope dispatch passes on both sides of the boundary', async () => {
    const fieldThing = await StuffApi.create(() => new Pokeable());
    fieldThing.poke();
    expect(fieldThing.wasPoked()).toBe(true);

    await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      async () => {
        const circleThing = await StuffApi.create(() => new Pokeable());
        circleThing.poke();
        expect(circleThing.wasPoked()).toBe(true);
      },
      'rethrow',
      { circleScope: SCOPE }
    );
  });

  it('the system omni root passes everywhere', async () => {
    const fieldThing = await StuffApi.create(() => new Pokeable());
    const circleThing = await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      () => StuffApi.create(() => new Pokeable()),
      'rethrow',
      { circleScope: SCOPE }
    );
    ExecutionContextApi.runRoot(
      null,
      'maintenance',
      () => {
        fieldThing.poke();
        circleThing!.poke();
        expect(fieldThing.wasPoked()).toBe(true);
        expect(circleThing!.wasPoked()).toBe(true);
      },
      { circleScope: OMNI_SCOPE }
    );
  });

  it('ApiLogic singletons are boundary-exempt (infrastructure)', () => {
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        // Forwards through the SandboxLogic ApiLogic singleton — a
        // field-resident proxy dispatch that must pass via Decision J.
        expect(SandboxApi.sessionForScope(SCOPE)).toBeNull();
      },
      { circleScope: SCOPE }
    );
  });

  it('a denial emits the sandbox.boundary receipt with the scope pair', async () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);
    const fieldThing = await StuffApi.create(() => new Pokeable());
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() => fieldThing.poke()).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
    await tick();
    expect(record).toHaveBeenCalled();
    const receipt = record.mock.calls[0]![0];
    expect(receipt.channel).toBe('sandbox.boundary');
    expect(receipt.message).toContain('poke');
    expect(receipt.message).toContain(SCOPE);
    expect(receipt.message).toContain('field');
  });
});
