/**
 * HerdRegistry — **the herd is a record, and it IS the herdbook** (D20).
 *
 * Not an object in a room: a register naming *these head, this
 * composition, this age structure, on this ground*. The room's prose
 * describes animals; there is never a herd-object to `look` at.
 *
 * ## ⭐ The individual is the base case; the herd is the compression
 *
 * The ranching slate's stance — *"a rancher does not win over a cow"*,
 * livestock are fungible and managed at scale — is true of a 500-head
 * operation and false of six goats on a quarter acre, which is the land
 * this game actually has. **Pets settles it:** there is never a herd of
 * pets, so if the herd were the base case, pets would be a special case
 * of it, and it obviously is not. This is the individual, with the
 * compression applied to the animals you have stopped looking at.
 *
 * ⚠⚠ **A herd is NOT a glob.** A glob's members are *identical* and
 * share one state; a herd's members are *unindividuated* and their states
 * **diverge**. Not a weaker version of the same thing — the opposite
 * thing. Not-yet-distinguished is not interchangeable, and the management
 * game is about the tail (the three thin ones, the lame one, the barren
 * cow), never the mean.
 *
 * ## ⭐⭐ You file; you do not hold the pen
 *
 * The register lives at `/trade/ranching/herds/<…>` — a branch titled to
 * the **ranching trade's group**, not to the animals' owner. That is the
 * security requirement rather than a filing convenience: D79 makes the
 * herdbook a **sales document**, and a record whose subject can edit it
 * is the lemons fraud with the engine supplying the pen.
 *
 * ⚠ **Read-side verification is mandatory, not hardening.** The document
 * store is shared and the kind tag is forgeable — `document-store.md` is
 * explicit that *"`kind: 'release'` is a tag anyone who can write a
 * document can apply, so every read re-verifies what the transport
 * guarantees"*. Every read here checks the path actually sits under the
 * registry prefix, or somebody writes `kind: 'herd'` on their own home
 * branch and it counts.
 *
 * ## ⚠ Two sources, deliberately
 *
 * The document holds **composition, ownership and claimed home**;
 * containment holds **position**. Their disagreement *is* D95's straying
 * — derivable on read, needing no new event, and the reason a herd has a
 * jurisdictional anchor at all. Without one, nothing bounds where
 * livestock can be.
 *
 * See [docs/subsystems/ranching.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/**
 * Where the register lives in the path-addressed document tree.
 *
 * ⚠ **Titled to the ranching group by the pack manifest**, and every
 * read re-checks this prefix. It is the whole of P4.
 */
export const HERD_PREFIX = '/trade/ranching/herds';

/** The document kind the platform declares for a filed herd. */
export const HERD_KIND = 'herd';

/**
 * Mean age in game days of founding head when a record does not say.
 *
 * ⚠ Not newborns and not ancient: a little over a year, which is the age
 * of stock somebody would actually have bought. Authored per herd on the
 * herdbook row; this is only the fallback for a record that predates the
 * field.
 */
export const DEFAULT_FOUNDING_MEAN_AGE_DAYS = 400;

/** One head that has been drafted out and is currently its own object. */
export interface DraftedHead {
  /** The index within the herd — its identity, and it never changes. */
  index: number;
  /** The live object's chattel id, when it has been stamped. */
  chattelId?: string;
}

/**
 * A herd, as the register holds it.
 *
 * ⭐ **Legible to a BUYER, not only to its keeper** (D79). The record
 * exists so somebody can trust a claim about an animal they did not
 * watch grow — selection is pointless if the result cannot be sold, and
 * *identity is earned by being measured* has no economic teeth until
 * somebody pays a premium for the measurements. That is why `founded`,
 * `speciesPath` and the per-head overlay are all on the record rather
 * than in the keeper's head.
 */
export interface HerdRecord {
  /** Stable id — the register's key and the seed of every head in it. */
  herdId: string;
  /** What a keeper calls it. */
  name: string;
  /** The species every head belongs to. */
  speciesPath: string;
  /** How many head. ⭐ The tally, and the only number that is a count. */
  tally: number;
  /** Who owns them — a `ParcelOwner`-shaped principal ref. */
  holderRef: string;
  /**
   * The ground the herd claims as home — the **jurisdictional anchor**.
   * ⚠ Containment says where they ARE; this says where they SHOULD be,
   * and the disagreement is straying.
   */
  homeExtent: string;
  /** Game-seconds the herd was founded. Dates the record (D79). */
  founded: number;
  /**
   * ⭐ **Mean age in game days of the FOUNDING head, at founding.**
   *
   * A herd is not bought as newborns and it does not stay one age. Every
   * head used to read as a flat 400 days old forever, whatever the world
   * clock said — so a herd founded a game-decade ago drafted yearlings,
   * and a lamb "born" a minute ago drafted mature. Age is now derived:
   * this plus the game time elapsed since {@link founded}, with the
   * seeded spread as the variation around it.
   *
   * ⚠ A head with its own `bornAt` in the overlay ignores this — see
   * {@link HeadOverlay.bornAt}.
   */
  foundingMeanAgeDays: number;
  /** Heads currently drafted out into their own objects. */
  drafted: DraftedHead[];
  /**
   * ⭐ **The sparse overlay** (D21) — what actually happened to head
   * *n*, keyed by index. The seed says what head 17 IS; this says what
   * has since become of it, and it is sparse because most of them
   * nothing has.
   */
  overlay: Record<string, HeadOverlay>;
}

/** What a herd remembers about one head it is not currently looking at. */
export interface HeadOverlay {
  /** Body condition `[0, 100]` folded back in when it was returned. */
  flesh?: number;
  /** Handling `[0, 1]`, likewise. */
  handling?: number;
  /** Age in game days at the moment it was last returned. */
  ageDays?: number;
  /**
   * ⭐ Game-seconds this head was BORN, when it was born into the record
   * rather than founded with it. Absent for founding head, whose age
   * comes from {@link HerdRecord.foundingMeanAgeDays}.
   *
   * ⚠ **Nothing writes this yet**, and that is deliberate: it is the
   * seam breeding lands on. When gestation is built, `calved` writes a
   * `bornAt` and the head is a lamb because it is one — no special case
   * at the draft, because the derive already reads this first.
   */
  bornAt?: number;
  /**
   * ⭐ Game-seconds she was last **served** — put to the male, in season.
   *
   * The herdbook's own ruled columns are *number, dam, born, served,
   * calved*, and this is the fourth of them. `breed` writes it. The
   * follow-on that builds gestation turns it into the fifth.
   */
  served?: number;
  /** Free note — why this head is remembered at all. */
  note?: string;
}

export default class HerdRegistry extends Idea {
  /**
   * ⚠ A registry is not a cache. Nothing here is stored on the instance
   * — every read goes to the document store — so eviction would only
   * cost a re-resolve, and the veto is here for the same reason the
   * water registry's is: a singleton with a gated write surface should
   * not be collected out from under an in-flight act.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the herdbook is the register itself' };
  }

  // ---------- filing ----------

  /**
   * File a new herd. Returns the document path.
   *
   * ⭐ **Filing is a gated act**, which is what makes *who may register a
   * herd* a live question the polity can answer — one of the three things
   * that fall out of custody being separate from ownership.
   */
  public async file(herd: HerdRecord): Promise<string> {
    const problems: string[] = [];
    if (!herd.herdId) problems.push('it has no id');
    if (!herd.speciesPath) problems.push('it names no species');
    if (!(herd.tally >= 0)) problems.push('it has no tally');
    if (!herd.holderRef) problems.push('it names no holder');
    if (problems.length > 0) {
      throw new Error(
        `HerdRegistry.file: refusing '${herd.herdId}' — ${problems.join('; ')}`,
      );
    }
    const path = pathOf(herd.herdId);
    // ⚠⚠ `saveHerd`, not `save`. The ordinary write gate admits the
    // BRANCH OWNER, which here is the trade — so a keeper drafting a
    // head out could not write, and granting them the branch would hand
    // them the pen the whole design is about them not having. The pinned
    // transport gives them the one thing they need (file, and record
    // what happened) and none of what they must not have.
    await DocumentApi.saveHerd(path, { ...herd });
    return path;
  }

  /**
   * Read a herd by id.
   *
   * ⚠⚠ **The prefix check is the security boundary.** A `kind` tag is
   * something anyone who can write a document can apply; what nobody can
   * forge is a path under a branch titled to somebody else. A read that
   * trusted the tag would let a keeper write `kind: 'herd'` on their own
   * home branch and have it count.
   */
  public async read(herdId: string): Promise<HerdRecord | null> {
    const path = pathOf(herdId);
    if (!isRegistryPath(path)) return null;
    const doc = await DocumentApi.read(path);
    if (doc === null) return null;
    if (!isRegistryPath(doc.getPath())) return null;
    if (doc.getKind() !== HERD_KIND) return null;
    return herdOf(doc.getData());
  }

  /** Every filed herd. Rows outside the registry prefix are DROPPED. */
  public async all(): Promise<HerdRecord[]> {
    const docs = await DocumentApi.list(HERD_PREFIX);
    const out: HerdRecord[] = [];
    for (const doc of docs) {
      if (!isRegistryPath(doc.getPath())) continue;
      if (doc.getKind() !== HERD_KIND) continue;
      const herd = herdOf(doc.getData());
      if (herd !== null) out.push(herd);
    }
    return out;
  }

  /** Overwrite a filed herd. */
  public async update(herd: HerdRecord): Promise<void> {
    await DocumentApi.saveHerd(pathOf(herd.herdId), { ...herd });
  }

  // ---------- the boundary acts ----------

  /**
   * ⭐⭐ **Draft head `index` out of the tally** — the act that turns a
   * number in a book into an animal you are looking at.
   *
   * *Identity is earned by being measured* stops being a metaphor here
   * and becomes the implementation: the head exists as a deterministic
   * function of the herd's identity and its index, so head 17 drafted
   * twice is the same animal, and the answer was true before anyone
   * asked (`seeded, never drawn`).
   *
   * Returns `false` when the head is already out, or out of range.
   */
  public async draft(herdId: string, index: number): Promise<boolean> {
    const herd = await this.read(herdId);
    if (herd === null) return false;
    if (!Number.isInteger(index) || index < 0 || index >= herd.tally) return false;
    if (herd.drafted.some((d) => d.index === index)) return false;
    herd.drafted = [...herd.drafted, { index }];
    await this.update(herd);
    return true;
  }

  /**
   * **Return head `index` to the tally**, folding what became of it back
   * into the record.
   *
   * ⚠ **The asymmetry is honest.** Drafting mints an object; returning
   * destructs one — and that is not a loss, because *its identity was
   * the record, not the flesh*. What the animal became is written into
   * the sparse overlay, so the herd goes on remembering head 17 while 17
   * is not an object.
   */
  public async returnHead(
    herdId: string,
    index: number,
    overlay: HeadOverlay,
  ): Promise<boolean> {
    const herd = await this.read(herdId);
    if (herd === null) return false;
    if (!herd.drafted.some((d) => d.index === index)) return false;
    herd.drafted = herd.drafted.filter((d) => d.index !== index);
    herd.overlay = {
      ...herd.overlay,
      [String(index)]: { ...(herd.overlay[String(index)] ?? {}), ...overlay },
    };
    await this.update(herd);
    return true;
  }

  /** What the register remembers about head `index`. */
  public async overlayFor(
    herdId: string,
    index: number,
  ): Promise<HeadOverlay | null> {
    const herd = await this.read(herdId);
    if (herd === null) return null;
    return herd.overlay[String(index)] ?? null;
  }
}

/** A herd id → its document path. */
function pathOf(herdId: string): string {
  return `${HERD_PREFIX}/${herdId}`;
}

/**
 * ⚠⚠ The prefix check. A path is a registry path only if it sits under
 * the branch this trade holds title to — and `/trade/ranching/herdsX` is
 * NOT under `/trade/ranching/herds`, which is why the separator is part
 * of the test.
 */
function isRegistryPath(path: string): boolean {
  return path.startsWith(`${HERD_PREFIX}/`);
}

/** Parse a stored payload into a herd, or `null` when it is not one. */
function herdOf(data: unknown): HerdRecord | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.herdId !== 'string' || d.herdId === '') return null;
  if (typeof d.speciesPath !== 'string') return null;
  if (typeof d.tally !== 'number') return null;
  return {
    herdId: d.herdId,
    name: typeof d.name === 'string' ? d.name : d.herdId,
    speciesPath: d.speciesPath,
    tally: d.tally,
    holderRef: typeof d.holderRef === 'string' ? d.holderRef : '',
    homeExtent: typeof d.homeExtent === 'string' ? d.homeExtent : '',
    founded: typeof d.founded === 'number' ? d.founded : 0,
    foundingMeanAgeDays:
      typeof d.foundingMeanAgeDays === 'number' && d.foundingMeanAgeDays > 0
        ? d.foundingMeanAgeDays
        : DEFAULT_FOUNDING_MEAN_AGE_DAYS,
    drafted: Array.isArray(d.drafted) ? (d.drafted as DraftedHead[]) : [],
    overlay:
      typeof d.overlay === 'object' && d.overlay !== null
        ? (d.overlay as Record<string, HeadOverlay>)
        : {},
  };
}
