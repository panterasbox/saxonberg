/**
 * StudioApi — the gated composition surface behind the CMS Studio.
 *
 * Where {@link CmsApi} is a thin node-ref surface over the content/source/
 * document backends, `StudioApi` is the **composition** surface: it reads
 * a backing class's effective author-facing field schema (`describeClass`),
 * and — in later phases — names/blesses compositions and scaffolds new
 * backing classes. Content-template *saves* still route through
 * `CmsApi.write('content', …)` unchanged; this surface never re-implements
 * the template write.
 *
 * Thin, security-gated forwarding shell — the `cms.ts` twin. All logic
 * (the source-scan classification, the runtime field/mixin introspection,
 * the effective-value read through the resolution chain, and the read
 * gate) lives in the hot-reloadable {@link StudioLogic} singleton at
 * `/obj/api/studio`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/studio` reloads it.
 *
 * The error its surface throws (`StudioError`) is homed here, with the
 * surface (a class export, allowed by export discipline).
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { StudioLogic } from '../obj/api/StudioLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import type {
  BlueprintDetail,
  BlueprintSummary,
  BlueprintWriteResult,
  ClassCommitResult,
  ClassDescription,
  CommitClassInput,
  CreateTemplateInput,
  MixinDetail,
  MixinPalette,
  PublishBlueprintInput,
  ScaffoldClassInput,
  ScaffoldResult,
  TemplateWriteResult,
} from '@saxonberg/types';

export type {
  ClassDescription,
  StudioFieldDescriptor,
  StudioValueSource,
  StudioErrorBody,
  BlueprintSummary,
  BlueprintDetail,
  BlueprintWriteResult,
  BlueprintKind,
  PublishBlueprintInput,
  StudioDisposition,
  MixinDetail,
  MixinFieldDetail,
  MixinPaletteEntry,
  MixinPalette,
  BaseClassEntry,
  ScaffoldClassInput,
  ScaffoldResult,
  CommitClassInput,
  ClassCommitResult,
  CreateTemplateInput,
  TemplateWriteResult,
} from '@saxonberg/types';

/**
 * The single error class the Studio surface throws for the three
 * application-level failure modes. The REST layer maps `code` to an
 * HTTP status:
 *   - `denied`    → 403
 *   - `not-found` → 404
 *   - `invalid`   → 400
 *
 * Lives with the surface that throws it (no new `lib/studio/` module for
 * an error) — the `CmsError` precedent.
 */
export class StudioError extends Error {
  public readonly code: 'denied' | 'not-found' | 'invalid';
  constructor(code: 'denied' | 'not-found' | 'invalid', message: string) {
    super(message);
    this.name = 'StudioError';
    this.code = code;
  }
}

const LOGIC_PATH = '/obj/api/studio';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/StudioLogic', import.meta.url)
);

/** Resolve the HMR-able StudioLogic singleton (sync). */
function logic(): StudioLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'StudioLogic'
      ) as typeof StudioLogic | null) ?? StudioLogic)()
  );
}

export class StudioApi {
  /**
   * Describe a backing class for the composer: its effective mixin set
   * plus, for every author-facing (`authorable`) field of that set, the
   * projected/inferred type shape and the field's effective value + the
   * source it was read from.
   *
   * Read-gated (author-tier) on the **context-derived** actor
   * (`getActingAuthor`), never a caller-supplied value — takes **no
   * `actor` argument by design**, so a privileged-Avatar reference can't
   * be substituted for the gate's subject. Throws `StudioError('denied')`
   * for a non-author (a null actor fails closed), `('not-found')` when the
   * class can't be resolved.
   *
   * @param classPath - the backing class path (`/obj/Coin`, a template's
   *   `class` field).
   * @param contextPath - optional template path of a representative live
   *   instance whose zone/biome resolution chain supplies effective
   *   defaults; when omitted, any existing instance of the class is used.
   */
  public static describeClass(
    classPath: string,
    contextPath?: string
  ): Promise<ClassDescription> {
    return logic().describeClass(classPath, contextPath);
  }

  /**
   * Describe a single mixin for the composer's inspector pane: its FULL
   * multi-paragraph concept comment, the authorable fields it contributes
   * (name + best-effort type shape) and its runtime-state field names — all
   * from the always-available server source scan — plus optional HelpApi
   * enrichment (typed relations + conferred method names), which degrades to
   * empty when the help artifact is absent (never a throw).
   *
   * Read-gated (author-tier) on the **context-derived** actor
   * (`getActingAuthor`), never a caller-supplied value — takes **no `actor`
   * argument by design**. Throws `StudioError('denied')` for a non-author,
   * `('invalid')` for an empty name.
   *
   * @param name - the mixin's `_mixinName` (e.g. `'GlobbableMixin'`).
   */
  public static describeMixin(name: string): Promise<MixinDetail> {
    return logic().describeMixin(name);
  }

  /**
   * List every catalogued blueprint — the derived skeleton (one per backing
   * class) plus the curated overlay. Read-gated (author-tier) on the
   * context-derived actor; the underlying `BlueprintCatalogue` singleton is
   * ungated reference data (the gating-at-the-Api split).
   */
  public static listBlueprints(): Promise<BlueprintSummary[]> {
    return logic().listBlueprints();
  }

  /**
   * Resolve one blueprint by its durable id (summary + structural
   * signature). Read-gated; throws `StudioError('not-found')` when unknown.
   */
  public static getBlueprint(blueprintId: string): Promise<BlueprintDetail> {
    return logic().getBlueprint(blueprintId);
  }

  /**
   * Name/publish a composition of already-approved classes (creation act
   * #2 — author-tier, no wizard). **Dedups on the structural signature**
   * (`baseClass` + `mixinNames`): a collision reuses the existing durable
   * `blueprintId` (stable across rename). The author is derived from context
   * and recorded as an `AuthoringEvent` — takes **no `actor` argument by
   * design** (anti-spoof). Returns `{ disposition: 'committed', blueprintId }`
   * or `{ disposition: 'denied', message }` for a non-author.
   */
  public static publishBlueprint(
    input: PublishBlueprintInput
  ): Promise<BlueprintWriteResult> {
    return logic().publishBlueprint(input);
  }

  /**
   * The composition palette's vocabulary — `{ mixins, bases }`. `mixins` is
   * the flat pickable list (base entries + every registry mixin, unchanged);
   * `bases` pairs each offered base class with the mixin set it already
   * composes (`impliedMixins`), so a client can pre-seed a base's composition
   * instead of starting from an empty set. Read-gated (author-tier) on the
   * context-derived actor.
   */
  public static listMixins(): Promise<MixinPalette> {
    return logic().listMixins();
  }

  /**
   * Save a NEW content template pointing at an already-approved backing class
   * (creation act #1 — "instantiate a template"; author-tier to call). Refuses
   * with `{ disposition: 'denied' }` when a template already exists at `path`
   * (CREATE-only — updates go through `CmsApi.write('content', …)`) or when the
   * wizard-lockdown code-field gate refuses the `class` set (a non-wizard
   * naming a class) — a graceful disposition, never a 500. The author is
   * derived from context and recorded via the `saveTemplate` provenance
   * chokepoint — **no `actor` argument** (anti-spoof).
   */
  public static createTemplate(
    input: CreateTemplateInput
  ): Promise<TemplateWriteResult> {
    return logic().createTemplate(input);
  }

  /**
   * Scaffold a new backing class from a base + ordered mixin set (creation
   * act #1 — **author-tier, open to all**: the generated module is inert
   * text). Returns the generated TS `source`, the wizard-commit `targetPath`
   * (`/obj/<Name>.ts`), and — for a non-wizard — the reserved
   * `/home/<self>/drafts/<Name>.ts` `draftPath` (v1 does NOT persist it). The
   * actor is derived from context — **no `actor` argument** (anti-spoof).
   * Emits a **source string only**; nothing composes a class at runtime.
   */
  public static scaffoldClass(
    input: ScaffoldClassInput
  ): Promise<ScaffoldResult> {
    return logic().scaffoldClass(input);
  }

  /**
   * Commit a scaffolded backing class to source (creation act #3 —
   * **wizard-gated**, a source write). A non-wizard gets a graceful
   * `{ disposition: 'denied' }` (the banner warned first), never a throw. A
   * wizard's write goes live via `HotReloadApi.reload`; a compile failure
   * returns `{ disposition: 'committed', reloaded: false, reloadDetail }`
   * (persisted-but-not-live), never a 500. The authoring act is recorded from
   * context — **no `actor` argument** (anti-spoof). Class-then-template
   * ordering (the follow-on template save waits for `reloaded: true`) is
   * enforced by the client; `commitClass` only writes the class.
   */
  public static commitClass(
    input: CommitClassInput
  ): Promise<ClassCommitResult> {
    return logic().commitClass(input);
  }
}

SecurityApi.decorateApiClass(StudioApi);
