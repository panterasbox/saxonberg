/**
 * Cross-cutting error and rejection types.
 *
 * Home for "we're saying no, with a reason" shapes that the engine
 * uses everywhere — both **thrown** errors (the usual JS sense) and
 * **returned** rejections (e.g. Witness veto results, where exceptions
 * for flow control would be an anti-pattern but the conceptual shape
 * is identical to a thrown one).
 *
 * Subsystem-specific exceptions stay with their subsystem
 * (`lib/security/errors.ts`, `api/containment.ts`'s `ContainmentError`,
 * etc.). This file is for shapes that any subsystem might use.
 */

/**
 * Return shape for "may I do this?" predicate hooks — the canonical
 * Witness `can*` veto signature dispatched by the chokepoint Apis
 * (`ContainmentApi.move`, `Mobile.traverse`, `ConnectionApi.transfer`,
 * `StuffApi.destruct`).
 *
 * `{ ok: true }` lets the operation proceed; `{ ok: false, reason }`
 * vetos with a human-readable explanation. The chokepoint Api wraps
 * the reason into the appropriate error type for its layer
 * (`ContainmentError`, `DestructError`, etc.).
 *
 * Hooks that don't care return `undefined` (the optional method
 * isn't implemented at all) — the dispatcher treats that as
 * "no opinion."
 */
export type VetoResult = { ok: true } | { ok: false; reason: string };

/**
 * Programmatic-contract violation thrown by `StuffApi.destruct()` when
 * a target's `canDestruct()` witness vetoes the destruction. Mirrors
 * the shape of `ContainmentError` — separately named so callers can
 * catch destruct-specific failures without overlapping the
 * containment surface.
 *
 * `forceDestruct()` does not raise this even when `canDestruct()`
 * returns `{ ok: false }` — the witness still fires for observability,
 * but force-bypass intentionally ignores the veto.
 */
export class DestructError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = 'DestructError';
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}

/**
 * ⭐ Programmatic-contract violation: an act that WRITES — puts something
 * into the world — was asked of a subject that stands nowhere
 * (`environment === null`). The pot that breaks needs the place it stood
 * for its sherds; a spill needs a floor.
 *
 * Reads never throw this: detachment is a normal state for a read (the
 * matrix in `docs/subsystems/spatial.md` § Detached Stuff). A write never
 * skips silently and never invents a place: it checks its subject BEFORE
 * it changes anything, and throws this. The command boundary absorbs it as
 * a `controller-error` note and records an author diagnostic; a scheduled
 * root records and swallows it — so the defect is told, not buried.
 */
export class DetachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DetachedError';
  }
}

/**
 * ⭐⭐ **A cited document (or vocabulary) was read synchronously and is not
 * resident — an ENGINE DEFECT, never a player-facing refusal.**
 *
 * The rule it guards (documents path identity, D7): whatever a resident
 * thing cites is resident too, *by construction* — an authored citation
 * loads through its field's awaited setter, restored state through the same
 * setters, a runtime write in an act that already holds the document, and a
 * class's own built-in citations in its `onCreate`. A synchronous read that
 * finds the document missing means one of those mechanisms was skipped, and
 * this throw names the kind and the path so the gap is found, loudly, rather
 * than read as "nothing there". Nothing catches it to degrade.
 */
export class DocumentNotResidentError extends Error {
  constructor(
    public readonly kind: string,
    public readonly path: string,
  ) {
    super(
      `${kind} '${path}' was read but is not resident — whatever cites it ` +
        `should have loaded it (an engine defect, not a missing row)`,
    );
    this.name = 'DocumentNotResidentError';
  }
}

/**
 * ⭐ A pack reason's code: its row's full path (`/trade/forestry/reasons/
 * wrong-tool`). A bare word is the platform's (`locked` →
 * `/platform/reasons/locked`), the `shape:` rule. A protocol whose host may
 * be a pack's adds `ActRefusal<ReasonPath, RefusalFacts>` as an open arm.
 */
export type ReasonPath = `/${string}`;

/**
 * One fact a refusal carries — what its row's `says` words. A thing is the
 * live thing (the row's presentation filters word it for the reader); a
 * list is several; text and a number are themselves.
 */
export type RefusalFact = object | readonly object[] | string | number;

/** A refusal's facts, by the names its row declares. */
export type RefusalFacts = Readonly<Record<string, RefusalFact>>;

/**
 * ⭐⭐ **The one thrown refusal** (failure-model D3): the act was refused,
 * and it says why — a `reason` (a row's code: a bare word is the
 * platform's, anything else a full path) and the `facts` that row words.
 *
 * Thrown or returned, a refusal is the same thing downstream: a returned
 * one is `{ ok: false, reason, facts }` (`ActRefusal`), and
 * `CommandContext.refuse` takes either. The guarded root words a thrown
 * one from its row exactly as it words a returned one, and a script may
 * handle it (`try … on <reason>`).
 *
 * ⚠ Not a bug and not a content error: those stay a plain `Error` and a
 * {@link ContentError}, and no script may ever catch them.
 */
export class Refusal extends Error {
  public readonly reason: string;
  public readonly facts: RefusalFacts;
  /** The script line that was refused, when a script stopped here. */
  public readonly at?: string;
  public readonly cause?: unknown;

  /**
   * `opts.message` is for the log and for a caller outside the game that
   * reads an error's message (a REST route); a player never reads it — the
   * row words the refusal.
   */
  constructor(
    reason: string,
    facts: RefusalFacts = {},
    opts?: { at?: string; cause?: unknown; message?: string },
  ) {
    super(opts?.message ?? `refused: ${reason}`);
    this.name = 'Refusal';
    this.reason = reason;
    this.facts = facts;
    if (opts?.at !== undefined) this.at = opts.at;
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }

  /** The same refusal, at a script line. */
  public atLine(line: string): Refusal {
    return new Refusal(this.reason, this.facts, { at: line, cause: this.cause, message: this.message });
  }
}

/**
 * ⭐ **Not now — try again** (failure-model D8): a dependency the act needs
 * is not there (the records store). A {@link Refusal} because its
 * consumers act as on one — the player is told, a script may handle it
 * (`on unavailable`) — and its own class because one consumer acts
 * differently: the root also records a diagnostic.
 */
export class Unavailable extends Refusal {
  constructor(what: string, opts?: { cause?: unknown; message?: string }) {
    super('unavailable', { what }, opts);
    this.name = 'Unavailable';
  }
}

/**
 * ⭐⭐ **A content row is wrong** (failure-model D6) — a recipe naming a band
 * that is not one, a reference to a row nobody ships. Refused at install and
 * at a save where it can be checked; thrown at play only for what was forced
 * past those. The root tells the player something went wrong with
 * {@link ContentError.what} and sends the diagnostic to whoever holds title
 * over {@link ContentError.row} — never to an unrelated wizard.
 *
 * ⚠ Not a {@link Refusal}: nothing the player did was refused, and no
 * script may catch it.
 */
export class ContentError extends Error {
  /** The row's path — whose maintainer is told. */
  public readonly row: string;
  /** The field at fault, when one is. */
  public readonly field: string | null;
  /** The row in world terms (`the horseshoe recipe`). */
  public readonly what: string;
  public readonly cause?: unknown;

  constructor(row: string, field: string | null, message: string, opts?: { what?: string; cause?: unknown }) {
    super(`${row}${field ? ` (${field})` : ''}: ${message}`);
    this.name = 'ContentError';
    this.row = row;
    this.field = field;
    this.what = opts?.what ?? ContentError.whatOf(row);
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }

  /** `/trade/smithing/recipes/horseshoe` → `the horseshoe recipe`. */
  private static whatOf(row: string): string {
    const parts = row.split('/').filter((p) => p !== '');
    const leaf = parts[parts.length - 1] ?? row;
    const dir = parts[parts.length - 2];
    const kind = dir ? dir.replace(/s$/, '') : '';
    return kind ? `the ${leaf} ${kind}` : `the ${leaf}`;
  }
}
