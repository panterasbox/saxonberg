// StudioLogic — the hot-reloadable logic singleton behind StudioApi. (Doc
// comment lives on the class declaration below so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { AccessApi } from '../../api/access';
import { ExecutionContextApi } from '../../api/execution-context';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { AnyConstructor } from '../../api/mixin';
import { ProvenanceApi } from '../../api/provenance';
import { Quantity } from '../../lib/quantity';
import { StudioError } from '../../api/studio';
import { Blueprint } from '../../lib/studio/Blueprint';
import type BlueprintCatalogue from '../BlueprintCatalogue';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  AuthorableFieldDescriptor,
  AuthorableFieldsArtifact,
  BlueprintDetail,
  BlueprintSummary,
  BlueprintWriteResult,
  ClassDescription,
  PublishBlueprintInput,
  StudioFieldDescriptor,
  StudioValueSource,
} from '@saxonberg/types';

const StudioApiCallers = SecurityPolicies.FromModule('/api/studio#StudioApi');

/** The runtime blueprint index singleton — ungated reference reads. */
const CATALOGUE_PATH = '/obj/BlueprintCatalogue';

/**
 * Synthetic provenance path for a blueprint's naming act. The curated
 * commons has no per-owner namespace, so `publishBlueprint` attributes the
 * naming act against this stable per-id path (Risk (d)).
 */
function blueprintProvenancePath(blueprintId: string): string {
  return `${CATALOGUE_PATH}/${blueprintId}`;
}

const HERE = dirname(fileURLToPath(import.meta.url));
/** Root of the mudlib source tree (`.../src/mud`) — the classification scan. */
const MUD_ROOT = join(HERE, '..', '..');
/** The P0 field-schema artifact — OPTIONAL enrichment; absence is fine. */
const ARTIFACT_PATH = join(
  HERE,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'api',
  'authorable-fields.json'
);

/** Per-mixin classification of its declared fields, from the source scan. */
interface MixinClassification {
  authorable: Set<string>;
  runtime: Set<string>;
  /** field candidate → ref target type, from `@authorable ref:<Type>`. */
  refs: Map<string, string>;
}

// ---- source-scan helpers (adapted from the P0 coverage-guard scan) ------

function walkTsFiles(dir: string, acc: string[]): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue;
      walkTsFiles(p, acc);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

/** Underscore-insensitive candidate names for a declared identifier. */
function candidates(id: string): Set<string> {
  const bare = id.replace(/^_/, '');
  return new Set([id, bare, `_${bare}`]);
}

/**
 * Scan the mud source tree once, folding each file's `@authorable` /
 * `@runtimeState` markers onto the mixin(s) declared in that file. Mirrors
 * the P0 coverage-guard `scan()` (incl. the `apply<Field>` → field applier
 * mapping and the underscore-insensitive candidates), the classification's
 * source of truth (TypeDoc does not reflect mixin instance fields).
 */
function scanClassification(): Map<string, MixinClassification> {
  const byMixin = new Map<string, MixinClassification>();
  for (const file of walkTsFiles(MUD_ROOT, [])) {
    const src = readFileSync(file, 'utf8');
    const mixinNames = [
      ...src.matchAll(/static\s+_mixinName\s*=\s*['"]([A-Za-z0-9_]+)['"]/g),
    ].map((m) => m[1]!);
    if (mixinNames.length === 0) continue;

    const authorable = new Set<string>();
    const runtime = new Set<string>();
    const refs = new Map<string, string>();
    const decl =
      /\/\*\*([\s\S]*?)\*\/\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|override\s+|async\s+|get\s+|set\s+)*([A-Za-z_]\w*)/g;
    let d: RegExpExecArray | null;
    while ((d = decl.exec(src))) {
      const body = d[1]!;
      const id = d[2]!;
      const targets = new Set(candidates(id));
      const applier = /^apply([A-Z]\w*)$/.exec(id);
      if (applier) {
        const field =
          applier[1]!.charAt(0).toLowerCase() + applier[1]!.slice(1);
        for (const c of candidates(field)) targets.add(c);
      }
      if (/@authorable\b/.test(body)) {
        for (const c of targets) authorable.add(c);
        // `@authorable ref:<Type>` — the reference-picker signal. Sourced
        // here (not the sparse TypeDoc artifact, which can't see the field).
        const refMatch = /@authorable\s+ref:([A-Za-z_]\w*)/.exec(body);
        if (refMatch) for (const c of targets) refs.set(c, refMatch[1]!);
      }
      if (/@runtimeState\b/.test(body)) for (const c of targets) runtime.add(c);
    }

    for (const mixin of mixinNames) {
      const existing = byMixin.get(mixin);
      if (existing) {
        for (const c of authorable) existing.authorable.add(c);
        for (const c of runtime) existing.runtime.add(c);
        for (const [c, t] of refs) existing.refs.set(c, t);
      } else {
        byMixin.set(mixin, {
          authorable: new Set(authorable),
          runtime: new Set(runtime),
          refs: new Map(refs),
        });
      }
    }
  }
  return byMixin;
}

/**
 * The acting principal for a Studio op — resolved from the execution
 * context (`getActingAuthor`), NEVER a caller-supplied argument. A context
 * with no derivable actor yields `null` → the read gate fails closed.
 * Copied verbatim from `CmsLogic` (the anti-spoof property).
 */
function actingActor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/**
 * Author-tier read gate on the context-derived actor. Composition reads are
 * author-facing (content-tier, per `docs/subsystems/cms.md`). Throws
 * `StudioError('denied')` on failure (a null actor fails closed).
 */
async function gateRead(): Promise<void> {
  if (!(await AccessApi.isAuthor(actingActor()))) {
    throw new StudioError('denied', 'you must be an author to compose classes');
  }
}

/** Call `get<Pascal(field)>()` on a duck-typed host; undefined on any miss. */
function readViaGetter(host: unknown, field: string): unknown {
  const getterName = 'get' + MixinApi.pascalCase(field);
  const getter = (host as Record<string, unknown>)[getterName];
  if (typeof getter !== 'function') return undefined;
  try {
    return (getter as () => unknown).call(host);
  } catch {
    return undefined;
  }
}

/** Read the host's own field slot directly (no getter); undefined on miss. */
function readOwn(host: unknown, field: string): unknown {
  try {
    return (host as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

/**
 * StudioLogic — the hot-reloadable logic singleton behind
 * {@link StudioApi}.
 *
 * Lives at `/obj/api/studio` (a stateless `Stuff` singleton, no backing
 * `Template`); `StudioApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and calls
 * a method other than through the Api gets `SecurityError`.
 *
 * Composes `AccessApi`, `StuffApi`, and `MixinApi`. The one piece of state
 * it carries is a lazily-built, cached classification of every registry
 * mixin's fields, from a one-time scan of the mud source tree (the
 * `@authorable` / `@runtimeState` markers) — complete and always available,
 * unlike the sparse TypeDoc-derived `authorable-fields.json` artifact
 * (which is joined in only for its richer type/ref shapes when present).
 *
 * The `FromModule` gate is applied per public method.
 *
 * @internal
 */
@Unshadowable
export class StudioLogic extends ApiLogic {
  /** Cached source-scan classification (built once on first describe). */
  private classification: Map<string, MixinClassification> | null = null;
  /** Cached artifact enrichment (loaded once; empty when absent). */
  private artifact: AuthorableFieldsArtifact | null = null;

  /** See {@link StudioApi.describeClass}. */
  @CallSecurity(StudioApiCallers)
  public async describeClass(
    classPath: string,
    contextPath?: string
  ): Promise<ClassDescription> {
    await gateRead();

    let ctor: AnyConstructor;
    try {
      ctor = (await StuffApi.loadClassByPath(classPath)) as AnyConstructor;
    } catch (err) {
      throw new StudioError(
        'not-found',
        `cannot resolve class ${classPath}: ${(err as Error).message}`
      );
    }

    const scan = this.getClassification();
    const artifact = this.getArtifact();

    const mixins = MixinApi.queryMixins(ctor);
    const mixinNames = mixins.map((m) => m._mixinName ?? m.name ?? '<anonymous>');
    const persistent = MixinApi.getAllPersistentFields(ctor);
    const instruction = MixinApi.getAllInstructionFields(ctor);
    const instructionSet = new Set(instruction);
    const allFields = [...new Set([...persistent, ...instruction])];

    // A representative live instance drives effective-value resolution:
    // the given contextPath, else any existing instance of the class.
    const instance =
      (contextPath
        ? StuffApi.findByTemplatePath<Stuff>(contextPath)
        : undefined) ??
      StuffApi.findAllByTemplatePath<Stuff>(classPath)[0] ??
      null;

    const fields: StudioFieldDescriptor[] = [];
    for (const field of allFields) {
      const owner = this.ownerMixinOf(mixins, field, instructionSet);
      if (!owner) continue; // a base-class (non-mixin) field — never authorable
      const classified = scan.get(owner);
      if (!classified || !classified.authorable.has(field)) continue;

      const kind: 'property' | 'instruction' = instructionSet.has(field)
        ? 'instruction'
        : 'property';

      const enrichment = this.artifactFor(artifact, owner, field);
      const { value, valueSource } = await this.readEffectiveValue(
        instance,
        ctor,
        field
      );

      const typeShape =
        enrichment?.typeShape ?? inferTypeShape(value) ?? 'json';

      const descriptor: StudioFieldDescriptor = {
        name: field,
        mixin: owner,
        kind,
        typeShape,
        valueSource,
      };
      if (enrichment?.description) descriptor.description = enrichment.description;
      if (enrichment?.enumValues) descriptor.enumValues = enrichment.enumValues;
      if (enrichment?.refShape) descriptor.refShape = enrichment.refShape;
      if (enrichment?.refType) descriptor.refType = enrichment.refType;
      // Fall back to the source-scan ref (the artifact is sparse for mixin
      // fields, so `@authorable ref:<Type>` is usually only found here).
      if (!descriptor.refShape) {
        const scanRefType = classified.refs.get(field);
        if (scanRefType) {
          descriptor.refShape = 'path';
          descriptor.refType = scanRefType;
        }
      }
      if (value !== undefined) descriptor.defaultValue = value;
      fields.push(descriptor);
    }

    return { classPath, mixins: mixinNames, fields };
  }

  /** See {@link StudioApi.listBlueprints}. */
  @CallSecurity(StudioApiCallers)
  public async listBlueprints(): Promise<BlueprintSummary[]> {
    await gateRead();
    const catalogue = await this.requireCatalogue();
    return catalogue.allBlueprints().map((bp) => toSummary(bp));
  }

  /** See {@link StudioApi.getBlueprint}. */
  @CallSecurity(StudioApiCallers)
  public async getBlueprint(blueprintId: string): Promise<BlueprintDetail> {
    await gateRead();
    const catalogue = await this.requireCatalogue();
    const bp = catalogue.getBlueprint(blueprintId);
    if (!bp) {
      throw new StudioError('not-found', `no blueprint '${blueprintId}'`);
    }
    return toDetail(bp);
  }

  /** See {@link StudioApi.publishBlueprint}. */
  @CallSecurity(StudioApiCallers)
  public async publishBlueprint(
    input: PublishBlueprintInput
  ): Promise<BlueprintWriteResult> {
    // Act #2 — naming/publishing a composition of already-approved classes is
    // author-tier (no wizard). Denial is a graceful disposition, not a throw.
    if (!(await AccessApi.isAuthor(actingActor()))) {
      return {
        disposition: 'denied',
        message: 'you must be an author to publish a blueprint',
      };
    }
    if (!input.name || !input.baseClass) {
      throw new StudioError('invalid', 'name and baseClass are required');
    }

    const mixinNames = [...new Set(input.mixinNames ?? [])].sort();
    const signature = Blueprint.signatureFromParts(input.baseClass, mixinNames);
    const catalogue = await this.requireCatalogue();

    // Dedup on signature: a collision reuses the existing durable id (stable
    // across rename), attaching the new name/metadata to the same blueprint.
    const existing = catalogue.findBySignature(signature);
    const bp = existing ?? new Blueprint();
    const blueprintId = existing
      ? existing.getBlueprintId()
      : mintBlueprintId(input.name, signature);

    bp.blueprintId = blueprintId;
    bp.signature = signature;
    bp.name = input.name;
    bp.baseClass = input.baseClass;
    bp.mixinNames = mixinNames;
    bp.kind = input.kind ?? 'composition';
    bp.classPath = input.classPath ?? '';
    bp.parent = input.parent ?? '';
    bp.blessed = input.blessed ?? false;
    bp.description = input.description ?? '';
    await bp.save();
    catalogue.upsert(bp);

    // Attribute the naming act to the context-derived author (never a param).
    // `Blueprint.save` bypasses the `saveTemplate` chokepoint, so the row is
    // recorded here against the synthetic per-id provenance path.
    await ProvenanceApi.recordAuthoring({
      path: blueprintProvenancePath(blueprintId),
    });

    return { disposition: 'committed', blueprintId };
  }

  /**
   * Resolve the ungated {@link BlueprintCatalogue} singleton (the
   * gating-on-the-Api, reference-read-on-the-catalogue split). Prefers the
   * live registered instance (HMR/test-reset supersede a stale handle).
   */
  private async requireCatalogue(): Promise<BlueprintCatalogue> {
    const found =
      StuffApi.findByTemplatePath<BlueprintCatalogue>(CATALOGUE_PATH);
    if (found) return found;
    return StuffApi.singleton<BlueprintCatalogue>(CATALOGUE_PATH);
  }

  /** Lazily build + cache the source-scan classification. */
  private getClassification(): Map<string, MixinClassification> {
    if (!this.classification) this.classification = scanClassification();
    return this.classification;
  }

  /** Lazily load + cache the artifact; empty (no fields) when absent. */
  private getArtifact(): AuthorableFieldsArtifact {
    if (!this.artifact) {
      try {
        this.artifact = JSON.parse(
          readFileSync(ARTIFACT_PATH, 'utf8')
        ) as AuthorableFieldsArtifact;
      } catch {
        this.artifact = { fields: {}, coverage: { unclassified: [], doubleClassified: [] } };
      }
    }
    return this.artifact;
  }

  /**
   * The `_mixinName` of the first effective mixin (leaf-first) whose **own**
   * static `persistentFields` / `instructionFields` declares `field` — the
   * declaring layer, for classification + attribution. `null` for a field
   * owned by a base (non-mixin) class.
   *
   * Reads OWN statics only (`hasOwnProperty`): a subclass mixin inherits an
   * ancestor mixin's static arrays through the prototype chain, so a plain
   * `m.instructionFields` would mis-attribute a field to the wrong (outer)
   * mixin and read the wrong classification.
   */
  private ownerMixinOf(
    mixins: ReadonlyArray<{
      _mixinName?: string;
      name?: string;
      persistentFields?: string[];
    }>,
    field: string,
    _instructionSet: Set<string>
  ): string | null {
    const ownArray = (m: object, key: string): string[] =>
      Object.prototype.hasOwnProperty.call(m, key) &&
      Array.isArray((m as Record<string, unknown>)[key])
        ? ((m as Record<string, string[]>)[key] as string[])
        : [];
    for (const m of mixins) {
      if (
        ownArray(m, 'persistentFields').includes(field) ||
        ownArray(m, 'instructionFields').includes(field)
      ) {
        return m._mixinName ?? m.name ?? '<anonymous>';
      }
    }
    return null;
  }

  /** The artifact descriptor for `mixin`.`field`, or null (join by name). */
  private artifactFor(
    artifact: AuthorableFieldsArtifact,
    mixin: string,
    field: string
  ): AuthorableFieldDescriptor | null {
    const list = artifact.fields[mixin];
    if (!list) return null;
    return list.find((d) => d.field === field) ?? null;
  }

  /**
   * Effective value + the source it came from, reading through the engine's
   * own accessors (never reimplementing the resolution chain):
   *
   *   - a live instance holding its own value → `instance`;
   *   - a live instance with no own value but a zone/biome
   *     `lookupField` default → `resolution-chain`;
   *   - no live instance → a guarded throwaway construction reads the
   *     class field initializer → `class-default`.
   */
  private async readEffectiveValue(
    instance: Stuff | null,
    ctor: AnyConstructor,
    field: string
  ): Promise<{ value: unknown; valueSource: StudioValueSource }> {
    if (instance) {
      const got = readViaGetter(instance, field);
      const own = readOwn(instance, field);
      const hasOwn = own !== undefined && own !== null && own !== '';
      if (hasOwn) return { value: got ?? own, valueSource: 'instance' };
      const chained = await this.probeResolutionChain(instance, field);
      if (chained !== undefined && chained !== null) {
        return { value: chained, valueSource: 'resolution-chain' };
      }
      return { value: got, valueSource: 'instance' };
    }
    return this.readClassDefault(ctor, field);
  }

  /**
   * Ask the instance's nearest spatial zone for a `lookupField` default —
   * the engine's own inheritance walk (`Zone.lookupField` → biome
   * resolution). Duck-typed to avoid coupling to the zone types.
   */
  private async probeResolutionChain(
    instance: Stuff,
    field: string
  ): Promise<unknown> {
    const zone = (instance as { getZone?: () => unknown }).getZone?.();
    const lookup = (zone as { lookupField?: (f: string) => Promise<unknown> })
      ?.lookupField;
    if (typeof lookup !== 'function') return undefined;
    try {
      return await lookup.call(zone, field);
    } catch {
      return undefined;
    }
  }

  /**
   * Read a field's class-default off a throwaway construction (no live
   * instance existed). Constructed + destructed through the Api so the
   * construction sentinel + registry stay consistent; guarded so a
   * side-effecting `postRegister` never breaks a read.
   */
  private async readClassDefault(
    ctor: AnyConstructor,
    field: string
  ): Promise<{ value: unknown; valueSource: StudioValueSource }> {
    let created: Stuff | null = null;
    try {
      created = await StuffApi.create(
        () => new (ctor as unknown as new () => Stuff)()
      );
      const got = readViaGetter(created, field);
      const value = got !== undefined ? got : readOwn(created, field);
      return { value, valueSource: 'class-default' };
    } catch {
      return { value: undefined, valueSource: 'class-default' };
    } finally {
      if (created) {
        try {
          StuffApi.destruct(created);
        } catch {
          /* best-effort cleanup of the throwaway */
        }
      }
    }
  }
}

/** Project a stored {@link Blueprint} to its wire summary. */
function toSummary(bp: Blueprint): BlueprintSummary {
  const s: BlueprintSummary = {
    blueprintId: bp.getBlueprintId(),
    name: bp.getName(),
    kind: bp.getKind(),
    baseClass: bp.getBaseClass(),
    mixinNames: [...bp.getMixinNames()],
    blessed: bp.isBlessed(),
  };
  const classPath = bp.getClassPath();
  if (classPath) s.classPath = classPath;
  const parent = bp.getParent();
  if (parent) s.parent = parent;
  const description = bp.getDescription();
  if (description) s.description = description;
  return s;
}

/** Project a stored {@link Blueprint} to its wire detail (summary + sig). */
function toDetail(bp: Blueprint): BlueprintDetail {
  return { ...toSummary(bp), signature: bp.getSignature() };
}

/**
 * Mint a stable, unique blueprintId for a brand-new composition — a name
 * slug plus a short signature-derived suffix (so two distinct compositions
 * that happen to share a name don't collide on id).
 */
function mintBlueprintId(name: string, signature: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'blueprint';
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return `${slug}-${(hash >>> 0).toString(36)}`;
}

/** Infer a readable widget-selection type string from a sample value. */
function inferTypeShape(value: unknown): string {
  if (value === null || value === undefined) return 'json';
  if (value instanceof Quantity) return 'Quantity';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'json';
}
