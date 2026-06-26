/**
 * cmsSlice — the CMS editor's store slice (state + actions), composed
 * into the main {@link useStore} alongside the other slices.
 *
 * The CMS surface is REST-only (no WebSocket), so unlike `forumActions` /
 * `reactionActions` this slice owns its own async IO directly via
 * `cmsClient`: actions fetch + mutate store state in one place. The slice
 * shape: a CSRF token, the lazily-cached explorer
 * tree (`expanded` + `children`), the currently-open leaf (`open` +
 * `draft` + `dirty`), and the save lifecycle (`saving` + `error`).
 *
 * Node key is `${backend}:${path}` throughout — the canonical identifier
 * for a node across the two backends (there is no merged namespace).
 */

import type { CmsBackend, CmsNodeKind, CmsTreeEntry } from "@saxonberg/types";
import { cmsClient, CmsClientError } from "../components/cms/cmsClient";

/** The currently-open leaf — the editor's subject. */
export interface CmsOpenLeaf {
  backend: CmsBackend;
  path: string;
  kind: CmsNodeKind;
  language: string;
  /** The persisted body as last read/saved — the dirty baseline. */
  body: string;
  templateMeta?: { class: string; hydratorClass?: string };
}

/** The CMS slice's state + actions. */
export interface CmsSlice {
  cms: {
    /** CSRF token for writes; null until {@link CmsActions.cmsInit}. */
    csrf: string | null;
    /** Which folder nodes are expanded, keyed by `${backend}:${path}`. */
    expanded: Record<string, boolean>;
    /** Cached children per expanded folder, keyed by `${backend}:${path}`. */
    children: Record<string, CmsTreeEntry[]>;
    /** The open leaf, or null when nothing is open. */
    open: CmsOpenLeaf | null;
    /** The editor's live draft (diverges from `open.body` while editing). */
    draft: string;
    /** True when `draft !== open.body`. */
    dirty: boolean;
    /** True while a save is in flight. */
    saving: boolean;
    /** Last inline error (load or save), or null. */
    error: string | null;
    /** Last go-live note from a successful save (e.g. "re-hydrated 1…"). */
    notice: string | null;
  };

  /** Fetch the CSRF token (idempotent; call on entering the surface). */
  cmsInit: () => Promise<void>;
  /** Toggle a folder; lazy-loads + caches children on first expand. */
  cmsExpand: (backend: CmsBackend, path: string) => Promise<void>;
  /** Open a leaf: REST read → set `open` + reset `draft`/`dirty`. */
  cmsOpen: (backend: CmsBackend, path: string) => Promise<void>;
  /** Update the editor draft; recomputes `dirty` against `open.body`. */
  cmsEditDraft: (text: string) => void;
  /** Persist the draft via REST write; surfaces go-live note or error. */
  cmsSave: () => Promise<void>;
  /** Clear the inline error banner. */
  cmsCloseError: () => void;
}

/** Compose the node key from a backend + path. */
export function cmsNodeKey(backend: CmsBackend, path: string): string {
  return `${backend}:${path}`;
}

function errMessage(e: unknown): string {
  if (e instanceof CmsClientError) return e.message;
  if (e instanceof Error) return e.message;
  return "unexpected error";
}

/**
 * Slice creator in the zustand `(set, get)` shape. Merged into the main
 * store's object literal so its state + actions sit on the same flat
 * `StoreState` the rest of the app reads.
 */
export const createCmsSlice = (
  set: (
    partial: Partial<CmsSlice> | ((state: CmsSlice) => Partial<CmsSlice>),
  ) => void,
  get: () => CmsSlice,
): CmsSlice => ({
  cms: {
    csrf: null,
    expanded: {},
    children: {},
    open: null,
    draft: "",
    dirty: false,
    saving: false,
    error: null,
    notice: null,
  },

  cmsInit: async () => {
    if (get().cms.csrf) return;
    try {
      const token = await cmsClient.getCsrf();
      set((s) => ({ cms: { ...s.cms, csrf: token } }));
    } catch (e) {
      set((s) => ({ cms: { ...s.cms, error: errMessage(e) } }));
    }
  },

  cmsExpand: async (backend, path) => {
    const key = cmsNodeKey(backend, path);
    const { expanded, children } = get().cms;
    // Collapse if already expanded — pure toggle, keep the cache warm.
    if (expanded[key]) {
      set((s) => ({
        cms: { ...s.cms, expanded: { ...s.cms.expanded, [key]: false } },
      }));
      return;
    }
    // Expand. Use the cache if present; otherwise fetch + cache.
    if (children[key]) {
      set((s) => ({
        cms: { ...s.cms, expanded: { ...s.cms.expanded, [key]: true } },
      }));
      return;
    }
    try {
      const listing = await cmsClient.listTree(backend, path);
      set((s) => ({
        cms: {
          ...s.cms,
          expanded: { ...s.cms.expanded, [key]: true },
          children: { ...s.cms.children, [key]: listing.entries },
        },
      }));
    } catch (e) {
      set((s) => ({ cms: { ...s.cms, error: errMessage(e) } }));
    }
  },

  cmsOpen: async (backend, path) => {
    try {
      const result = await cmsClient.read(backend, path);
      set((s) => ({
        cms: {
          ...s.cms,
          open: {
            backend: result.backend,
            path: result.path,
            kind: result.kind,
            language: result.language,
            body: result.body,
            ...(result.templateMeta
              ? { templateMeta: result.templateMeta }
              : {}),
          },
          draft: result.body,
          dirty: false,
          error: null,
          notice: null,
        },
      }));
    } catch (e) {
      set((s) => ({ cms: { ...s.cms, error: errMessage(e) } }));
    }
  },

  cmsEditDraft: (text) =>
    set((s) => {
      if (!s.cms.open) return {};
      const dirty = text !== s.cms.open.body;
      if (s.cms.draft === text && s.cms.dirty === dirty) return {};
      return { cms: { ...s.cms, draft: text, dirty } };
    }),

  cmsSave: async () => {
    const { open, draft, csrf, dirty } = get().cms;
    if (!open || !dirty) return;
    if (!csrf) {
      set((s) => ({
        cms: { ...s.cms, error: "no CSRF token; reload the surface" },
      }));
      return;
    }
    set((s) => ({
      cms: { ...s.cms, saving: true, error: null, notice: null },
    }));
    try {
      const result = await cmsClient.write(
        open.backend,
        open.path,
        draft,
        csrf,
      );
      const notice = result.reloaded
        ? result.reloadDetail
          ? `saved · ${result.reloadDetail}`
          : "saved · reloaded"
        : result.reloadDetail
          ? `saved (not live: ${result.reloadDetail})`
          : "saved";
      set((s) => ({
        cms: {
          ...s.cms,
          saving: false,
          // Adopt the draft as the new persisted baseline → no longer dirty.
          open: s.cms.open ? { ...s.cms.open, body: draft } : null,
          dirty: false,
          notice,
        },
      }));
    } catch (e) {
      set((s) => ({ cms: { ...s.cms, saving: false, error: errMessage(e) } }));
    }
  },

  cmsCloseError: () =>
    set((s) =>
      s.cms.error === null ? {} : { cms: { ...s.cms, error: null } },
    ),
});
