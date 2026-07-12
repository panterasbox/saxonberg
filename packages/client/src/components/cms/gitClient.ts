/**
 * gitClient — the thin `fetch` REST client for the in-runtime VCS surface.
 *
 * One method per git route (`/api/git/{csrf,status,diff,log,publish,
 * revert}`), each a 1:1 binding to a gated `GitApi` op behind the server's
 * attribution bridge. All calls carry the session cookie
 * (`credentials: "include"`); writes send the double-submit CSRF token in
 * the `X-CMS-CSRF` header (the shared CMS session slot). Non-2xx responses
 * throw the server's uniform `GitErrorBody` (`{ error, message }`) so the
 * panel surfaces the mapped message.
 */

import type {
  GitStatusResult,
  GitDiffResult,
  GitLogEntry,
  GitPublishResult,
  GitRevertResult,
  GitErrorBody,
} from "@saxonberg/types";
import { SERVER_URL } from "../../config";

/** Thrown on any non-2xx git response, carrying the server `GitErrorBody`. */
export class GitClientError extends Error {
  public readonly code: string;
  public constructor(body: GitErrorBody) {
    super(body.message);
    this.name = "GitClientError";
    this.code = body.error;
  }
}

const BASE = `${SERVER_URL}/api/git`;

/**
 * Read a fetch Response, returning its JSON body on 2xx or throwing a
 * {@link GitClientError} built from the server's `{error,message}` shape
 * on any other status. Falls back to a synthetic body when the error
 * payload isn't parseable JSON (e.g. a 401 HTML page from the auth guard).
 */
async function unwrap<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }
  let body: GitErrorBody;
  try {
    body = (await res.json()) as GitErrorBody;
    if (typeof body.error !== "string" || typeof body.message !== "string") {
      throw new Error("malformed");
    }
  } catch {
    body = {
      error: res.status === 401 ? "denied" : "internal",
      message: res.status === 401 ? "not signed in" : `HTTP ${res.status}`,
    };
  }
  throw new GitClientError(body);
}

export const gitClient = {
  /** Mint a fresh CSRF token; the client sends it on every write. */
  async getCsrf(): Promise<string> {
    const res = await fetch(`${BASE}/csrf`, { credentials: "include" });
    const out = await unwrap<{ token: string }>(res);
    return out.token;
  },

  /** Branch/divergence summary + the dirty set + warnings. */
  async status(): Promise<GitStatusResult> {
    const res = await fetch(`${BASE}/status`, { credentials: "include" });
    return unwrap<GitStatusResult>(res);
  },

  /** Working-tree patch, optionally scoped to one path. */
  async diff(path?: string): Promise<GitDiffResult> {
    const qs = path ? `?path=${encodeURIComponent(path)}` : "";
    const res = await fetch(`${BASE}/diff${qs}`, { credentials: "include" });
    return unwrap<GitDiffResult>(res);
  },

  /** Recent commits. */
  async log(opts: { limit?: number; path?: string } = {}): Promise<
    GitLogEntry[]
  > {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.path) params.set("path", opts.path);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${BASE}/log${suffix}`, { credentials: "include" });
    return unwrap<GitLogEntry[]>(res);
  },

  /**
   * Snapshot-and-push the writable dirty files. `csrf` is the token from
   * {@link getCsrf}; the server compares the `X-CMS-CSRF` header against
   * the session token and 403s on mismatch.
   */
  async publish(message: string, csrf: string): Promise<GitPublishResult> {
    const res = await fetch(`${BASE}/publish`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CMS-CSRF": csrf,
      },
      body: JSON.stringify({ message }),
    });
    return unwrap<GitPublishResult>(res);
  },

  /** Additively revert a commit (scoped to what you may write). */
  async revert(sha: string, csrf: string): Promise<GitRevertResult> {
    const res = await fetch(`${BASE}/revert`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CMS-CSRF": csrf,
      },
      body: JSON.stringify({ sha }),
    });
    return unwrap<GitRevertResult>(res);
  },
};
