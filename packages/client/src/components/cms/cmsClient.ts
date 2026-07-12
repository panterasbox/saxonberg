/**
 * cmsClient — the thin `fetch` REST client for the CMS data surface.
 *
 * One method per CMS route (`/api/cms/{csrf,tree,read,stat,write}`), each
 * a 1:1 binding to a `CmsApi` op behind the server's attribution bridge.
 * All calls carry the session cookie (`credentials: 'include'`); writes
 * additionally send the double-submit CSRF token in the `X-CMS-CSRF`
 * header. Non-2xx responses throw the server's uniform `CmsErrorBody`
 * (`{ error, message }`) so callers surface the mapped message rather
 * than a generic failure — the CMS tab opens NO WebSocket; this is the
 * only channel.
 */

import type {
  CmsBackend,
  CmsErrorBody,
  CmsReadResult,
  CmsStatResult,
  CmsTreeListing,
  CmsWriteRequest,
  CmsWriteResult,
  DiagnosticDoc,
} from "@saxonberg/types";
import { SERVER_URL } from "../../config";

/** Thrown on any non-2xx CMS response, carrying the server `CmsErrorBody`. */
export class CmsClientError extends Error {
  public readonly code: string;
  public constructor(body: CmsErrorBody) {
    super(body.message);
    this.name = "CmsClientError";
    this.code = body.error;
  }
}

const BASE = `${SERVER_URL}/api/cms`;

/**
 * Read a fetch Response, returning its JSON body on 2xx or throwing a
 * {@link CmsClientError} built from the server's `{error,message}` shape
 * on any other status. Falls back to a synthetic body when the error
 * payload isn't parseable JSON (e.g. a 401 HTML page from the auth
 * guard).
 */
async function unwrap<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }
  let body: CmsErrorBody;
  try {
    body = (await res.json()) as CmsErrorBody;
    if (typeof body.error !== "string" || typeof body.message !== "string") {
      throw new Error("malformed");
    }
  } catch {
    body = {
      error: res.status === 401 ? "denied" : "internal",
      message: res.status === 401 ? "not signed in" : `HTTP ${res.status}`,
    };
  }
  throw new CmsClientError(body);
}

function qs(backend: CmsBackend, path: string): string {
  const params = new URLSearchParams({ backend, path });
  return params.toString();
}

export const cmsClient = {
  /** Mint a fresh CSRF token; the client sends it on every write. */
  async getCsrf(): Promise<string> {
    const res = await fetch(`${BASE}/csrf`, { credentials: "include" });
    const out = await unwrap<{ token: string }>(res);
    return out.token;
  },

  /** List the immediate children of one folder node. */
  async listTree(backend: CmsBackend, path: string): Promise<CmsTreeListing> {
    const res = await fetch(`${BASE}/tree?${qs(backend, path)}`, {
      credentials: "include",
    });
    return unwrap<CmsTreeListing>(res);
  },

  /** Read the editable body of one leaf. */
  async read(backend: CmsBackend, path: string): Promise<CmsReadResult> {
    const res = await fetch(`${BASE}/read?${qs(backend, path)}`, {
      credentials: "include",
    });
    return unwrap<CmsReadResult>(res);
  },

  /** Lightweight existence/kind probe. */
  async stat(backend: CmsBackend, path: string): Promise<CmsStatResult> {
    const res = await fetch(`${BASE}/stat?${qs(backend, path)}`, {
      credentials: "include",
    });
    return unwrap<CmsStatResult>(res);
  },

  /**
   * Persist a leaf's body. `csrf` is the token from {@link getCsrf};
   * the server compares the `X-CMS-CSRF` header against the session
   * token and 403s on mismatch.
   */
  async write(
    backend: CmsBackend,
    path: string,
    body: string,
    csrf: string,
  ): Promise<CmsWriteResult> {
    const payload: CmsWriteRequest = { backend, path, body };
    const res = await fetch(`${BASE}/write`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CMS-CSRF": csrf,
      },
      body: JSON.stringify(payload),
    });
    return unwrap<CmsWriteResult>(res);
  },

  /**
   * Read the author-diagnostics store (the diagnostics panel). Read-only;
   * the server resolves the acting author from the session and applies the
   * author-tier gate + non-wizard compile redaction. `mine` is the
   * spoof-safe "my content" lens (server-resolved).
   */
  async diagnostics(
    filter: {
      channel?: string;
      severity?: string;
      source?: string;
      path?: string;
      mine?: boolean;
      limit?: number;
    } = {},
  ): Promise<DiagnosticDoc[]> {
    const params = new URLSearchParams();
    if (filter.channel) params.set("channel", filter.channel);
    if (filter.severity) params.set("severity", filter.severity);
    if (filter.source) params.set("source", filter.source);
    if (filter.path) params.set("path", filter.path);
    if (filter.mine) params.set("mine", "true");
    if (filter.limit != null) params.set("limit", String(filter.limit));
    const res = await fetch(`${BASE}/diagnostics?${params.toString()}`, {
      credentials: "include",
    });
    const body = await unwrap<{ diagnostics: DiagnosticDoc[] }>(res);
    return body.diagnostics;
  },
};
