/**
 * BoreRegistry — **the bore log, and nobody holds the pen.**
 *
 * ⭐⭐⭐ A log is read by a prospective BUYER: *what did you cut, how deep,
 * and what came up*. So it is filed under the trade, titled to the
 * trade, written only by this register through the gated document
 * surface, and **append-only**.
 *
 * ⚠ The two obvious homes are refused, and the reason is the herdbook's
 * exactly. `/home/<owner>` hands the owner their whole home branch with
 * no broader grant, so the subject could rewrite their own log — and a
 * bore log is a **sales document**, which makes that the lemons fraud
 * with the engine supplying the pen. The owning parcel is the same hole
 * one step out. The record is trustworthy *because* its subject cannot
 * edit it.
 *
 * ⭐ And it is historically exact. Real well logs are filed with a
 * survey or a state geologist, not kept by the operator, and the reason
 * the practice exists at all is that the operator's own word about a dry
 * hole is worth nothing.
 *
 * ## ⭐⭐ What a dry hole's log is for
 *
 * This is the thing that makes acceptance criterion 4 true rather than
 * consoling. A hole that found nothing is **negative information about a
 * structure**, and negative information about a structure is exactly
 * what the next person bidding on that country would pay for. The payroll
 * bought a fact. The fact is filed where a buyer can read it and the
 * seller cannot change it.
 *
 * ⚠ What the owner MAY keep secret is their own field book — the
 * structural readings in the DISCOVERY realm, which are theirs and
 * private and always were. The log is what the hole did; the field book
 * is what they thought before they dug it. Only one of those is a
 * public record, and the split is the honest one.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import {
  RegistrarMixin,
  type Registrar,
} from '@saxonberg/server/mud/lib/document/Register';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** Where the book lives — titled to the drilling trade. */
export const BORE_PREFIX = '/trade/drilling/bores';
/** The document kind the platform declares for a bore log. */
export const BORE_KIND = 'bore';
/** The branch the filed logs are owned by: the trade. */
export const BORE_OWNER = '/trade/drilling';
/** The singleton's own template path — its row ships with this pack. */
export const BORE_REGISTRY_PATH = '/trade/drilling/idea/BoreRegistry';

/** One metre of hole, as it was cut. */
export interface BoreLine {
  /** Game-seconds the metre was finished. */
  atS: number;
  /** The depth this line records. */
  depthM: number;
  /** The country rock it was cut through. */
  host: string;
  /**
   * What came up — a material path, or `null`.
   *
   * ⚠ `null` is a **finding**, not a gap. *Nothing at two hundred and
   * ten metres* is the sentence the payroll bought, and it is worth
   * money to the next person who looks at that country.
   */
  fluid: string | null;
}

/** A filed log: whose hole, where, and every metre of it. */
export interface BoreRecord {
  /** The wellhead's identity path. */
  wellhead: string;
  /** The claim the hole was sited on. */
  claim: string;
  /** Game-seconds the hole was started. */
  since: number;
  /** Every metre, in the order it was cut. Append-only. */
  lines: BoreLine[];
}

export class BoreRegistry extends RegistrarMixin(Idea) {
  constructor() {
    super();
    this.registerPrefix = BORE_PREFIX;
    this.registerOwner = BORE_OWNER;
    this.registerKind = BORE_KIND;
  }

  /** A load-bearing singleton with a gated write surface is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the bore log is the register itself' };
  }

  /**
   * Read a hole's log. `null` where no hole has been sunk there.
   *
   * ⚠ The prefix check is the security boundary, not the `kind` tag: a
   * tag is forgeable and a path under a branch titled to the trade is
   * not.
   */
  public async read(
    address: string,
    claimLeaf: string,
  ): Promise<BoreRecord | null> {
    const path = pathOf(address, claimLeaf);
    if (path === null) return null;
    const doc = await DocumentApi.read(path);
    if (doc === null) return null;
    if (!doc.getPath().startsWith(`${BORE_PREFIX}/`)) return null;
    if (doc.getKind() !== BORE_KIND) return null;
    return recordOf(doc.getData());
  }

  /** Every log filed under one address — a country's book, as a prefix read. */
  public async bookOf(address: string): Promise<BoreRecord[]> {
    const clean = (address ?? '').replace(/^\/+|\/+$/g, '');
    if (clean === '') return [];
    const docs = await DocumentApi.list(`${BORE_PREFIX}/${clean}`);
    const out: BoreRecord[] = [];
    for (const doc of docs) {
      if (doc.getKind() !== BORE_KIND) continue;
      out.push(recordOf(doc.getData()));
    }
    return out;
  }

  /**
   * ⭐⭐ **Append one metre. Nothing in this class rewrites a line.**
   *
   * ⚠ **Where the pen actually is**, and it is not a decorator on this
   * method. `DocumentApi.saveToRegister` is itself gated
   * `FromMixin(Registrar, caller === args[0])`, the branch is titled to
   * the trade, and this class is the only `Registrar` whose prefix is
   * `/trade/drilling/bores` — so a content author cannot write a log and
   * an owner cannot edit their own, which is the whole requirement.
   * `HerdRegistry.file` is ungated for exactly these reasons and is the
   * shipped precedent; adding the first `@CallSecurity` in any
   * capability pack to re-state a guarantee the document surface
   * already makes would be drift with no gain.
   *
   * ⚠ `growMap`'s rule, which this follows verbatim — *nothing is ever
   * removed, and nothing is ever corrected.*
   */
  public async appendLine(hole: Stuff, line: BoreLine): Promise<void> {
    const h = hole as unknown as {
      getGroundAddress(): Promise<string>;
      getClaimPath(): string;
      getIdentityPath(): string | null;
      getTemplatePath(): string | null;
    };
    const address = await h.getGroundAddress();
    const claim = h.getClaimPath();
    const leaf = leafOf(claim);
    const path = pathOf(address, leaf);
    if (path === null) return;
    const existing = await this.read(address, leaf);
    const record: BoreRecord = existing ?? {
      wellhead: h.getIdentityPath() ?? h.getTemplatePath() ?? '',
      claim,
      since: line.atS,
      lines: [],
    };
    // ⚠ Append-only, and idempotent on the depth: a reconcile that runs
    // twice over one metre must not file it twice.
    if (record.lines.some((l) => l.depthM === line.depthM)) return;
    record.lines = [...record.lines, line];
    await DocumentApi.saveToRegister(
      this as unknown as Stuff & Registrar,
      path,
      { ...record, lines: record.lines.map((l) => ({ ...l })) },
    );
  }
}

export default BoreRegistry;

/** `<address>/<claim leaf>` → the document path, or `null` if unusable. */
function pathOf(address: string, claimLeaf: string): string | null {
  const clean = (address ?? '').replace(/^\/+|\/+$/g, '');
  const leaf = (claimLeaf ?? '').trim();
  if (clean === '' || leaf === '' || leaf.includes('/')) return null;
  return `${BORE_PREFIX}/${clean}/${leaf}`;
}

/** The last segment of a claim path — the log's leaf. */
function leafOf(claim: string): string {
  return (claim ?? '').split('/').filter(Boolean).pop() ?? '';
}

/** A stored document's data, read defensively back into the record shape. */
function recordOf(data: Record<string, unknown>): BoreRecord {
  const raw = Array.isArray(data.lines) ? (data.lines as unknown[]) : [];
  const lines: BoreLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const l = entry as Record<string, unknown>;
    const depthM = Number(l.depthM);
    if (!Number.isFinite(depthM)) continue;
    lines.push({
      atS: Number(l.atS) || 0,
      depthM,
      host: String(l.host ?? ''),
      fluid: typeof l.fluid === 'string' && l.fluid !== '' ? l.fluid : null,
    });
  }
  return {
    wellhead: String(data.wellhead ?? ''),
    claim: String(data.claim ?? ''),
    since: Number(data.since) || 0,
    lines: lines.sort((a, b) => a.depthM - b.depthM),
  };
}
