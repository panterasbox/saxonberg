/**
 * StudioLogic.describeClass — the gated composition read (P1).
 *
 * Covers the three load-bearing properties:
 *   1. Multi-mixin join — every `@authorable` field of the effective mixin
 *      set surfaces with a `typeShape`; a `@runtimeState` persistent field
 *      (ReservedMixin.reserves) is absent.
 *   2. Resolution chain — a field whose effective value comes from the
 *      instance's zone `lookupField` reports `valueSource: 'resolution-chain'`.
 *   3. Anti-spoof — a null-actor context denies; there is no `actor`
 *      parameter to substitute.
 *
 * Classification comes from the source scan of the mixin declarations (the
 * P0 `@authorable`/`@runtimeState` markers), never a caller-passed list;
 * the backing class is stubbed via `StuffApi.loadClassByPath`. No Mongo, no
 * live world.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StudioApi, StudioError } from '../../../api/studio';
import { StuffApi } from '../../../api/stuff';
import { AccessApi } from '../../../api/access';
import { ExecutionContextApi } from '../../../api/execution-context';
import { Idea } from '../../../lib/stuff/Idea';
import { NamedMixin } from '../../../lib/description/Named';
import { VisibleMixin } from '../../../lib/description/Visible';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ReservedMixin } from '../../../lib/reserve';
import {
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';

// A real multi-mixin composition: Named + Visible + Detailed (authorable
// fields) over Reserved (whose `reserves` field is @runtimeState).
class StudioTestThing extends ReservedMixin(
  DetailedMixin(VisibleMixin(NamedMixin(Idea)))
) {}

const CLASS_PATH = '/obj/StudioTestThing';
const AUTHOR = { getTemplatePath: () => '/obj/Avatar/alice' } as unknown as Stuff;

function stubAuthorGateOpen(): void {
  vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(AUTHOR);
  vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(true);
}

beforeEach(() => {
  StuffApi.clearAll();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('StudioLogic.describeClass — multi-mixin join', () => {
  it('surfaces every authorable field with a typeShape and omits runtime state', async () => {
    stubAuthorGateOpen();
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(StudioTestThing);

    const instance = makeStuffAtPath(
      () => new StudioTestThing(),
      CLASS_PATH
    ) as unknown as Stuff & { setName: (v: string) => void; setShortDescription: (v: string) => void };
    instance.setName('Alice');
    instance.setShortDescription('a curious contraption');

    const desc = await StudioApi.describeClass(CLASS_PATH);

    expect(desc.classPath).toBe(CLASS_PATH);
    expect(desc.mixins).toEqual(
      expect.arrayContaining([
        'ReservedMixin',
        'DetailedMixin',
        'VisibleMixin',
        'NamedMixin',
      ])
    );

    const byName = new Map(desc.fields.map((f) => [f.name, f]));

    // Every authorable field is present, each with a non-empty typeShape.
    for (const field of [
      'name',
      'surname',
      'nameSuffix',
      'honorific',
      'alternateNames',
      'shortDescription',
      'longDescription',
      'illustration',
      'details',
    ]) {
      const d = byName.get(field);
      expect(d, `expected authorable field ${field}`).toBeDefined();
      expect(typeof d!.typeShape).toBe('string');
      expect(d!.typeShape.length).toBeGreaterThan(0);
    }

    // The instruction field is classified as such; a property is not.
    expect(byName.get('details')!.kind).toBe('instruction');
    expect(byName.get('name')!.kind).toBe('property');

    // The @runtimeState persistent field is ABSENT.
    expect(byName.has('reserves')).toBe(false);

    // Effective values read off the live instance.
    const name = byName.get('name')!;
    expect(name.typeShape).toBe('string');
    expect(name.defaultValue).toBe('Alice');
    expect(name.valueSource).toBe('instance');
    // Field attribution points at the declaring mixin.
    expect(name.mixin).toBe('NamedMixin');
    expect(byName.get('shortDescription')!.mixin).toBe('VisibleMixin');
  });
});

describe('StudioLogic.describeClass — resolution chain', () => {
  it("reports valueSource 'resolution-chain' for a zone-supplied default", async () => {
    stubAuthorGateOpen();
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(StudioTestThing);

    // A representative instance with no own longDescription, whose zone
    // supplies one via the engine's lookupField walk. Fake to control the
    // chain without a live world.
    const zone = {
      lookupField: async (f: string) =>
        f === 'longDescription' ? 'inherited from the parlor' : null,
    };
    const fakeInstance = {
      getZone: () => zone,
    } as unknown as Stuff;
    vi.spyOn(StuffApi, 'findByTemplatePath').mockReturnValue(fakeInstance);

    const desc = await StudioApi.describeClass(CLASS_PATH, '/domain/parlor/thing');
    const byName = new Map(desc.fields.map((f) => [f.name, f]));

    const longDesc = byName.get('longDescription')!;
    expect(longDesc.valueSource).toBe('resolution-chain');
    expect(longDesc.defaultValue).toBe('inherited from the parlor');

    // A field the zone does NOT supply is not mis-attributed to the chain.
    expect(byName.get('name')!.valueSource).not.toBe('resolution-chain');
  });
});

describe('StudioLogic.describeClass — anti-spoof', () => {
  it('denies a null-actor context and exposes no actor parameter', async () => {
    // No stamped author → getActingAuthor is null → the gate fails closed.
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    const isAuthor = vi
      .spyOn(AccessApi, 'isAuthor')
      .mockImplementation(async (s) => s != null);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(StudioTestThing);

    await expect(StudioApi.describeClass(CLASS_PATH)).rejects.toMatchObject({
      code: 'denied',
    });
    await expect(StudioApi.describeClass(CLASS_PATH)).rejects.toBeInstanceOf(
      StudioError
    );
    // The gate was consulted with the context-derived (null) actor — NOT
    // any caller-supplied principal. The signature is
    // `describeClass(classPath, contextPath?)`: there is no actor argument
    // to substitute, so a caller holding a privileged Avatar reference
    // (AUTHOR, in scope) cannot pass it. Even an extra positional arg is
    // ignored — the gate still denied on the null context actor.
    expect(isAuthor).toHaveBeenCalledWith(null);
    expect(isAuthor).not.toHaveBeenCalledWith(AUTHOR);
    await expect(
      (StudioApi.describeClass as unknown as (...a: unknown[]) => Promise<unknown>)(
        CLASS_PATH,
        undefined,
        AUTHOR
      )
    ).rejects.toMatchObject({ code: 'denied' });
  });
});
