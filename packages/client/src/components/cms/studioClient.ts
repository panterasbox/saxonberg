/**
 * studioClient — the thin `fetch` REST client for the CMS Studio surface.
 *
 * One method per Studio route (e.g. the read
 * `GET /api/studio/describe?class=&context=` → {@link ClassDescription}).
 * Mirrors `cmsClient.ts`: the session cookie rides every call
 * (`credentials: 'include'`), and non-2xx responses throw the server's
 * uniform `StudioErrorBody` (`{ code, message }`) so callers surface the
 * mapped message. Content-template *saves* do NOT go here — the composer
 * reuses the existing CMS content-write path (`cmsClient.write`).
 */

import type {
  BlueprintDetail,
  BlueprintSummary,
  ClassCommitResult,
  ClassDescription,
  CommitClassInput,
  CreateTemplateInput,
  MixinDetail,
  MixinPalette,
  ScaffoldClassInput,
  ScaffoldResult,
  StudioErrorBody,
  TemplateWriteResult,
} from "@saxonberg/types";
import { SERVER_URL } from "../../config";

/** Thrown on any non-2xx Studio response, carrying the `StudioErrorBody`. */
export class StudioClientError extends Error {
  public readonly code: string;
  public constructor(body: StudioErrorBody) {
    super(body.message);
    this.name = "StudioClientError";
    this.code = body.code;
  }
}

const BASE = `${SERVER_URL}/api/studio`;

/**
 * Read a fetch Response, returning its JSON body on 2xx or throwing a
 * {@link StudioClientError} built from the server's `{code,message}` shape
 * on any other status. Falls back to a synthetic body when the error
 * payload isn't parseable JSON (e.g. a 401 HTML page from the auth guard).
 */
async function unwrap<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }
  let body: StudioErrorBody;
  try {
    body = (await res.json()) as StudioErrorBody;
    if (typeof body.code !== "string" || typeof body.message !== "string") {
      throw new Error("malformed");
    }
  } catch {
    body = {
      code: res.status === 401 ? "denied" : "internal",
      message: res.status === 401 ? "not signed in" : `HTTP ${res.status}`,
    };
  }
  throw new StudioClientError(body);
}

export const studioClient = {
  /**
   * Describe a backing class: its effective authorable-field schema
   * joined to shapes + effective value + source. `contextPath` scopes
   * effective-value resolution to a representative instance's zone chain.
   */
  async describe(
    classPath: string,
    contextPath?: string,
  ): Promise<ClassDescription> {
    const params = new URLSearchParams({ class: classPath });
    if (contextPath) params.set("context", contextPath);
    const res = await fetch(`${BASE}/describe?${params.toString()}`, {
      credentials: "include",
    });
    return unwrap<ClassDescription>(res);
  },

  /**
   * List every catalogued blueprint — the derived skeleton (one per backing
   * class) plus the curated overlay. The class picker groups these by
   * `parent` and surfaces `blessed` first.
   */
  async listBlueprints(): Promise<BlueprintSummary[]> {
    const res = await fetch(`${BASE}/blueprints`, { credentials: "include" });
    return unwrap<BlueprintSummary[]>(res);
  },

  /** Resolve one blueprint by durable id (summary + structural signature). */
  async getBlueprint(blueprintId: string): Promise<BlueprintDetail> {
    const params = new URLSearchParams({ id: blueprintId });
    const res = await fetch(`${BASE}/blueprint?${params.toString()}`, {
      credentials: "include",
    });
    return unwrap<BlueprintDetail>(res);
  },

  /**
   * The composition palette's vocabulary — `{ mixins, bases }`: the flat
   * pickable mixin/base entry list plus each instantiable base class with its
   * implied (`_mixinName`) mixin set (for composition pre-seeding). The
   * composer picks a base + added-mixin set from these to scaffold a new
   * backing class.
   */
  async listMixins(): Promise<MixinPalette> {
    const res = await fetch(`${BASE}/mixins`, { credentials: "include" });
    return unwrap<MixinPalette>(res);
  },

  /**
   * Describe a single mixin for the composer's inspector pane — its full
   * concept comment, contributed fields, and optional HelpApi enrichment
   * (relations + methods). Read-only; the session cookie rides the call.
   */
  async describeMixin(name: string): Promise<MixinDetail> {
    const params = new URLSearchParams({ name });
    const res = await fetch(`${BASE}/mixin?${params.toString()}`, {
      credentials: "include",
    });
    return unwrap<MixinDetail>(res);
  },

  /**
   * Create a NEW content template (creation act #1 — author-tier, no wizard)
   * pointing at an already-approved backing class. CREATE-only: an existing
   * path returns `{ disposition: 'denied' }` (updates go through
   * `cmsClient.write('content', …)`). The server re-gates the code-field
   * lockdown and surfaces any refusal as a graceful `denied` disposition —
   * never a throw for the trust/existence gates. `csrf` is the shared CMS
   * double-submit token (from `cmsClient.getCsrf`).
   */
  async createTemplate(
    input: CreateTemplateInput,
    csrf: string,
  ): Promise<TemplateWriteResult> {
    const res = await fetch(`${BASE}/template`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CMS-CSRF": csrf },
      body: JSON.stringify(input),
    });
    return unwrap<TemplateWriteResult>(res);
  },

  /**
   * Scaffold a new backing class (creation act #1 — author-tier, inert text).
   * `csrf` is the shared CMS double-submit token (from `cmsClient.getCsrf`).
   */
  async scaffold(
    input: ScaffoldClassInput,
    csrf: string,
  ): Promise<ScaffoldResult> {
    const res = await fetch(`${BASE}/scaffold`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CMS-CSRF": csrf },
      body: JSON.stringify(input),
    });
    return unwrap<ScaffoldResult>(res);
  },

  /**
   * Commit a scaffolded class to source (creation act #3 — wizard-gated). The
   * server re-gates: a non-wizard receives `{ disposition: 'denied' }` (never
   * a throw). `csrf` is the shared CMS double-submit token.
   */
  async commit(
    input: CommitClassInput,
    csrf: string,
  ): Promise<ClassCommitResult> {
    const res = await fetch(`${BASE}/commit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CMS-CSRF": csrf },
      body: JSON.stringify(input),
    });
    return unwrap<ClassCommitResult>(res);
  },
};
