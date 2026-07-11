/**
 * studioSlice — the CMS Studio composer's store slice (state + actions),
 * composed into the main {@link useStore} alongside {@link CmsSlice}.
 *
 * The Studio form is a *projection over a content leaf's `template.data`*.
 * It edits only the authorable fields the P1 `describeClass` schema
 * surfaces, but `template.data` may carry other keys (non-authorable
 * runtime state, keys the scan never surfaced). The slice therefore keeps
 * the FULL parsed original in `baseData` and layers edits over it:
 *
 *   - `baseData` — the full parsed `template.data` (from the content
 *     `read` the CMS slice already performed). Untouched keys ride
 *     through verbatim.
 *   - `edits` — field → new value, for locally-changed authorable fields.
 *   - `cleared` — fields the user reset to inherit (removed on serialize
 *     so the template stops carrying a local override; the engine's
 *     resolution chain supplies the value again).
 *
 * `studioSerialize()` reconstructs the body as
 * `JSON.stringify({ ...baseData, ...edits }, null, 2)` with `cleared`
 * keys deleted — byte-identical to the raw-JSON editor for an unedited
 * round-trip (the load-bearing data-integrity invariant). Saves reuse the
 * existing CMS content-write path (`cmsSave`); the serialized string is
 * adopted as the new baseline via {@link StudioSlice.studioLoadData}.
 */

import type {
  ClassDescription,
  MixinPaletteEntry,
  ScaffoldClassInput,
  StudioDisposition,
} from "@saxonberg/types";
import { studioClient, StudioClientError } from "../components/cms/studioClient";

/** The Studio slice's state + actions. */
export interface StudioSlice {
  studio: {
    /** The described class schema, or null before a describe lands. */
    description: ClassDescription | null;
    /** The full parsed original `template.data` — the overlay base. */
    baseData: Record<string, unknown>;
    /** Locally-changed authorable fields (field → new value). */
    edits: Record<string, unknown>;
    /** Fields reset to inherit — removed on serialize. */
    cleared: string[];
    /** Raw-JSON advanced-mode toggle. */
    advanced: boolean;
    /** True while a describe is in flight. */
    loading: boolean;
    /** Last inline error (describe or parse), or null. */
    error: string | null;

    // ---- P4: composition palette + new-class scaffold/commit ----
    /** The composition palette vocabulary (base classes + mixins), or null. */
    mixins: MixinPaletteEntry[] | null;
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
     * class-then-template ordering gate. The follow-on template-creation step
     * is blocked until this is true (a `denied` commit never sets it).
     */
    commitReloaded: boolean;
    /** Human detail for the last commit (reloadDetail or denial message). */
    commitMessage: string | null;
    /** True while a scaffold/commit POST is in flight. */
    busy: boolean;
  };

  /** Fetch a class's authorable-field schema for the composer. */
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

  // ---- P4 actions ----
  /** Fetch the composition palette vocabulary (idempotent-ish; refetches). */
  studioListMixins: () => Promise<void>;
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
 * effective data: spread preserves `baseData`'s key insertion order,
 * edits to existing keys keep their slot, brand-new authorable keys
 * append, and `cleared` keys are removed. Exported for the round-trip
 * test.
 */
export function serializeStudioData(
  baseData: Record<string, unknown>,
  edits: Record<string, unknown>,
  cleared: readonly string[],
): string {
  const merged: Record<string, unknown> = { ...baseData, ...edits };
  for (const key of cleared) {
    delete merged[key];
  }
  return JSON.stringify(merged, null, 2);
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
): StudioSlice => ({
  studio: {
    description: null,
    baseData: {},
    edits: {},
    cleared: [],
    advanced: false,
    loading: false,
    error: null,
    mixins: null,
    scaffoldSource: null,
    scaffoldTarget: null,
    scaffoldDraftPath: null,
    commitDisposition: null,
    commitReloaded: false,
    commitMessage: null,
    busy: false,
  },

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
      // Adopt the parsed data as the fresh baseline; drop the overlay.
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

  studioListMixins: async () => {
    try {
      const mixins = await studioClient.listMixins();
      set((s) => ({ studio: { ...s.studio, mixins } }));
    } catch (e) {
      set((s) => ({ studio: { ...s.studio, error: errMessage(e) } }));
    }
  },

  studioScaffold: async (input, csrf) => {
    set((s) => ({ studio: { ...s.studio, busy: true, error: null } }));
    try {
      const out = await studioClient.scaffold(input, csrf);
      set((s) => ({
        studio: {
          ...s.studio,
          busy: false,
          scaffoldSource: out.source,
          scaffoldTarget: out.targetPath,
          scaffoldDraftPath: out.draftPath ?? null,
          // A fresh scaffold clears any prior commit disposition + the
          // follow-on ordering gate.
          commitDisposition: null,
          commitReloaded: false,
          commitMessage: null,
        },
      }));
    } catch (e) {
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
          // Ordering gate: only a committed + reloaded class unlocks the
          // follow-on template step. A `denied` (or not-live) commit does not.
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
});
