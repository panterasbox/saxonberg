/**
 * studioSlice — the CMS Studio surface's store slice (state + actions),
 * composed into the main {@link useStore} alongside {@link CmsSlice}.
 *
 * The Studio tab ("Kinds") is a small VIEW ROUTER over four sequential,
 * audience-distinct surfaces (see docs/subsystems/studio.md § the trust
 * model — the two creation acts the IA separates):
 *
 *   - `catalogue` — the content author's home: browse/search the blueprint
 *     catalogue (compact cards, blessed-first, grouped by parent).
 *   - `blueprint` — one blueprint's detail; the load-bearing round-trip is
 *     "New template from this →" (act #1) and "Author a new kind from this →"
 *     (act #3, wizard).
 *   - `template` — the ONLY place the data form lives (act #1): instantiate a
 *     NEW content template pointing at an approved backing class. A projection
 *     over `template.data` — the same overlay the Files-tab Studio form uses.
 *   - `composer` — the wizard, code-tier surface (act #3): compose a base +
 *     ordered mixin set → scaffold TS source → commit. Shows SOURCE, never a
 *     data form.
 *
 * The data form is a *projection over a content leaf's `template.data`*. It
 * edits only the authorable fields the `describeClass` schema surfaces, but
 * `template.data` may carry other keys (non-authorable runtime state, keys the
 * scan never surfaced). The slice therefore keeps the FULL parsed original in
 * `baseData` and layers edits over it:
 *
 *   - `baseData` — the full parsed `template.data`. For a NEW template it
 *     starts `{}`; edits overlay it. Untouched keys ride through verbatim.
 *   - `edits` — field → new value, for locally-changed authorable fields.
 *   - `cleared` — fields the user reset to inherit (removed on serialize so
 *     the template stops carrying a local override).
 *
 * `studioSerialize()` reconstructs the body as
 * `JSON.stringify({ ...baseData, ...edits }, null, 2)` with `cleared` keys
 * deleted — byte-identical to the raw-JSON editor for an unedited round-trip
 * (the load-bearing data-integrity invariant). The template form's YAML view
 * is an alternate editor of the SAME merged data object (`studioMergedData`).
 */

import type {
  BlueprintSummary,
  ClassDescription,
  CreateTemplateInput,
  MixinDetail,
  MixinPalette,
  ScaffoldClassInput,
  StudioDisposition,
  TemplateWriteResult,
} from "@saxonberg/types";
import { studioClient, StudioClientError } from "../components/cms/studioClient";

/** The four sequential views the Studio "Kinds" tab routes between. */
export type StudioView = "catalogue" | "blueprint" | "template" | "composer";

/** The exact + superset match sets computed against the live composition. */
export interface BlueprintMatches {
  /** Same base + same effective mixin set (a dedup collision). */
  exact: BlueprintSummary[];
  /** A blueprint whose mixin set is a strict superset of the composition. */
  superset: BlueprintSummary[];
}

/**
 * The base a composition extends. Generalized beyond the 8 fundamental roots:
 * the base can be ANY approved class (an "Author a new kind from this →" on a
 * concrete blueprint makes that class the superclass). A root pick and an
 * arbitrary-class base share this shape.
 */
export interface ComposerBase {
  /**
   * The base class NAME — used verbatim in the `extends` clause and as the
   * scaffold's base identifier (resolved by-name server-side). A root
   * (`Idea`/`Thing`) or a concrete class (`Coin`/`PaymentCard`, the last
   * segment of its `classPath`).
   */
  name: string;
  /** The base's backing class path (`/obj/Coin`); `""` for a bare root. */
  classPath: string;
  /**
   * The mixins the base already composes — the read-only "inherited from
   * <Base>" segment. For a root pick this is the root's own implied set; for
   * a concrete-class base it is the blueprint's full mixin set.
   */
  impliedMixins: string[];
  /**
   * The fundamental root (`Idea`/`Thing`/…) the base ultimately extends — the
   * structural-signature `baseClass`. A subclass shares its base's signature
   * root, so matching a concrete base against the catalogue stays correct.
   * Equals `name` for a root pick.
   */
  rootBaseClass: string;
}

/** The in-progress composer composition (act #3). */
export interface ComposerState {
  /** The new backing class name (PascalCase). */
  name: string;
  /** The base the mixins are applied over (a root OR an arbitrary class). */
  base: ComposerBase;
  /** The author's added mixins, in composition order (outermost first). */
  orderedMixins: string[];
}

/** The in-progress new-template draft (act #1). */
export interface TemplateDraft {
  /** The new template path (`/obj/MyCoin`). */
  path: string;
  /** The backing class the template instantiates (`/obj/Coin`). */
  classPath: string;
  /** The originating blueprint's display name (for the header). */
  blueprintName: string;
  /** Form vs YAML editor toggle for the same data object. */
  yamlMode: boolean;
}

/** The Studio slice's state + actions. */
export interface StudioSlice {
  studio: {
    // ---- view router ----
    /** Which of the four sequential views the "Kinds" tab renders. */
    view: StudioView;

    // ---- catalogue ----
    /** The catalogued blueprints, or null before the first load. */
    blueprints: BlueprintSummary[] | null;
    /** Last blueprint-list load error, or null. */
    blueprintsError: string | null;
    /** The catalogue search box's current filter text. */
    search: string;
    /** The blueprint selected for the detail/template views, or null. */
    selectedBlueprint: BlueprintSummary | null;

    // ---- composition palette ----
    /** The palette vocabulary (`{ mixins, bases }`), or null before load. */
    palette: MixinPalette | null;

    // ---- mixin inspector pane ----
    /**
     * The mixin currently loaded into the inspector pane, or null before any
     * inspect. STICKY — it holds the last inspected mixin (it does NOT clear
     * on mouse-out) so the author can read it while composing.
     */
    inspectedMixin: string | null;
    /**
     * Per-mixin `describeMixin` cache (name → detail). Fetched lazily on the
     * first inspect of a mixin and reused — a hover never refetches.
     */
    mixinDetails: Record<string, MixinDetail>;
    /** Last inspector fetch error, or null. */
    inspectError: string | null;

    // ---- template form (act #1) ----
    /** The active new-template draft, or null when not in the template view. */
    template: TemplateDraft | null;
    /** The last `createTemplate` disposition, or null. */
    templateResult: TemplateWriteResult | null;

    // ---- describe + data overlay (shared: template form + Files-tab form) ----
    /** The described class schema, or null before a describe lands. */
    description: ClassDescription | null;
    /** The full parsed `template.data` — the overlay base (`{}` for new). */
    baseData: Record<string, unknown>;
    /** Locally-changed authorable fields (field → new value). */
    edits: Record<string, unknown>;
    /** Fields reset to inherit — removed on serialize. */
    cleared: string[];
    /** Raw-JSON advanced-mode toggle (Files-tab Studio form). */
    advanced: boolean;
    /** True while a describe is in flight. */
    loading: boolean;
    /** Last inline error (describe or parse), or null. */
    error: string | null;

    // ---- composer (act #3) ----
    /** The in-progress composition. */
    composer: ComposerState;
    /** The scaffolded (and wizard-edited) source, or null when none active. */
    scaffoldSource: string | null;
    /** The wizard-commit target path for the active scaffold. */
    scaffoldTarget: string | null;
    /** The reserved non-wizard draft path for the active scaffold. */
    scaffoldDraftPath: string | null;
    /** The last commit disposition (`committed`/`denied`), or null. */
    commitDisposition: StudioDisposition | null;
    /**
     * True only after a commit returned `reloaded:true` — the client-side
     * class-then-template ordering gate. The follow-on template step is
     * blocked until this is true (a `denied` commit never sets it).
     */
    commitReloaded: boolean;
    /** Human detail for the last commit (reloadDetail or denial message). */
    commitMessage: string | null;
    /** True while a scaffold/commit/create-template POST is in flight. */
    busy: boolean;
  };

  // ---- view navigation ----
  /** Route to the catalogue home (clears the selection-scoped views). */
  studioGoCatalogue: () => void;
  /** Select a blueprint → route to its detail view. */
  studioSelectBlueprint: (bp: BlueprintSummary) => void;
  /** Set the catalogue search filter text. */
  studioSetSearch: (text: string) => void;

  // ---- catalogue + palette loads ----
  /** Fetch the blueprint catalogue (idempotent-ish; refetches). */
  studioListBlueprints: () => Promise<void>;
  /** Fetch the composition palette (`{ mixins, bases }`). */
  studioListPalette: () => Promise<void>;

  // ---- mixin inspector pane ----
  /**
   * Load a mixin into the inspector pane (sticky). Sets `inspectedMixin` and,
   * on the FIRST inspect of that mixin, lazily fetches + caches its detail;
   * an already-cached mixin is a pure state flip (no refetch). Passing null
   * is a no-op — the pane stays on its last mixin.
   */
  studioInspectMixin: (name: string | null) => void;

  // ---- template form (act #1) ----
  /**
   * Begin a NEW template from a blueprint: route to the template view, seed the
   * draft, reset the overlay to an empty baseData, and describe the class.
   */
  studioBeginTemplate: (bp: BlueprintSummary) => void;
  /** Set the new-template target path. */
  studioSetTemplatePath: (path: string) => void;
  /** Flip the template form's Form/YAML editor toggle. */
  studioToggleTemplateYaml: () => void;
  /** Adopt a whole parsed data object as the new baseline (YAML round-trip). */
  studioSetDataObject: (data: Record<string, unknown>) => void;
  /** The merged data object `{ ...baseData, ...edits }` minus cleared. */
  studioMergedData: () => Record<string, unknown>;
  /** Save the new template via `createTemplate`; surfaces the disposition. */
  studioCreateTemplate: (csrf: string) => Promise<void>;

  // ---- describe + overlay (shared) ----
  /** Fetch a class's authorable-field schema for the form. */
  studioDescribe: (classPath: string, contextPath?: string) => Promise<void>;
  /** Parse a raw `template.data` JSON body into `baseData` (new baseline). */
  studioLoadData: (rawJsonBody: string) => void;
  /** Set one authorable field's value (drops any `cleared` mark). */
  studioSetField: (name: string, value: unknown) => void;
  /** Reset one field to inherit (drops any local edit, marks cleared). */
  studioClearField: (name: string) => void;
  /** Flip the raw-JSON advanced-mode toggle. */
  studioToggleAdvanced: () => void;
  /** Serialize the overlay to the byte-compatible `template.data` body. */
  studioSerialize: () => string;

  // ---- composer (act #3) ----
  /**
   * Begin the composer. With a `seed` blueprint, pre-seeds the base + added
   * mixins from it ("Author a new kind from this →"); otherwise a fresh start.
   */
  studioBeginComposer: (seed?: BlueprintSummary) => void;
  /** Set the composer's class name. */
  studioComposerSetName: (name: string) => void;
  /** Select the base class; pre-seeds its implied mixin set. */
  studioComposerSetBase: (base: string) => void;
  /** Add a mixin to the ordered composition (no-op if implied/present). */
  studioComposerAddMixin: (name: string) => void;
  /** Remove a mixin from the ordered composition. */
  studioComposerRemoveMixin: (name: string) => void;
  /** Move an added mixin from one index to another (drag reorder). */
  studioComposerReorder: (from: number, to: number) => void;
  /** The effective mixin set: implied ∪ ordered, deduped. */
  studioEffectiveMixins: () => string[];
  /** The effective structural signature (`<base>|<sorted-mixins>`). */
  studioEffectiveSignature: () => string;
  /** The exact + superset blueprint matches against the live composition. */
  studioMatchingBlueprints: () => BlueprintMatches;
  /** Scaffold a new backing class; stores the generated source + paths. */
  studioScaffold: (input: ScaffoldClassInput, csrf: string) => Promise<void>;
  /** Edit the active scaffold's source buffer (the wizard's Monaco edits). */
  studioSetScaffoldSource: (source: string) => void;
  /** Commit the active scaffold to source; surfaces the disposition. */
  studioCommit: (csrf: string) => Promise<void>;
  /** Clear the active scaffold + its commit state. */
  studioResetScaffold: () => void;
}

/**
 * The pure overlay serializer. Produces the same string
 * `JSON.stringify(data, null, 2)` the raw-JSON editor would for the same
 * effective data. Exported for the round-trip test.
 */
export function serializeStudioData(
  baseData: Record<string, unknown>,
  edits: Record<string, unknown>,
  cleared: readonly string[],
): string {
  return JSON.stringify(mergeStudioData(baseData, edits, cleared), null, 2);
}

/**
 * The pure overlay merge as an OBJECT (not a string): `{ ...baseData, ...edits }`
 * minus `cleared`. The template form's YAML view and `createTemplate` payload
 * read this. Exported for tests.
 */
export function mergeStudioData(
  baseData: Record<string, unknown>,
  edits: Record<string, unknown>,
  cleared: readonly string[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...baseData, ...edits };
  for (const key of cleared) {
    delete merged[key];
  }
  return merged;
}

/**
 * The structural signature `<baseClass>|<sorted-unique-mixin-names>` — mirrors
 * the server's `Blueprint.signatureFromParts` so a client-computed effective
 * signature compares exactly against a catalogued blueprint's `signature`.
 */
export function signatureFromParts(
  baseClass: string,
  mixinNames: readonly string[],
): string {
  const mixins = [...new Set(mixinNames)].sort().join(",");
  return `${baseClass}|${mixins}`;
}

/** Implied ∪ ordered, deduped (order: implied first, then added). */
export function effectiveMixins(
  impliedMixins: readonly string[],
  orderedMixins: readonly string[],
): string[] {
  return [...new Set([...impliedMixins, ...orderedMixins])];
}

/**
 * Partition blueprints into exact (same base + same effective mixin set — a
 * dedup collision) and superset (a strict superset of the composition's mixin
 * set) against a live composition. Pure + exported for the match-filter test.
 */
export function classifyMatches(
  blueprints: readonly BlueprintSummary[],
  baseClass: string,
  effective: readonly string[],
): BlueprintMatches {
  const want = new Set(effective);
  const exact: BlueprintSummary[] = [];
  const superset: BlueprintSummary[] = [];
  for (const bp of blueprints) {
    const have = new Set(bp.mixinNames);
    const sameSet = have.size === want.size && [...want].every((m) => have.has(m));
    if (bp.baseClass === baseClass && sameSet) {
      exact.push(bp);
      continue;
    }
    // Superset: has every mixin we want AND at least one more (strict).
    const superSet =
      have.size > want.size && [...want].every((m) => have.has(m));
    if (superSet) superset.push(bp);
  }
  return { exact, superset };
}

/** Move an array element from `from` to `to`, returning a new array. */
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= arr.length ||
    to >= arr.length
  ) {
    return [...arr];
  }
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

function errMessage(e: unknown): string {
  if (e instanceof StudioClientError) return e.message;
  if (e instanceof Error) return e.message;
  return "unexpected error";
}

/** Parse a raw JSON body to a plain object, or null when it isn't one. */
function parseData(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (trimmed === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

/** The last `/`-segment of a class path (`/lib/banking/PaymentCard` → `PaymentCard`). */
export function classNameOf(classPath: string): string {
  const seg = classPath.split("/").filter(Boolean).pop();
  return seg ?? classPath;
}

/**
 * Build a {@link ComposerBase} for one of the fundamental ROOTS, seeding its
 * implied mixin set + class path from the palette. `rootBaseClass === name`.
 */
export function rootBase(
  name: string,
  palette: MixinPalette | null,
): ComposerBase {
  const entry = palette?.bases.find((b) => b.name === name);
  return {
    name,
    classPath: entry?.classPath ?? "",
    impliedMixins: entry?.impliedMixins ?? [],
    rootBaseClass: name,
  };
}

/**
 * Build a {@link ComposerBase} from a blueprint the author chose to subclass
 * ("Author a new kind from this →"): the blueprint's class becomes the
 * superclass, its full mixin set the read-only inherited segment, and its
 * fundamental root carries through as the signature root.
 */
export function baseFromBlueprint(seed: BlueprintSummary): ComposerBase {
  return {
    name: seed.classPath ? classNameOf(seed.classPath) : seed.baseClass,
    classPath: seed.classPath ?? "",
    impliedMixins: [...seed.mixinNames],
    rootBaseClass: seed.baseClass,
  };
}

/** The composer's cleared initial state. */
const EMPTY_COMPOSER: ComposerState = {
  name: "",
  base: {
    name: "Idea",
    classPath: "",
    impliedMixins: [],
    rootBaseClass: "Idea",
  },
  orderedMixins: [],
};

/**
 * Slice creator in the zustand `(set, get)` shape. Merged into the main
 * store's object literal so its state + actions sit on the same flat
 * `StoreState` the rest of the app reads.
 */
export const createStudioSlice = (
  set: (
    partial:
      | Partial<StudioSlice>
      | ((state: StudioSlice) => Partial<StudioSlice>),
  ) => void,
  get: () => StudioSlice,
): StudioSlice => {
  // Monotonic scaffold-request token. The composer auto-scaffolds live (a
  // debounced call per composition change), so overlapping requests are the
  // norm: a slow response must never clobber a newer one. Each call captures
  // the token it bumped; on resolution it drops itself if a later request has
  // since bumped past it (the latest request owns the state + `busy`).
  let scaffoldSeq = 0;
  // Mixins whose `describeMixin` fetch is in flight — so rapid re-hovers of an
  // uncached mixin (before the first response lands) coalesce to ONE fetch.
  const inspectInFlight = new Set<string>();
  return {
  studio: {
    view: "catalogue",
    blueprints: null,
    blueprintsError: null,
    search: "",
    selectedBlueprint: null,
    palette: null,
    inspectedMixin: null,
    mixinDetails: {},
    inspectError: null,
    template: null,
    templateResult: null,
    description: null,
    baseData: {},
    edits: {},
    cleared: [],
    advanced: false,
    loading: false,
    error: null,
    composer: { ...EMPTY_COMPOSER },
    scaffoldSource: null,
    scaffoldTarget: null,
    scaffoldDraftPath: null,
    commitDisposition: null,
    commitReloaded: false,
    commitMessage: null,
    busy: false,
  },

  // ---- view navigation ----
  studioGoCatalogue: () =>
    set((s) => ({
      studio: {
        ...s.studio,
        view: "catalogue",
        selectedBlueprint: null,
        template: null,
        templateResult: null,
      },
    })),

  studioSelectBlueprint: (bp) =>
    set((s) => ({
      studio: { ...s.studio, view: "blueprint", selectedBlueprint: bp },
    })),

  studioSetSearch: (text) =>
    set((s) => ({ studio: { ...s.studio, search: text } })),

  // ---- catalogue + palette loads ----
  studioListBlueprints: async () => {
    try {
      const blueprints = await studioClient.listBlueprints();
      set((s) => ({
        studio: { ...s.studio, blueprints, blueprintsError: null },
      }));
    } catch (e) {
      set((s) => ({
        studio: { ...s.studio, blueprintsError: errMessage(e) },
      }));
    }
  },

  studioListPalette: async () => {
    try {
      const palette = await studioClient.listMixins();
      set((s) => ({ studio: { ...s.studio, palette } }));
    } catch (e) {
      set((s) => ({ studio: { ...s.studio, error: errMessage(e) } }));
    }
  },

  // ---- mixin inspector pane ----
  studioInspectMixin: (name) => {
    if (name === null) return; // sticky — a mouse-out never clears the pane
    const { inspectedMixin, mixinDetails } = get().studio;
    // Flip to the mixin (sticky). Re-inspecting the same mixin is idempotent.
    if (inspectedMixin !== name) {
      set((s) => ({
        studio: { ...s.studio, inspectedMixin: name, inspectError: null },
      }));
    }
    // Lazy, once-per-mixin fetch: an already-cached (or in-flight) detail is
    // never refetched.
    if (mixinDetails[name] || inspectInFlight.has(name)) return;
    inspectInFlight.add(name);
    void (async () => {
      try {
        const detail = await studioClient.describeMixin(name);
        set((s) => ({
          studio: {
            ...s.studio,
            mixinDetails: { ...s.studio.mixinDetails, [name]: detail },
          },
        }));
      } catch (e) {
        // Only surface the error if this mixin is still the one on screen.
        set((s) =>
          s.studio.inspectedMixin === name
            ? { studio: { ...s.studio, inspectError: errMessage(e) } }
            : {},
        );
      } finally {
        inspectInFlight.delete(name);
      }
    })();
  },

  // ---- template form (act #1) ----
  studioBeginTemplate: (bp) => {
    // Reset the overlay to an empty baseData for a brand-new template, then
    // route + describe. A blueprint with no backing class can't be
    // instantiated — callers gate the button, but we still no-op the describe.
    set((s) => ({
      studio: {
        ...s.studio,
        view: "template",
        selectedBlueprint: bp,
        template: {
          path: "",
          classPath: bp.classPath ?? "",
          blueprintName: bp.name,
          yamlMode: false,
        },
        templateResult: null,
        baseData: {},
        edits: {},
        cleared: [],
        description: null,
        error: null,
      },
    }));
    if (bp.classPath) void get().studioDescribe(bp.classPath);
  },

  studioSetTemplatePath: (path) =>
    set((s) =>
      s.studio.template
        ? {
            studio: {
              ...s.studio,
              template: { ...s.studio.template, path },
            },
          }
        : {},
    ),

  studioToggleTemplateYaml: () =>
    set((s) =>
      s.studio.template
        ? {
            studio: {
              ...s.studio,
              template: {
                ...s.studio.template,
                yamlMode: !s.studio.template.yamlMode,
              },
            },
          }
        : {},
    ),

  studioSetDataObject: (data) =>
    set((s) => ({
      studio: { ...s.studio, baseData: data, edits: {}, cleared: [] },
    })),

  studioMergedData: () => {
    const { baseData, edits, cleared } = get().studio;
    return mergeStudioData(baseData, edits, cleared);
  },

  studioCreateTemplate: async (csrf) => {
    const { template } = get().studio;
    if (!template) return;
    set((s) => ({ studio: { ...s.studio, busy: true, error: null } }));
    const input: CreateTemplateInput = {
      path: template.path,
      classPath: template.classPath,
      data: get().studioMergedData(),
    };
    try {
      const templateResult = await studioClient.createTemplate(input, csrf);
      set((s) => ({ studio: { ...s.studio, busy: false, templateResult } }));
    } catch (e) {
      set((s) => ({
        studio: { ...s.studio, busy: false, error: errMessage(e) },
      }));
    }
  },

  // ---- describe + overlay (shared) ----
  studioDescribe: async (classPath, contextPath) => {
    set((s) => ({ studio: { ...s.studio, loading: true, error: null } }));
    try {
      const description = await studioClient.describe(classPath, contextPath);
      set((s) => ({
        studio: { ...s.studio, description, loading: false },
      }));
    } catch (e) {
      set((s) => ({
        studio: {
          ...s.studio,
          description: null,
          loading: false,
          error: errMessage(e),
        },
      }));
    }
  },

  studioLoadData: (rawJsonBody) =>
    set((s) => {
      const parsed = parseData(rawJsonBody);
      if (parsed === null) {
        return {
          studio: {
            ...s.studio,
            error: "template data is not valid JSON object",
          },
        };
      }
      return {
        studio: {
          ...s.studio,
          baseData: parsed,
          edits: {},
          cleared: [],
          error: null,
        },
      };
    }),

  studioSetField: (name, value) =>
    set((s) => ({
      studio: {
        ...s.studio,
        edits: { ...s.studio.edits, [name]: value },
        cleared: s.studio.cleared.filter((k) => k !== name),
      },
    })),

  studioClearField: (name) =>
    set((s) => {
      const { [name]: _drop, ...edits } = s.studio.edits;
      const cleared = s.studio.cleared.includes(name)
        ? s.studio.cleared
        : [...s.studio.cleared, name];
      return { studio: { ...s.studio, edits, cleared } };
    }),

  studioToggleAdvanced: () =>
    set((s) => ({ studio: { ...s.studio, advanced: !s.studio.advanced } })),

  studioSerialize: () => {
    const { baseData, edits, cleared } = get().studio;
    return serializeStudioData(baseData, edits, cleared);
  },

  // ---- composer (act #3) ----
  studioBeginComposer: (seed) =>
    set((s) => {
      // "Author a new kind from this →" makes the seed's CLASS the superclass
      // (`class New extends <added>(Coin) {}`): the seed's own mixins become
      // the read-only inherited segment and the added-mixin stack starts
      // EMPTY. (The old behavior decomposed the seed into root + mixins, which
      // rebuilt the seed's exact signature — colliding with it as a dup.)
      const composer: ComposerState = seed
        ? { name: "", base: baseFromBlueprint(seed), orderedMixins: [] }
        : { ...EMPTY_COMPOSER };
      return {
        studio: {
          ...s.studio,
          view: "composer",
          composer,
          scaffoldSource: null,
          scaffoldTarget: null,
          scaffoldDraftPath: null,
          commitDisposition: null,
          commitReloaded: false,
          commitMessage: null,
        },
      };
    }),

  studioComposerSetName: (name) =>
    set((s) => ({
      studio: { ...s.studio, composer: { ...s.studio.composer, name } },
    })),

  studioComposerSetBase: (base) =>
    set((s) => {
      // Selecting from the dropdown switches to a fundamental ROOT (this is
      // also how you "switch back to a root" from an arbitrary-class base).
      const next = rootBase(base, s.studio.palette);
      // Drop any added mixin the newly-picked base already implies.
      const impliedSet = new Set(next.impliedMixins);
      const orderedMixins = s.studio.composer.orderedMixins.filter(
        (m) => !impliedSet.has(m),
      );
      return {
        studio: {
          ...s.studio,
          composer: { ...s.studio.composer, base: next, orderedMixins },
        },
      };
    }),

  studioComposerAddMixin: (name) =>
    set((s) => {
      const { composer } = s.studio;
      if (
        composer.orderedMixins.includes(name) ||
        composer.base.impliedMixins.includes(name)
      ) {
        return {};
      }
      return {
        studio: {
          ...s.studio,
          composer: {
            ...composer,
            orderedMixins: [...composer.orderedMixins, name],
          },
        },
      };
    }),

  studioComposerRemoveMixin: (name) =>
    set((s) => ({
      studio: {
        ...s.studio,
        composer: {
          ...s.studio.composer,
          orderedMixins: s.studio.composer.orderedMixins.filter(
            (m) => m !== name,
          ),
        },
      },
    })),

  studioComposerReorder: (from, to) =>
    set((s) => ({
      studio: {
        ...s.studio,
        composer: {
          ...s.studio.composer,
          orderedMixins: moveItem(s.studio.composer.orderedMixins, from, to),
        },
      },
    })),

  studioEffectiveMixins: () => {
    const { base, orderedMixins } = get().studio.composer;
    return effectiveMixins(base.impliedMixins, orderedMixins);
  },

  studioEffectiveSignature: () => {
    // The structural signature keys on the FUNDAMENTAL ROOT (a subclass shares
    // its base's signature root), not the concrete base name.
    const { base } = get().studio.composer;
    return signatureFromParts(base.rootBaseClass, get().studioEffectiveMixins());
  },

  studioMatchingBlueprints: () => {
    const { blueprints, composer } = get().studio;
    if (!blueprints) return { exact: [], superset: [] };
    return classifyMatches(
      blueprints,
      composer.base.rootBaseClass,
      get().studioEffectiveMixins(),
    );
  },

  studioScaffold: async (input, csrf) => {
    const seq = ++scaffoldSeq;
    set((s) => ({ studio: { ...s.studio, busy: true, error: null } }));
    try {
      const out = await studioClient.scaffold(input, csrf);
      // A newer scaffold superseded us while we were in flight — drop our
      // (now-stale) result and leave the state to the latest request.
      if (seq !== scaffoldSeq) return;
      set((s) => ({
        studio: {
          ...s.studio,
          busy: false,
          scaffoldSource: out.source,
          scaffoldTarget: out.targetPath,
          scaffoldDraftPath: out.draftPath ?? null,
          commitDisposition: null,
          commitReloaded: false,
          commitMessage: null,
        },
      }));
    } catch (e) {
      if (seq !== scaffoldSeq) return;
      set((s) => ({
        studio: { ...s.studio, busy: false, error: errMessage(e) },
      }));
    }
  },

  studioSetScaffoldSource: (source) =>
    set((s) => ({ studio: { ...s.studio, scaffoldSource: source } })),

  studioCommit: async (csrf) => {
    const { scaffoldTarget, scaffoldSource } = get().studio;
    if (scaffoldTarget === null || scaffoldSource === null) return;
    set((s) => ({ studio: { ...s.studio, busy: true, error: null } }));
    try {
      const out = await studioClient.commit(
        { targetPath: scaffoldTarget, source: scaffoldSource },
        csrf,
      );
      set((s) => ({
        studio: {
          ...s.studio,
          busy: false,
          commitDisposition: out.disposition,
          commitReloaded:
            out.disposition === "committed" && out.reloaded === true,
          commitMessage: out.message ?? out.reloadDetail ?? null,
        },
      }));
    } catch (e) {
      set((s) => ({
        studio: { ...s.studio, busy: false, error: errMessage(e) },
      }));
    }
  },

  studioResetScaffold: () =>
    set((s) => ({
      studio: {
        ...s.studio,
        scaffoldSource: null,
        scaffoldTarget: null,
        scaffoldDraftPath: null,
        commitDisposition: null,
        commitReloaded: false,
        commitMessage: null,
      },
    })),
  };
};
