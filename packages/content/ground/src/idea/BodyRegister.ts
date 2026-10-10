/**
 * BodyRegister — **how much has come out of a fluid body, and by whose
 * straw** (drilling D2).
 *
 * ## Why this is not state on the wellhead
 *
 * A hole is a thing you stand at and its depth is its own business, so
 * the hole's state lives on the hole. But the **body** is not: it spans
 * whatever holdings happen to lie over it, and two bores into one
 * reservoir are *two straws in one glass*. If withdrawal lived on each
 * wellhead, each one would think the glass full — which is the whole
 * substance of the question the design wants a polity to argue over, so
 * it has to be true in the model before anybody can argue about it.
 *
 * So: the record is about the BODY, and the straws are entries in it.
 * Remaining is `capacityOf(body) − Σ drawn`, and pressure at any one
 * wellhead is read off that sum, which is why two owners watch the same
 * gauge fall.
 *
 * ## What the record holds
 *
 * Only what cannot derive — the fishery's rule exactly. Capacity is
 * **never stored**: it is the body's authored pin or its geometry, and
 * storing it would let a copy of the record outlive an edit to the row.
 * The document holds the per-straw draw and when it started.
 *
 * ⚠ Written **only on a draw**, never on a read. A body nobody has
 * tapped has no document at all, which is what makes *every structure
 * in the realm is already a reservoir* true at zero cost.
 *
 * ## Recharge is ZERO, and that is a recharge law
 *
 * The RGO spine's four legs are reservoir · recharge · act · credit, and
 * a reservoir whose recharge is **zero** is not a missing leg — it is
 * depletion, the degenerate and most honest case. Nothing here decays
 * back toward full; there is no half-life and no window. A body that is
 * drawn out is drawn out, and the consequence is that an oil country is
 * a boom with an end in it rather than a renewable farm.
 *
 * ## Why GROUND keeps it
 *
 * *A system is true whether or not anyone is participating in it.* The
 * bodies are in the rock whether or not anybody drills, the record reads
 * the column (which is this pack's), and a second consumer — a brine
 * works, a water utility sinking a municipal well — would have no common
 * pack ancestor below `ground`. The trade depends on the ground; the
 * ground learns nothing about drilling.
 *
 * See [docs/subsystems/ground.md] and [docs/subsystems/drilling.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import {
  RegistrarMixin,
  type Registrar,
} from '@saxonberg/server/mud/lib/document/Register';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** Where the register lives in the document tree — titled to the ground group. */
export const BODY_PREFIX = '/system/ground/bodies';
/** The document kind the platform declares for a body's withdrawal. */
export const BODY_KIND = 'body';
/** The branch the register's documents are owned by: the ground system. */
export const BODY_OWNER = '/system/ground';
/** The singleton's own template path — its row ships with this pack. */
export const BODY_REGISTER_PATH = '/system/ground/idea/BodyRegister';

/**
 * Which body, anywhere in the realm: the covering locality's claimed
 * address, then the body's key within its column.
 *
 * ⭐ The address is the same string the column's seed derives from, so a
 * body's record and a body's geology are keyed on the same fact and
 * cannot drift. The slashes are kept, so a locality's whole book is a
 * PREFIX read with no join — the map's rule.
 */
export interface BodyRef {
  /** The covering Locality's claimed address. */
  address: string;
  /** The body's key within its column. */
  key: string;
}

/** The record — only what cannot derive. */
export interface BodyRecord {
  bodyRef: BodyRef;
  /**
   * Per **straw**, keyed on the wellhead's identity path: litres drawn
   * and never given back. ⚠ Identity, not template path — every minted
   * wellhead would otherwise collapse into one entry.
   */
  drawn: Record<string, number>;
  /** Game-seconds the first straw went in. */
  since: number;
}

export default class BodyRegister extends RegistrarMixin(Idea) {
  constructor() {
    super();
    this.registerPrefix = BODY_PREFIX;
    this.registerOwner = BODY_OWNER;
    this.registerKind = BODY_KIND;
  }

  /** A load-bearing singleton with a gated write surface is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the body register is the register itself' };
  }

  // ---------- the reads ----------

  /**
   * A body's record, or `null` where nobody has drawn from it.
   *
   * ⚠ The prefix check is the security boundary, not the `kind` tag: a
   * tag is forgeable and a path under a branch titled to the ground
   * group is not.
   */
  public async read(ref: BodyRef): Promise<BodyRecord | null> {
    const path = pathOf(ref);
    if (path === null || !isRegisterPath(path)) return null;
    const doc = await DocumentApi.read(path);
    if (doc === null) return null;
    if (!isRegisterPath(doc.getPath())) return null;
    if (doc.getKind() !== BODY_KIND) return null;
    return recordOf(doc.getData());
  }

  /**
   * Total litres taken out of a body by every straw. `0` where nothing
   * has been drawn — which is the ordinary answer, because most
   * structures in a realm have never been bored.
   */
  public async drawnFrom(ref: BodyRef): Promise<number> {
    const record = await this.read(ref);
    if (record === null) return 0;
    return sumDrawn(record);
  }

  /** What one straw has taken. `0` for a straw the book has never seen. */
  public async drawnBy(ref: BodyRef, strawKey: string): Promise<number> {
    const record = await this.read(ref);
    return record?.drawn[strawKey] ?? 0;
  }

  /**
   * Every straw in a body, by identity path — what the polity reads when
   * it wants to know who else is on the glass.
   */
  public async strawsIn(ref: BodyRef): Promise<string[]> {
    const record = await this.read(ref);
    return record === null ? [] : Object.keys(record.drawn).sort();
  }

  // ---------- the write ----------

  /**
   * Record that `strawKey` took `litres` out of the body. Creates the
   * document on the first draw and appends to the straw's running total
   * after that.
   *
   * ⚠ Called **only** from a debit that actually happened — the wellhead's
   * `debitBulk`. Nothing on a read path may reach this, or a `look` would
   * empty a reservoir.
   */
  public async recordDraw(
    ref: BodyRef,
    strawKey: string,
    litres: number,
    nowS: number,
  ): Promise<void> {
    if (!(litres > 0)) return;
    const existing = await this.read(ref);
    const record: BodyRecord =
      existing ?? { bodyRef: ref, drawn: {}, since: nowS };
    record.drawn[strawKey] = (record.drawn[strawKey] ?? 0) + litres;
    await this.write(record);
  }

  private async write(record: BodyRecord): Promise<void> {
    const path = pathOf(record.bodyRef);
    if (path === null) return;
    await DocumentApi.saveToRegister(
      this as unknown as Stuff & Registrar,
      path,
      { ...record, drawn: { ...record.drawn } },
    );
  }
}

/** `{address, key}` → the document path, or `null` for an unusable ref. */
function pathOf(ref: BodyRef): string | null {
  const address = (ref.address ?? '').replace(/^\/+|\/+$/g, '');
  const key = (ref.key ?? '').trim();
  if (address === '' || key === '') return null;
  if (key.includes('/')) return null;
  return `${BODY_PREFIX}/${address}/${key}`;
}

function isRegisterPath(path: string): boolean {
  return path.startsWith(`${BODY_PREFIX}/`);
}

/** Total of every straw's draw. */
export function sumDrawn(record: BodyRecord): number {
  let total = 0;
  for (const litres of Object.values(record.drawn)) {
    if (Number.isFinite(litres) && litres > 0) total += litres;
  }
  return total;
}

/** A stored document's data, read defensively back into the record shape. */
function recordOf(data: Record<string, unknown>): BodyRecord {
  const ref = (data.bodyRef ?? {}) as Partial<BodyRef>;
  const drawnRaw = (data.drawn ?? {}) as Record<string, unknown>;
  const drawn: Record<string, number> = {};
  for (const [straw, litres] of Object.entries(drawnRaw)) {
    const n = Number(litres);
    if (Number.isFinite(n) && n > 0) drawn[straw] = n;
  }
  return {
    bodyRef: { address: String(ref.address ?? ''), key: String(ref.key ?? '') },
    drawn,
    since: Number(data.since ?? 0) || 0,
  };
}
