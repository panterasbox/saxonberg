/**
 * DiagnosticChannel — the pure channel taxonomy for author diagnostics.
 *
 * A *channel* is a routing key computed once from an absolute source /
 * template path at write time and stored on the row. It also drives the
 * mudlog category and the subscription grammar. The mapping is a pure,
 * total function of the path — no gating, no IO — which is why it lives
 * as a value/vocabulary module in `lib/diagnostics/` rather than on the
 * (proxy-wrapped, gated) logic singleton. `DiagnosticApi` re-exports
 * these as statics so authors discover them on the Api face while the
 * pure logic stays unit-testable in isolation.
 *
 * Taxonomy (first match wins):
 *
 * | Path pattern                          | Channel          |
 * |---------------------------------------|------------------|
 * | zone content (`/…/zones/<zone>/…`,    | `zone.<zone>`    |
 * |   `/lib/lounge/…`)                     |                  |
 * | `/…/lib/<subsystem>/…`                | `lib.<subsystem>`|
 * | `/…/obj/command/…`                    | `command`        |
 * | `/…/api/…`                            | `api`            |
 * | anything else / null                  | `global`         |
 *
 * See [diagnostics-slate.md](../../../../../docs/slates/builds/diagnostics-slate.md).
 */

/** The catch-all channel for unresolved / uncategorised paths. */
export const GLOBAL_CHANNEL = "global";

/** Context the subscription expander needs — the author's source cwd. */
export interface SubscribeContext {
  cwd?: string | null;
}

/**
 * The pure channel taxonomy, as a static-method value-object (the module's
 * one concept — no free-floating exported functions per the export
 * discipline). `DiagnosticApi` re-exports these on its face.
 */
export class DiagnosticChannel {
  private constructor() {}

  /**
   * Compute the channel for an absolute path. Total: a `null`/empty path or
   * any unmatched shape falls through to {@link GLOBAL_CHANNEL}.
   */
  static pathToChannel(absPath: string | null | undefined): string {
    if (!absPath) return GLOBAL_CHANNEL;
    const p = absPath.replace(/\\/g, "/");

    // Zone content: an explicit `/zones/<zone>/` segment, or the authored
    // lounge tree (`/lib/lounge/...` — the lounge is the exemplar zone).
    const zoneSeg = p.match(/\/zones\/([^/]+)\//);
    if (zoneSeg && zoneSeg[1]) return `zone.${zoneSeg[1]}`;
    const lounge = p.match(/\/(?:lib|obj|domain)\/lounge(?:\/|$)/);
    if (lounge) return "zone.lounge";

    // Command controllers/views before the generic lib arm.
    if (/\/obj\/command\//.test(p) || /\/cmd\//.test(p)) return "command";

    // A lib subsystem: `/lib/<subsystem>/...`.
    const lib = p.match(/\/lib\/([^/]+)\//);
    if (lib && lib[1]) return `lib.${lib[1]}`;

    // Api faces.
    if (/\/api\//.test(p)) return "api";

    return GLOBAL_CHANNEL;
  }

  /**
   * Expand a list of subscription patterns into concrete matchers, resolving
   * the synthetic `$cwd` token to the channel of the author's current source
   * cwd (live, so `cd`-ing re-routes without mutating stored settings). All
   * other patterns pass through verbatim. Duplicates are collapsed.
   *
   * Pattern grammar (evaluated by {@link matches}):
   *   - `*`               — any channel
   *   - `$cwd`            — resolves here to `pathToChannel(cwd)`
   *   - `lib.*` (suffix)  — prefix match on the dot-stem
   *   - `zone.cliffside`  — exact match
   */
  static expandSubscription(
    patterns: readonly string[],
    ctx: SubscribeContext
  ): readonly string[] {
    const out: string[] = [];
    for (const raw of patterns) {
      const pat =
        raw === "$cwd" ? DiagnosticChannel.pathToChannel(ctx.cwd ?? null) : raw;
      if (!out.includes(pat)) out.push(pat);
    }
    return out;
  }

  /**
   * Does `channel` satisfy any of the already-{@link expandSubscription}ed
   * patterns? `*` matches everything; a trailing `.*` is a prefix match on
   * the stem before it; otherwise exact.
   */
  static matches(channel: string, expanded: readonly string[]): boolean {
    for (const pat of expanded) {
      if (pat === "*") return true;
      if (pat.endsWith(".*")) {
        const stem = pat.slice(0, -2);
        if (channel === stem || channel.startsWith(`${stem}.`)) return true;
      } else if (channel === pat) {
        return true;
      }
    }
    return false;
  }
}
