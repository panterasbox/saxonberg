/**
 * Escape battery — EVAL: jurisdiction-targeted execution. A
 * wire-parcel run QUARANTINES (circle scope — field dispatch denies
 * with receipts; scoped writes discard); a field-parcel run GOVERNS
 * (writes are real, but dispatch outside the parcel's extent denies).
 * No unscoped form exists. Fails without the `runScoped`/`runGoverned`
 * roots + the jurisdiction-bound branch in the dispatch check.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../../../../api/sandbox';
import { StuffApi } from '../../../../api/stuff';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { Idea } from '../../../stuff/Idea';
import { Stuff } from '../../../stuff/Stuff';
import { DiagnosticApi } from '../../../../api/diagnostics';

/*
 * ⚠ **20 s, not vitest's 5 s default.** Every sandbox test stands up a
 * circle and runs at least one session ceremony, which costs seconds —
 * so on a loaded full-suite run they time out in ones and twos while
 * passing in isolation, which reads as a flake and is really a budget.
 * The measurement and the argument for raising it per FILE rather than
 * globally live in `escape/round-trip.test.ts`.
 */
vi.setConfig({ testTimeout: 20_000 });


const SCOPE = '/home/eval-tester';
const EXTENT = '/domain/terminus';

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

describe('sandbox-escape: eval', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('a wire-parcel run is quarantined: field dispatch denies, with a receipt', async () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);
    const fieldThing = await StuffApi.create(() => new Pokeable());

    await expect(
      SandboxApi.runScoped(SCOPE, () => {
        expect(ExecutionContextApi.getCircleScope()).toBe(SCOPE);
        fieldThing.poke(); // the escape attempt
      })
    ).rejects.toThrow(SecurityError);
    expect(fieldThing.wasPoked()).toBe(false);

    await tick();
    const receipt = record.mock.calls.find(
      (c) => c[0].channel === 'sandbox.boundary'
    );
    expect(receipt).toBeDefined();
  });

  it('a wire-parcel run creates circle-born objects (run-and-discard shape)', async () => {
    const minted = await SandboxApi.runScoped(SCOPE, () =>
      StuffApi.create(() => new Pokeable())
    );
    expect(minted.getCircleScope()).toBe(SCOPE);
  });

  it('a governed run reaches INSIDE its extent and is denied OUTSIDE it', async () => {
    // In-jurisdiction receiver: a field object under the extent.
    const inside = await StuffApi.create(() => new Pokeable());
    Stuff._stampTemplatePath(inside, `${EXTENT}/plaza/fountain`);
    // Out-of-jurisdiction receiver: a field object elsewhere.
    const outside = await StuffApi.create(() => new Pokeable());
    Stuff._stampTemplatePath(outside, '/domain/narnia/lamppost');

    await SandboxApi.runGoverned(EXTENT, () => {
      expect(ExecutionContextApi.getJurisdictionBound()).toBe(EXTENT);
      // Real write inside the extent — the governed channel.
      inside.poke();
      // Reach outside the extent — denied.
      expect(() => outside.poke()).toThrow(SecurityError);
    });

    expect(inside.wasPoked()).toBe(true);
    expect(outside.wasPoked()).toBe(false);
  });

  it('a governed run cannot touch circle-scoped receivers either', async () => {
    const circleThing = await SandboxApi.runScoped(SCOPE, () =>
      StuffApi.create(() => new Pokeable())
    );
    await SandboxApi.runGoverned(EXTENT, () => {
      expect(() => circleThing.poke()).toThrow(SecurityError);
    });
  });
});
