/**
 * StudioLogic.describeClass — the gated composition read.
 *
 * Covers the three load-bearing properties:
 *   1. Multi-mixin join — every `authorable` field of the effective mixin
 *      set surfaces with a `typeShape`; a `runtimeState` persistent field
 *      (ReservedMixin.reserves) is absent.
 *   2. Resolution chain — a field whose effective value comes from the
 *      instance's zone `lookupField` reports `valueSource: 'resolution-chain'`.
 *   3. Anti-spoof — a null-actor context denies; there is no `actor`
 *      parameter to substitute.
 *
 * Classification comes from the source scan of the mixin declarations (the
 * `authorable`/`runtimeState` entries in `fieldMeta`), never a
 * caller-passed list;
 * the backing class is stubbed via `StuffApi.loadClassByPath`. No Mongo, no
 * live world.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { StudioApi, StudioError } from '../../../api/studio';
import { StuffApi } from '../../../api/stuff';
import { HelpApi } from '../../../api/help';
import { AccessApi } from '../../../api/access';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ProvenanceApi } from '../../../api/provenance';
import { SourceTreeApi } from '../../../api/source-tree';
import { HotReloadApi } from '../../../api/hot-reload';
import { TemplateApi, TemplateError } from '../../../api/template';
import { Template } from '../../../lib/stuff/Template';
import { Blueprint } from '../../../lib/studio/Blueprint';
import type BlueprintCatalogue from '../../BlueprintCatalogue';
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
// fields) over Reserved (whose `reserves` field is runtimeState).
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

    // The runtimeState persistent field is ABSENT.
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

// ---- publishBlueprint (catalog write) -----------------------------------

/** A minimal in-memory catalogue standing in for the singleton. */
function makeFakeCatalogue(): BlueprintCatalogue {
  const byId = new Map<string, Blueprint>();
  const bySig = new Map<string, string>();
  return {
    findBySignature: (sig: string) => {
      const id = bySig.get(sig);
      return id ? (byId.get(id) ?? null) : null;
    },
    getBlueprint: (id: string) => byId.get(id) ?? null,
    allBlueprints: () => [...byId.values()],
    upsert: (bp: Blueprint) => {
      byId.set(bp.getBlueprintId(), bp);
      if (bp.getSignature()) bySig.set(bp.getSignature(), bp.getBlueprintId());
    },
  } as unknown as BlueprintCatalogue;
}

describe('StudioLogic.publishBlueprint — signature dedup + durable id', () => {
  beforeEach(() => {
    vi.spyOn(Blueprint.prototype, 'save').mockResolvedValue(undefined);
    vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined);
  });

  it('reuses the existing blueprintId on a signature collision (rename)', async () => {
    stubAuthorGateOpen();
    const catalogue = makeFakeCatalogue();
    vi.spyOn(StuffApi, 'findByTemplatePath').mockReturnValue(
      catalogue as unknown as never
    );

    const first = await StudioApi.publishBlueprint({
      name: 'Coin',
      kind: 'concrete',
      baseClass: 'Thing',
      mixinNames: ['GlobbableMixin'],
    });
    expect(first.disposition).toBe('committed');
    const id = first.blueprintId!;
    expect(id).toBeTruthy();

    // Same base + mixin set, DIFFERENT name → same durable id (dedup on sig).
    const second = await StudioApi.publishBlueprint({
      name: 'Renamed Coin',
      kind: 'concrete',
      baseClass: 'Thing',
      mixinNames: ['GlobbableMixin'],
    });
    expect(second.disposition).toBe('committed');
    expect(second.blueprintId).toBe(id);

    // The catalogue holds ONE blueprint; its name changed, id + signature did not.
    expect(catalogue.allBlueprints()).toHaveLength(1);
    const bp = catalogue.getBlueprint(id)!;
    expect(bp.getName()).toBe('Renamed Coin');
    expect(bp.getBlueprintId()).toBe(id);
    expect(bp.getSignature()).toBe(
      Blueprint.signatureFromParts('Thing', ['GlobbableMixin'])
    );
  });

  it('mixin-order-independent: the same set collides regardless of order', async () => {
    stubAuthorGateOpen();
    const catalogue = makeFakeCatalogue();
    vi.spyOn(StuffApi, 'findByTemplatePath').mockReturnValue(
      catalogue as unknown as never
    );

    const a = await StudioApi.publishBlueprint({
      name: 'A',
      kind: 'composition',
      baseClass: 'Idea',
      mixinNames: ['NamedMixin', 'VisibleMixin'],
    });
    const b = await StudioApi.publishBlueprint({
      name: 'B',
      kind: 'composition',
      baseClass: 'Idea',
      mixinNames: ['VisibleMixin', 'NamedMixin'],
    });
    expect(b.blueprintId).toBe(a.blueprintId);
    expect(catalogue.allBlueprints()).toHaveLength(1);
  });
});

describe('StudioLogic.publishBlueprint — trust + attribution', () => {
  beforeEach(() => {
    vi.spyOn(Blueprint.prototype, 'save').mockResolvedValue(undefined);
  });

  it('denies a non-author gracefully (disposition, not a throw)', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    const record = vi
      .spyOn(ProvenanceApi, 'recordAuthoring')
      .mockResolvedValue(undefined);

    const out = await StudioApi.publishBlueprint({
      name: 'X',
      kind: 'composition',
      baseClass: 'Idea',
      mixinNames: [],
    });
    expect(out.disposition).toBe('denied');
    expect(out.blueprintId).toBeUndefined();
    // A denied publish records no authoring row.
    expect(record).not.toHaveBeenCalled();
  });

  it('records an AuthoringEvent against the synthetic blueprint path', async () => {
    stubAuthorGateOpen();
    const catalogue = makeFakeCatalogue();
    vi.spyOn(StuffApi, 'findByTemplatePath').mockReturnValue(
      catalogue as unknown as never
    );
    const record = vi
      .spyOn(ProvenanceApi, 'recordAuthoring')
      .mockResolvedValue(undefined);

    const out = await StudioApi.publishBlueprint({
      name: 'Attributed',
      kind: 'composition',
      baseClass: 'Idea',
      mixinNames: ['NamedMixin'],
    });
    expect(out.disposition).toBe('committed');
    expect(record).toHaveBeenCalledWith({
      path: `/obj/BlueprintCatalogue/${out.blueprintId}`,
    });
    // There is no actor parameter — the anti-spoof contract (author derives
    // from context inside ProvenanceLogic, never a publishBlueprint arg).
  });
});

// ---- scaffoldClass (new-class scaffold, author-tier) --------------------

describe('StudioLogic.scaffoldClass', () => {
  it('composes a source module with resolved imports + the extends clause', async () => {
    stubAuthorGateOpen();
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true); // wizard → no draft

    const out = await StudioApi.scaffoldClass({
      name: 'ScaffoldCoin',
      baseClass: 'Idea',
      mixinNames: ['GlobbableMixin'],
    });

    expect(out.targetPath).toBe('/obj/ScaffoldCoin.ts');
    // Import resolution: the base + mixin are imported by name (path resolved
    // from the source scan; assert the identifier, not the exact file path).
    expect(out.source).toContain('import { Idea } from');
    expect(out.source).toContain('import { GlobbableMixin } from');
    // No `.js` extension in a generated import.
    expect(out.source).not.toMatch(/from '[^']*\.js'/);
    // The composition: `export class Name extends Mixin(Base) {}`.
    expect(out.source).toContain(
      'export class ScaffoldCoin extends GlobbableMixin(Idea) {}'
    );
    // A wizard gets no draft path (they can commit directly).
    expect(out.draftPath).toBeUndefined();
  });

  it('emits a DEFAULT import for a default-exported base class', async () => {
    stubAuthorGateOpen();
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    // `Thing` is `export default class Thing` — the scaffold must emit a
    // default import (`import Thing from ...`), not a named one.
    const out = await StudioApi.scaffoldClass({
      name: 'ThingSub',
      baseClass: 'Thing',
      mixinNames: [],
    });
    expect(out.source).toMatch(/import Thing from '[^']+';/);
    expect(out.source).not.toContain('import { Thing }');
    expect(out.source).toContain('export class ThingSub extends Thing {}');
  });

  it('resolves a concrete default-exported class as the base (Coin)', async () => {
    stubAuthorGateOpen();
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    // "Author a new kind from this →" on the Coin blueprint makes Coin the
    // SUPERCLASS: `class MyCoin extends Coin {}`. Coin is `export default
    // class Coin`, so a DEFAULT import must be emitted (not a named one).
    const out = await StudioApi.scaffoldClass({
      name: 'MyCoin',
      baseClass: 'Coin',
      mixinNames: [],
    });
    expect(out.source).toMatch(/import Coin from '[^']+';/);
    expect(out.source).not.toContain('import { Coin }');
    expect(out.source).not.toMatch(/from '[^']*\.js'/);
    expect(out.source).toContain('export class MyCoin extends Coin {}');
  });

  it('resolves a concrete class base + composes added mixins over it', async () => {
    stubAuthorGateOpen();
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    // PaymentCard is `export default class PaymentCard`; adding a mixin over it
    // composes `NamedMixin(PaymentCard)`.
    const out = await StudioApi.scaffoldClass({
      name: 'GoldCard',
      baseClass: 'PaymentCard',
      mixinNames: ['NamedMixin'],
    });
    expect(out.source).toMatch(/import PaymentCard from '[^']+';/);
    expect(out.source).toContain('import { NamedMixin } from');
    expect(out.source).toContain(
      'export class GoldCard extends NamedMixin(PaymentCard) {}'
    );
  });

  it('right-folds multiple mixins outermost-first', async () => {
    stubAuthorGateOpen();
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    const out = await StudioApi.scaffoldClass({
      name: 'MultiThing',
      baseClass: 'Idea',
      mixinNames: ['NamedMixin', 'VisibleMixin'],
    });
    expect(out.source).toContain(
      'export class MultiThing extends NamedMixin(VisibleMixin(Idea)) {}'
    );
  });

  it('hands a non-wizard the reserved /home/<self>/drafts path (not persisted)', async () => {
    stubAuthorGateOpen(); // AUTHOR templatePath = /obj/Avatar/alice
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    const out = await StudioApi.scaffoldClass({
      name: 'DraftThing',
      baseClass: 'Idea',
      mixinNames: [],
    });
    expect(out.targetPath).toBe('/obj/DraftThing.ts');
    expect(out.draftPath).toBe('/home/alice/drafts/DraftThing.ts');
    expect(out.source).toContain('export class DraftThing extends Idea {}');
  });

  it('rejects an invalid class name', async () => {
    stubAuthorGateOpen();
    await expect(
      StudioApi.scaffoldClass({
        name: 'not-pascal',
        baseClass: 'Idea',
        mixinNames: [],
      })
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('denies a non-author (null context actor)', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    await expect(
      StudioApi.scaffoldClass({
        name: 'Nope',
        baseClass: 'Idea',
        mixinNames: [],
      })
    ).rejects.toMatchObject({ code: 'denied' });
  });
});

// ---- commitClass (wizard-gated source commit) ---------------------------

/** Open the wizard source-write gate on the context-derived actor. */
function stubWizardGateOpen(): void {
  vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(AUTHOR);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'resolveSourceFolderZone').mockResolvedValue(null);
}

/**
 * A real, cleaned-up temp source path under the mudlib root (the CmsRoutes
 * source-write harness). Returns the CMS-relative path + the absolute file +
 * a cleanup fn.
 */
function tempSourceTarget(): {
  cmsPath: string;
  absFile: string;
  cleanup: () => void;
} {
  const sandbox = SourceTreeApi.getSandboxRoot();
  const relDir = 'studio-commit-test';
  const absDir = path.join(sandbox, 'server', 'src', 'mud', relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const fileName = `Commit${Date.now()}.ts`;
  return {
    cmsPath: `/${relDir}/${fileName}`,
    absFile: path.join(absDir, fileName),
    cleanup: () => fs.rmSync(absDir, { recursive: true, force: true }),
  };
}

describe('StudioLogic.commitClass — dispositions + ordering', () => {
  it('non-wizard → denied, no file written, no authoring recorded', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(AUTHOR);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    const writeSpy = vi.spyOn(SourceTreeApi, 'write');
    const record = vi
      .spyOn(ProvenanceApi, 'recordAuthoring')
      .mockResolvedValue(undefined);

    const out = await StudioApi.commitClass({
      targetPath: '/obj/Denied.ts',
      source: 'export class Denied {}\n',
    });

    expect(out.disposition).toBe('denied');
    expect(out.classPath).toBeUndefined();
    expect(writeSpy).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('null-actor context → denied, records nothing (anti-spoof)', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    vi.spyOn(AccessApi, 'isWizard').mockImplementation(async (s) => s != null);
    const writeSpy = vi.spyOn(SourceTreeApi, 'write');
    const record = vi
      .spyOn(ProvenanceApi, 'recordAuthoring')
      .mockResolvedValue(undefined);

    const out = await StudioApi.commitClass({
      targetPath: '/obj/NullActor.ts',
      source: 'export class NullActor {}\n',
    });
    expect(out.disposition).toBe('denied');
    expect(writeSpy).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    // No `actor` parameter exists to substitute a privileged principal: the
    // signature is `commitClass(input)`, and even a stray extra positional
    // arg is ignored — the gate still denied on the null context actor.
    const out2 = await (
      StudioApi.commitClass as unknown as (...a: unknown[]) => Promise<{
        disposition: string;
      }>
    )({ targetPath: '/obj/NullActor2.ts', source: 'x' }, AUTHOR);
    expect(out2.disposition).toBe('denied');
  });

  it('wizard → committed + reloaded:true, file written, authoring recorded', async () => {
    stubWizardGateOpen();
    const { cmsPath, absFile, cleanup } = tempSourceTarget();
    const reload = vi
      .spyOn(HotReloadApi, 'reload')
      .mockResolvedValue(undefined as never);
    const record = vi
      .spyOn(ProvenanceApi, 'recordAuthoring')
      .mockResolvedValue(undefined);
    const source = 'export class CommitOk {}\n';
    try {
      const out = await StudioApi.commitClass({ targetPath: cmsPath, source });
      expect(out.disposition).toBe('committed');
      expect(out.classPath).toBe(cmsPath);
      expect(out.reloaded).toBe(true); // the client's follow-on gate
      expect(fs.readFileSync(absFile, 'utf8')).toBe(source);
      expect(reload).toHaveBeenCalledWith(absFile);
      // Attribution against the source path, author from context (no param).
      expect(record).toHaveBeenCalledWith({ path: cmsPath });
    } finally {
      cleanup();
    }
  });

  it('compile failure → committed + reloaded:false (persisted-but-not-live)', async () => {
    stubWizardGateOpen();
    const { cmsPath, absFile, cleanup } = tempSourceTarget();
    vi.spyOn(HotReloadApi, 'reload').mockRejectedValue(
      new Error('TS2304: Cannot find name')
    );
    vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined);
    try {
      const out = await StudioApi.commitClass({
        targetPath: cmsPath,
        source: 'export class Broken extends Nope {}\n',
      });
      expect(out.disposition).toBe('committed'); // NOT a throw / 500
      expect(out.reloaded).toBe(false); // ordering gate stays closed
      expect(out.reloadDetail).toContain('TS2304');
      // The file is persisted even though it didn't go live.
      expect(fs.existsSync(absFile)).toBe(true);
    } finally {
      cleanup();
    }
  });
});

// ---- createTemplate (act #1 — instantiate a NEW content template) -------

describe('StudioLogic.createTemplate', () => {
  it('creates a template at a fresh path (committed) with the right class + data', async () => {
    stubAuthorGateOpen();
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null); // fresh path
    const save = vi
      .spyOn(TemplateApi, 'saveTemplate')
      .mockResolvedValue('mongo-id');

    const out = await StudioApi.createTemplate({
      path: '/domain/parlor/my-coin',
      classPath: '/obj/Coin',
      data: { name: 'My Coin', denomination: 5 },
    });

    expect(out.disposition).toBe('committed');
    expect(out.path).toBe('/domain/parlor/my-coin');
    expect(out.message).toBeUndefined();
    // The class + data were passed straight to the saveTemplate chokepoint.
    expect(save).toHaveBeenCalledWith('/domain/parlor/my-coin', '/obj/Coin', {
      name: 'My Coin',
      denomination: 5,
    });
  });

  it('refuses an existing path (denied, CREATE-only) without writing', async () => {
    stubAuthorGateOpen();
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      {} as unknown as Template
    ); // already exists
    const save = vi.spyOn(TemplateApi, 'saveTemplate').mockResolvedValue('x');

    const out = await StudioApi.createTemplate({
      path: '/domain/parlor/existing',
      classPath: '/obj/Coin',
      data: {},
    });

    expect(out.disposition).toBe('denied');
    expect(out.message).toContain('already exists');
    expect(out.path).toBeUndefined();
    expect(save).not.toHaveBeenCalled();
  });

  it('surfaces the code-field gate as a graceful denied (not a 500)', async () => {
    stubAuthorGateOpen();
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    // A non-wizard setting `class` trips the wizard-lockdown at the
    // saveTemplate chokepoint — a TemplateError, surfaced as denied.
    vi.spyOn(TemplateApi, 'saveTemplate').mockRejectedValue(
      new TemplateError(
        'only a wizard may set executable code-naming field(s) [class] on a content template'
      )
    );

    const out = await StudioApi.createTemplate({
      path: '/domain/parlor/gated',
      classPath: '/obj/Coin',
      data: {},
    });

    expect(out.disposition).toBe('denied');
    expect(out.message).toContain('wizard');
  });

  it('propagates a non-TemplateError (a real failure is a 500, not denied)', async () => {
    stubAuthorGateOpen();
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    vi.spyOn(TemplateApi, 'saveTemplate').mockRejectedValue(
      new Error('mongo is down')
    );
    await expect(
      StudioApi.createTemplate({
        path: '/domain/parlor/boom',
        classPath: '/obj/Coin',
        data: {},
      })
    ).rejects.toThrow('mongo is down');
  });

  it('denies a non-author (null context actor) and never writes', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    const save = vi.spyOn(TemplateApi, 'saveTemplate').mockResolvedValue('x');
    await expect(
      StudioApi.createTemplate({
        path: '/domain/parlor/nope',
        classPath: '/obj/Coin',
        data: {},
      })
    ).rejects.toMatchObject({ code: 'denied' });
    expect(save).not.toHaveBeenCalled();
  });
});

// ---- listMixins (palette + base implied-mixin sets) ---------------------

describe('StudioLogic.listMixins — bases with implied mixin sets', () => {
  it('returns bases with non-empty impliedMixins for a rich base (Character)', async () => {
    stubAuthorGateOpen();
    const palette = await StudioApi.listMixins();

    // The flat pickable list is unchanged: base entries + registry mixins.
    expect(Array.isArray(palette.mixins)).toBe(true);
    expect(palette.mixins.some((m) => m.name === 'Idea' && m.kind === 'base')).toBe(
      true
    );
    expect(palette.mixins.some((m) => m.kind === 'mixin')).toBe(true);

    // Every offered base is present in `bases`.
    const byName = new Map(palette.bases.map((b) => [b.name, b]));
    for (const base of ['Idea', 'Thing', 'Location', 'Character', 'Creature', 'Agent']) {
      expect(byName.has(base), `expected base ${base}`).toBe(true);
    }

    // Character is a rich composition → a non-empty implied mixin set, deduped.
    const character = byName.get('Character')!;
    expect(character.impliedMixins.length).toBeGreaterThan(0);
    expect(new Set(character.impliedMixins).size).toBe(
      character.impliedMixins.length
    );
    expect(character.classPath).toContain('/lib/character/Character');

    // Idea is the bare base → an empty implied set (no mixins on it).
    expect(byName.get('Idea')!.impliedMixins).toEqual([]);
  });

  it('enriches mixin entries with a one-line summary from the source scan', async () => {
    stubAuthorGateOpen();
    const palette = await StudioApi.listMixins();

    const byName = new Map(palette.mixins.map((m) => [m.name, m]));
    // A well-documented mixin surfaces its concept comment's first sentence.
    const globbable = byName.get('GlobbableMixin');
    expect(globbable?.kind).toBe('mixin');
    expect(globbable?.summary).toBeTruthy();
    expect(globbable!.summary!.toLowerCase()).toContain('fungible');
    // The summary is a single line — no gutter asterisks, no @tags leaked.
    expect(globbable!.summary).not.toContain('*');
    expect(globbable!.summary).not.toContain('@');

    // Base entries carry no summary (help is a mixin-palette concern).
    expect(byName.get('Idea')?.summary).toBeUndefined();

    // Most mixins are documented — the enrichment is broadly populated, and
    // degrades to `undefined` (never a throw) for any that aren't.
    const mixinEntries = palette.mixins.filter((m) => m.kind === 'mixin');
    const withSummary = mixinEntries.filter((m) => m.summary);
    expect(withSummary.length).toBeGreaterThan(mixinEntries.length / 2);
  });
});

// ---- describeMixin (mixin inspector pane) -------------------------------

describe('StudioLogic.describeMixin', () => {
  it('returns the FULL multi-paragraph concept comment + contributed fields', async () => {
    stubAuthorGateOpen();
    // No help catalogue is warmed in this harness → the enrichment is absent.
    vi.spyOn(HelpApi, 'apiTopic').mockReturnValue(null);

    const detail = await StudioApi.describeMixin('GlobbableMixin');

    expect(detail.name).toBe('GlobbableMixin');

    // The description is the WHOLE concept comment, not the first sentence:
    // it spans multiple paragraphs and preserves the "Three guarantees" list.
    expect(detail.description).toContain('fungible-stack substrate');
    expect(detail.description).toContain('Three guarantees');
    // A numbered list item's text survives (list structure preserved).
    expect(detail.description).toContain('One Stuff, N units');
    // Multi-paragraph: a blank-line paragraph break is retained.
    expect(detail.description).toMatch(/\n\n/);
    // Longer than any one-line summary would be.
    expect(detail.description.length).toBeGreaterThan(200);
    // The gutter `*`, `{@link}` wrappers and `**bold**` markers are stripped.
    expect(detail.description).not.toContain('{@link');
    expect(detail.description).not.toContain('**');

    // The `docs/…` pointer named in the prose rides back as docRef.
    expect(detail.docRef).toBe('docs/subsystems/glob.md');

    // The contributed authorable field `quantity` surfaces (with a shape).
    const byName = new Map(detail.authorableFields.map((f) => [f.name, f]));
    expect(byName.has('quantity')).toBe(true);
    expect(typeof byName.get('quantity')!.typeShape).toBe('string');
    expect(byName.get('quantity')!.typeShape.length).toBeGreaterThan(0);
    expect(byName.get('quantity')!.kind).toBe('property');
  });

  it('degrades gracefully when HelpApi has no topic (relations empty, no throw)', async () => {
    stubAuthorGateOpen();
    vi.spyOn(HelpApi, 'apiTopic').mockReturnValue(null);

    const detail = await StudioApi.describeMixin('GlobbableMixin');
    expect(detail.relations).toEqual([]);
    expect(detail.methods).toEqual([]);
    // The always-available source-scan halves are still populated.
    expect(detail.description.length).toBeGreaterThan(0);
    expect(detail.authorableFields.length).toBeGreaterThan(0);
  });

  it('never throws when HelpApi itself throws — enrichment just stays empty', async () => {
    stubAuthorGateOpen();
    vi.spyOn(HelpApi, 'apiTopic').mockImplementation(() => {
      throw new Error('catalogue not warm');
    });

    const detail = await StudioApi.describeMixin('GlobbableMixin');
    expect(detail.relations).toEqual([]);
    expect(detail.methods).toEqual([]);
    expect(detail.description).toContain('fungible-stack substrate');
  });

  it('surfaces HelpApi enrichment (relations + conferred methods) when present', async () => {
    stubAuthorGateOpen();
    vi.spyOn(HelpApi, 'apiTopic').mockReturnValue({
      id: 'mixin.Globbable',
      kind: 'mixin',
      title: 'Globbable',
      summary: 'fungible',
      keywords: [],
      body: '',
      spoiler: false,
      source: { subdivision: 'api', ref: 'Globbable' },
      relations: [
        { kind: 'confers', targetId: 'mixin.Globbable', targetTitle: 'getQuantity' },
        { kind: 'confers', targetId: 'mixin.Globbable', targetTitle: 'setQuantity' },
        { kind: 'consumed-by', targetId: 'api.GlobbableApi', targetTitle: 'GlobbableApi' },
      ],
    });

    const detail = await StudioApi.describeMixin('GlobbableMixin');
    // Conferred method names ride the `confers` edges.
    expect(detail.methods).toEqual(
      expect.arrayContaining(['getQuantity', 'setQuantity'])
    );
    // The non-confers relation is passed through verbatim.
    expect(
      detail.relations.some(
        (r) => r.kind === 'consumed-by' && r.targetTitle === 'GlobbableApi'
      )
    ).toBe(true);
  });

  it('denies a non-author (null context actor) and rejects an empty name', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    await expect(
      StudioApi.describeMixin('GlobbableMixin')
    ).rejects.toMatchObject({ code: 'denied' });

    // With the gate open, an empty name is an invalid request.
    vi.restoreAllMocks();
    stubAuthorGateOpen();
    await expect(StudioApi.describeMixin('  ')).rejects.toMatchObject({
      code: 'invalid',
    });
  });
});
