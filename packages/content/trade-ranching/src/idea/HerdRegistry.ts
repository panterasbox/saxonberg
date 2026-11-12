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
import {
  RegistrarMixin,
  type Registrar,
} from '@saxonberg/server/mud/lib/document/Registrar';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { CirculationWarren } from '@saxonberg/server/mud/lib/location/CirculationWarren';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import Species, { FEEDER_KINDS } from '@saxonberg/server/mud/platform/idea/species/Species';
import Tract from '@saxonberg/content-trade-farming/src/location/Tract';
import Field from '@saxonberg/content-trade-farming/src/thing/Field';
// ⚠ A cycle (the book imports the register), safe because the book is
// only read inside a method, never while either module evaluates.
import Herdbook from '../thing/Herdbook';
import type Livestock from '../agent/Livestock';
import { HeadSeed } from '../lib/HeadSeed';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

/**
 * Where the register lives in the path-addressed document tree.
 *
 * ⚠ **Titled to the ranching group by the pack manifest**, and every
 * read re-checks this prefix. It is the whole of P4.
 */
export const HERD_PREFIX = '/trade/ranching/herds';

/** The document kind the platform declares for a filed herd. */
export const HERD_KIND = 'herd';

/** The branch the register's documents are OWNED by: the trade. */
export const HERD_OWNER = '/trade/ranching';

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
  /**
   * ⭐ The share of head that are female (dairy D12) — a herd fact, not a
   * species one: a dairy book is nearly all cows and an ox register is all
   * bullocks. Absent on a record filed before the field existed, which
   * reads as the old literal ({@link DEFAULT_FEMALE_FRACTION}).
   */
  femaleFraction?: number;
  /** Heads currently drafted out into their own objects. */
  drafted: DraftedHead[];
  /**
   * ⭐ The field the herd is on — its identity path (cover build D8) — or
   * absent when it is on none. `move` writes it; the field's own ledger
   * holds the open window. The act reads this pointer and never searches
   * for a field.
   */
  grazing?: string;
  /**
   * The template path of the book the herd was filed from, when an
   * authored book filed it — so a move can tell the book where its herd
   * went (its `look` line). Load on use: the record points at its book;
   * nothing searches for one.
   */
  bookPath?: string;
  /**
   * ⭐ What the herd was fed, window by window (cover build D10): each
   * closed window's fed fraction, its length and when it ended, oldest
   * first, capped at {@link FED_HISTORY_CAP}. An undrafted head's
   * condition at the draft is these windows replayed from its own last
   * known flesh — the tally and the body follow one rule.
   */
  fed?: FedWindow[];
  /**
   * ⭐ **The sparse overlay** (D21) — what actually happened to head
   * *n*, keyed by index. The seed says what head 17 IS; this says what
   * has since become of it, and it is sparse because most of them
   * nothing has.
   */
  overlay: Record<string, HeadOverlay>;
}

/** One closed window of the herd's feeding (cover build D10). */
export interface FedWindow {
  /** The share of what it wanted that it got, `[0, 1]`. */
  fraction: number;
  /** How long the window ran, game days. */
  days: number;
  /** Game-seconds the window closed. */
  end: number;
}

/**
 * Windows the record keeps. Older ones fall away — a head out of the
 * book for longer than this many windows is read from its seed.
 */
export const FED_HISTORY_CAP = 24;

/** What a herd remembers about one head it is not currently looking at. */
export interface HeadOverlay {
  /** Body condition `[0, 100]` folded back in when it was returned. */
  flesh?: number;
  /**
   * Game-seconds {@link flesh} was true — the moment it was returned
   * (cover build D10). The fed windows after it are what it has been
   * through since.
   */
  fleshAt?: number;
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
  /**
   * ⭐ Game-seconds each `expire` tap was found DRIED OFF when this head
   * was returned, keyed by tap (dairy D12). The dry period is the
   * species' `restDays`, counted from here: redraft inside it and she is
   * still dry; after it she comes back into milk. Keyed by the head, so
   * returning and redrafting cannot launder a dry cow.
   */
  driedOffAt?: Record<string, number>;
}

/** The female share a record filed before `femaleFraction` existed reads. */
export const DEFAULT_FEMALE_FRACTION = 0.85;

export default class HerdRegistry extends RegistrarMixin(Idea) {
  /**
   * ⭐⭐ **The three declarations that used to be kernel constants.**
   *
   * `DocumentApi` had a `saveHerd` with `/trade/ranching/herds`,
   * `/trade/ranching` and a `FromTemplate` gate naming this class — a
   * pack's namespace hardcoded in the engine, which is the thing the pack
   * system exists to prevent, and which would have needed another method
   * and another three constants for the second register.
   *
   * The kernel learns the SHAPE now (`Registrar`) and the pack says what
   * its own book is. ⚠ Declaring it buys nothing on its own: the kernel
   * refuses any branch this class does not itself sit under, so a
   * register can only ever keep **its own** book.
   */
  constructor() {
    super();
    this.registerPrefix = HERD_PREFIX;
    this.registerOwner = HERD_OWNER;
    this.registerKind = HERD_KIND;
  }

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
    const path = this.pathOf(herd.herdId);
    // ⚠⚠ `saveToRegister`, not `save`. The ordinary write gate admits
    // the BRANCH OWNER, which here is the trade — so a keeper drafting a
    // head out could not write, and granting them the branch would hand
    // them the pen the whole design is about them not having. The
    // register transport gives them the one thing they need (file, and
    // record what happened) and none of what they must not have.
    await DocumentApi.saveToRegister(this as unknown as Stuff & Registrar, path, {
      ...herd,
    });
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
    const path = this.pathOf(herdId);
    if (!this.isRegistryPath(path)) return null;
    const doc = await DocumentApi.read(path);
    if (doc === null) return null;
    if (!this.isRegistryPath(doc.getPath())) return null;
    if (doc.getKind() !== HERD_KIND) return null;
    return this.herdOf(doc.getData());
  }

  /**
   * Every filed herd. Rows outside the registry prefix are DROPPED.
   *
   * ⚠ **Private.** The herdbook grows with what people file, so handing
   * the whole book out and letting a caller `.find` in it prices every
   * read at the size of the register. The keyed reads below are what
   * callers get; this is their shared input.
   */
  private async all(): Promise<HerdRecord[]> {
    const docs = await DocumentApi.list(HERD_PREFIX);
    const out: HerdRecord[] = [];
    for (const doc of docs) {
      if (!this.isRegistryPath(doc.getPath())) continue;
      if (doc.getKind() !== HERD_KIND) continue;
      const herd = this.herdOf(doc.getData());
      if (herd !== null) out.push(herd);
    }
    return out;
  }

  /** The herd answering to `needle` — its id or its name, either case. */
  public async named(needle: string): Promise<HerdRecord | null> {
    const want = needle.trim().toLowerCase();
    if (!want) return null;
    const herds = await this.all();
    for (const herd of herds) {
      if (herd.herdId.toLowerCase() === want) return herd;
      if (herd.name.toLowerCase() === want) return herd;
    }
    // ⭐ A keeper says *draft 1 from calves*, not *from "the Delight
    // calves"*: a WORD of the name answers when exactly one herd has it —
    // two herds sharing the word is ambiguous, and ambiguity is a miss.
    const byWord = herds.filter((h) =>
      h.name.toLowerCase().split(/\s+/).includes(want),
    );
    return byWord.length === 1 ? (byWord[0] as HerdRecord) : null;
  }

  /**
   * The **only** herd filed, or null when there are none or several.
   *
   * ⭐ Null on "several" rather than an arbitrary first: *draft 3* is
   * unambiguous only while exactly one herd exists, and answering
   * anyway would make the second farm silently draft out of the first.
   */
  public async sole(): Promise<HerdRecord | null> {
    const herds = await this.all();
    return herds.length === 1 ? (herds[0] as HerdRecord) : null;
  }

  /** Is the book empty? — the "nothing is filed at all" branch. */
  public async isEmpty(): Promise<boolean> {
    return (await this.all()).length === 0;
  }

  /** Overwrite a filed herd. */
  public async update(herd: HerdRecord): Promise<void> {
    await DocumentApi.saveToRegister(
      this as unknown as Stuff & Registrar,
      this.pathOf(herd.herdId),
      { ...herd },
    );
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
  public async draft(
    herdId: string,
    index: number,
    by: Stuff,
  ): Promise<boolean | 'not-keeper'> {
    const herd = await this.read(herdId);
    if (herd === null) return false;
    // ⭐ The keeper's act (controller-liquidity D9): asked before the book
    // moves, and before the controller mints the head.
    if (!(await this.mayKeep(by, herd))) return 'not-keeper';
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

  /**
   * The field a herd's line names (`<tract>#<fieldKey>`, tracts build D34),
   * loaded on use — or `null`.
   */
  public async fieldOf(ref: string): Promise<Field | null> {
    return this.loadField(ref);
  }

  /**
   * The field `key` of the tract at `where` — or, with no key, the tract's
   * one field. What an authored herdbook's starting place resolves to.
   */
  public async fieldOn(where: string, key: string): Promise<Field | null> {
    const tract = await this.loadTract(where).catch(() => null);
    if (!tract) return null;
    if (key) return tract.fieldByKey(key);
    const fields = tract.getFields();
    return fields.length === 1 ? fields[0]! : null;
  }

  /** The line a herd on `field` is written with. */
  public refOf(field: Field): string {
    return this.fieldRefOf(field);
  }

  /** Point the herd at a field (cover build D8), or at none. */
  public async setGrazing(herdId: string, path: string | null): Promise<void> {
    const herd = await this.read(herdId);
    if (herd === null) return;
    if (path) herd.grazing = path;
    else delete herd.grazing;
    await this.update(herd);
  }

  /**
   * Add a closed fed window to the herd's history (cover build D10). A
   * zero-length window adds nothing.
   */
  public async foldFed(herdId: string, window: FedWindow): Promise<void> {
    if (!(window.days > 0)) return;
    const herd = await this.read(herdId);
    if (herd === null) return;
    const fed = [...(herd.fed ?? []), {
      fraction: Math.max(0, Math.min(1, window.fraction)),
      days: window.days,
      end: window.end,
    }];
    herd.fed = fed.slice(-FED_HISTORY_CAP);
    await this.update(herd);
  }


  // ---------- ⭐ the keeper (controller-liquidity D9) ----------

  /**
   * ⭐⭐ **May `actor` keep this herd** — move it, draft from it, cull it,
   * write it in the book? Whoever holds the herd's home ground, or a hand on
   * shift for a business that works it (the operator of the field the herd
   * is on, or of where `actor` stands). Lifted off `move`'s controller,
   * where it was a private method no other verb asked (Appendix D 13):
   * `draft`, `moveHerd`, `cull` and `serve` ask it now.
   */
  public async mayKeep(actor: Stuff, herd: HerdRecord): Promise<boolean> {
    const home = herd.homeExtent;
    if (home) {
      const held = await AccessApi.heldExtents(actor);
      if (held.some((e) => home === e || home.startsWith(`${e}/`))) return true;
    }
    if (!MixinApi.isEmployed(actor)) return false;
    const places: Stuff[] = [];
    const here = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    if (here) places.push(here);
    if (herd.grazing) {
      const tract = (await this.fieldOf(herd.grazing))?.getTract() ?? null;
      if (tract) places.push(tract as unknown as Stuff);
    }
    for (const place of places) {
      for (const business of EmploymentApi.operatorsAt(place)) {
        if (actor.isOnShiftFor(business.getOrganizationPath())) return true;
      }
    }
    return false;
  }

  /** `actor` puts the herd onto `to` — the keeper's {@link graze}. */
  public async moveHerd(
    actor: Stuff,
    herdId: string,
    to: Field | null,
  ): Promise<HerdRecord | null | 'not-keeper' | 'outside-home' | 'already-there'> {
    const herd = await this.read(herdId);
    if (herd === null) return null;
    if (to) {
      // ⭐ A herd grazes where it belongs: its home extent, by the path the
      // parcel registry knows the field's tract by (a holding's keyed copy
      // by its key, the one authored tract by its row).
      const tract = to.getTract();
      const path = tract
        ? tract.isPersistenceKeyExplicit()
          ? (tract.getPersistenceKey() ?? '')
          : (tract.getTemplatePath() ?? '')
        : '';
      const home = herd.homeExtent;
      if (home && !(path === home || path.startsWith(`${home}/`))) return 'outside-home';
      if (herd.grazing === this.refOf(to)) return 'already-there';
    }
    if (!(await this.mayKeep(actor, herd))) return 'not-keeper';
    return this.graze(herdId, to);
  }

  /**
   * ⭐ `actor` writes head `index` out of the book as slaughtered — the
   * herdbook's half of a cull, asked of the keeper: the head returns with
   * its overlay and the tally falls by one. `'not-keeper'` writes nothing.
   */
  public async cull(
    actor: Stuff,
    herdId: string,
    index: number,
    overlay: HeadOverlay,
  ): Promise<boolean | 'not-keeper'> {
    const herd = await this.read(herdId);
    if (herd === null) return false;
    if (!(await this.mayKeep(actor, herd))) return 'not-keeper';
    if (!(await this.returnHead(herdId, index, overlay))) return false;
    const back = await this.read(herdId);
    if (back) await this.update({ ...back, tally: Math.max(0, back.tally - 1) });
    return true;
  }

  /** `actor` writes head `index` as served at `atS` — the keeper's column. */
  public async serve(
    actor: Stuff,
    herdId: string,
    index: number,
    atS: number,
  ): Promise<boolean | 'not-keeper'> {
    const herd = await this.read(herdId);
    if (herd === null) return false;
    if (!(await this.mayKeep(actor, herd))) return 'not-keeper';
    const key = String(index);
    await this.update({
      ...herd,
      overlay: { ...herd.overlay, [key]: { ...(herd.overlay[key] ?? {}), served: atS } },
    });
    return true;
  }

  // ---------- ⭐ the herd on a field (cover build D8, D10) ----------

  /**
   * ⭐ **Put the herd on `to`** — or on no field — closing the window on
   * the field it leaves and folding it into the record (cover build D8).
   * The one act behind `move` and behind a herdbook's authored
   * `grazing:`. Returns the record as it now stands, or `null` when no
   * such herd is filed.
   */
  public async graze(herdId: string, to: Field | null): Promise<HerdRecord | null> {
    await this.foldOpen(herdId);
    const herd = await this.read(herdId);
    if (herd === null) return null;
    if (herd.grazing) {
      const from = await this.loadField(herd.grazing);
      from?.clearGrazer(herdId);
    }
    if (to) {
      const species = await this.loadSpecies(herd.speciesPath);
      // A herd eats what its heads' SIZE says — at the herd's mean age,
      // so a register of calves eats like calves.
      const now = this.nowSeconds() ?? herd.founded;
      const meanAge = herd.foundingMeanAgeDays + Math.max(0, (now - herd.founded) / SECONDS_PER_GAME_DAY);
      const each = species?.dryMatterIntakeKgPerDay(meanAge) ?? 0;
      const kinds = (species?.getFeedingStyles() ?? []).filter((k) =>
        (FEEDER_KINDS as readonly string[]).includes(k),
      );
      to.setGrazer(herdId, {
        label: `${this.countWord(herd.tally)} head of ${herd.name}`,
        demandKgPerDay: herd.tally * each,
        feederKinds: [...kinds],
      });
      herd.grazing = this.fieldRefOf(to);
    } else {
      delete herd.grazing;
    }
    await this.update(herd);
    // ⭐ The book on the wall says where the herd is — told by the act,
    // read by `look`.
    const book = herd.bookPath ? StuffApi.findByTemplatePath(herd.bookPath) : null;
    if (book instanceof Herdbook) book.noteGrazing(to ? to.grazingPlacePhrase() : '');
    return herd;
  }

  /**
   * ⭐ **Close the herd's open window** and add it to the fed history
   * (cover build D10) — what the draft reads before it says what
   * condition a head is in. On a field, the field's ledger says what it
   * got; on none, it got nothing for the time since the last window.
   */
  public async foldOpen(herdId: string): Promise<void> {
    const herd = await this.read(herdId);
    if (herd === null) return;
    const now = this.nowSeconds();
    if (now === null) return;
    if (herd.grazing) {
      const field = await this.loadField(herd.grazing);
      const fold = field?.foldGrazer(herdId) ?? null;
      if (fold) await this.foldFed(herdId, { fraction: fold.fraction, days: fold.days, end: now });
      return;
    }
    const last = herd.fed?.[herd.fed.length - 1]?.end ?? herd.founded;
    if (last > 0 && now > last) {
      await this.foldFed(herdId, { fraction: 0, days: (now - last) / SECONDS_PER_GAME_DAY, end: now });
    }
  }

  /**
   * ⭐ Which herd an act means: the one named; else the one the BOOK
   * standing where the act is records (the `stake` shape — the fixture
   * that affords the act says what it is about, which is what lets a
   * second farm exist); else the only one filed.
   */
  public async pick(named: string | undefined, where: Stuff | null): Promise<HerdRecord | null> {
    if (named) return this.named(named);
    if (where && MixinApi.isContainer(where)) {
      for (const item of where.getContents()) {
        if (!(item instanceof Herdbook)) continue;
        const id = item.getHerdId();
        if (!id) continue;
        const here = await this.read(id);
        if (here) return here;
      }
    }
    return this.sole();
  }

  /**
   * ⚠⚠ **Heal drafted entries whose animal no longer exists**
   * (reconcile-on-read): `drafted` claims there is an object for this head
   * somewhere, and a purge, an eviction or a restart can falsify it — the
   * DOCUMENT is the herd's identity, the OBJECT a temporary body, so a
   * missing body means the record is stale, never that the head is gone.
   */
  public async reapStrays(herd: HerdRecord): Promise<HerdRecord> {
    if (herd.drafted.length === 0) return herd;
    const live = new Set<number>();
    for (const beast of StuffApi.findAllByTemplatePath<Livestock>(LIVESTOCK_ROW)) {
      if (beast.getHerdId() === herd.herdId) live.add(beast.getHeadIndex());
    }
    const kept = herd.drafted.filter((d) => live.has(d.index));
    if (kept.length === herd.drafted.length) return herd;
    const healed = { ...herd, drafted: kept };
    await this.update(healed);
    return healed;
  }

  /**
   * ⭐⭐ `draft` (controller-liquidity W10): **cut head `index` out of the
   * herd** — the keeper's act (D9), written BEFORE the head is minted (a
   * failed mint is healed by {@link reapStrays}). The head is ⭐ seeded,
   * never drawn: a pure function of `(herdId, index)` folded over what the
   * register remembers of it, its age derived from the clock, its
   * condition replayed over the fed history, a dried-off cow still dry.
   * It lands `into` the place the drafter stands.
   */
  public async draftHead(
    by: Stuff,
    herdId: string,
    index: number,
    into: Stuff | null,
  ): Promise<DraftAnswer> {
    const found = await this.read(herdId);
    if (found === null) return { ok: false, reason: 'no-herd' };
    const herd = await this.reapStrays(found);
    if (!Number.isInteger(index) || index < 0 || index >= herd.tally) {
      return { ok: false, reason: 'no-such-head', facts: { herd } };
    }
    if (herd.drafted.some((d) => d.index === index)) {
      return { ok: false, reason: 'already-drafted', facts: { herd } };
    }
    await this.foldOpen(herd.herdId);
    const fed = (await this.read(herd.herdId))?.fed ?? [];
    const drafted = await this.draft(herd.herdId, index, by);
    if (drafted === 'not-keeper') return { ok: false, reason: 'not-keeper', facts: { herd } };
    if (!drafted) return { ok: false, reason: 'already-drafted', facts: { herd } };
    const animal = await this.mintHead(herd, index, fed, into);
    if (!animal) return { ok: false, reason: 'mint-failed', facts: { herd } };
    return { ok: true, animal, herd };
  }

  /** Materialise head `index` — seeded, never drawn. */
  private async mintHead(
    herd: HerdRecord,
    index: number,
    fed: readonly FedWindow[],
    into: Stuff | null,
  ): Promise<Livestock | null> {
    let animal: Livestock;
    try {
      animal = await StuffApi.clone<Livestock>(LIVESTOCK_ROW);
    } catch {
      return null;
    }
    const overlay = herd.overlay[String(index)];
    const sample = HeadSeed.sample(
      {
        herdId: herd.herdId,
        meanAgeDays: this.meanAgeOf(herd, index),
        femaleFraction: herd.femaleFraction ?? DEFAULT_FEMALE_FRACTION,
      },
      index,
      overlay,
    );
    animal.bindToHerd(herd.herdId, index);
    // ⚠⚠ Get-or-create: a `Species` is a reference Idea nothing warms, and
    // a bare lookup minted every head with no species at all, silently.
    let species: Species | null = null;
    if (herd.speciesPath) {
      try {
        species = await StuffApi.singleton<Species>(herd.speciesPath);
      } catch (err) {
        console.error(`HerdRegistry: species '${herd.speciesPath}' did not resolve`, err);
      }
    }
    animal.setSpecies(species);
    animal.setLifecycleState('alive');
    try {
      animal.setSex(sample.sex);
    } catch {
      /* the species keeps no sexes; the head stays unrecorded */
    }
    animal.answerToSpecies(species, sample.sex);
    animal.setAge(sample.ageDays);
    animal.setHandling(sample.handling);
    const since = overlay?.fleshAt ?? herd.founded;
    const condition = HeadSeed.replay(sample.flesh, since, fed, sample.frame);
    const flesh = animal.getReserve('flesh');
    if (flesh) animal.adjustReserve('flesh', Quantity.of(condition - flesh.current.rawValue(), '%'));
    animal.reconcileProduction();
    animal.restoreDryPeriods(species, overlay?.driedOffAt, this.nowSeconds() ?? 0);
    if (into && MixinApi.isContainer(into)) {
      await ContainmentApi.move(animal as unknown as Stuff & Containable, into as Stuff & Container);
    }
    return animal;
  }

  /**
   * ⭐⭐ How old head `index` is, derived: born into the record → the time
   * since; otherwise founding stock — the herd's founding mean age plus
   * the game time since it was founded. The spread stays seeded.
   */
  private meanAgeOf(herd: HerdRecord, index: number): number {
    const nowS = this.nowSeconds() ?? 0;
    const bornAt = herd.overlay[String(index)]?.bornAt;
    if (typeof bornAt === 'number' && bornAt > 0) {
      return Math.max(0, (nowS - bornAt) / SECONDS_PER_GAME_DAY);
    }
    return herd.foundingMeanAgeDays + Math.max(0, (nowS - herd.founded) / SECONDS_PER_GAME_DAY);
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

  // ---------- the register's own reads (private) ----------

  /** A herd id → its document path. */
  private pathOf(herdId: string): string {
    return `${HERD_PREFIX}/${herdId}`;
  }

  /**
   * ⚠⚠ The prefix check. A path is a registry path only if it sits under
   * the branch this trade holds title to — and `/trade/ranching/herdsX` is
   * NOT under `/trade/ranching/herds`, which is why the separator is part
   * of the test.
   */
  private isRegistryPath(path: string): boolean {
    return path.startsWith(`${HERD_PREFIX}/`);
  }

  /** Parse a stored payload into a herd, or `null` when it is not one. */
  private herdOf(data: unknown): HerdRecord | null {
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
      ...(typeof d.femaleFraction === 'number' &&
      d.femaleFraction >= 0 &&
      d.femaleFraction <= 1
        ? { femaleFraction: d.femaleFraction }
        : {}),
      drafted: Array.isArray(d.drafted) ? (d.drafted as DraftedHead[]) : [],
      ...(typeof d.grazing === 'string' && d.grazing !== '' ? { grazing: d.grazing } : {}),
      ...(typeof d.bookPath === 'string' && d.bookPath !== '' ? { bookPath: d.bookPath } : {}),
      ...(Array.isArray(d.fed)
        ? { fed: (d.fed as unknown[]).filter((w): w is FedWindow => this.isFedWindow(w)) }
        : {}),
      overlay:
        typeof d.overlay === 'object' && d.overlay !== null
          ? (d.overlay as Record<string, HeadOverlay>)
          : {},
    };
  }

  private isFedWindow(w: unknown): w is FedWindow {
    if (typeof w !== 'object' || w === null) return false;
    const x = w as Record<string, unknown>;
    return typeof x.fraction === 'number' && typeof x.days === 'number' && typeof x.end === 'number';
  }

  /** Game-seconds now, or `null` before the clock exists (pre-boot, tests). */
  private nowSeconds(): number | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
    return WorldClockApi.getNow().rawValue();
  }

  /**
   * ⭐ A herd's line names a FIELD by its tract and its key (tracts build
   * D34): `<tract>#<fieldKey>`, the tract written as its durable handle when
   * it is one keyed copy of a layout (`<row>#<extent>/<leaf>`) and as its
   * path when it is the one authored tract. The key is after the LAST `#`.
   */
  private fieldRefOf(field: Field): string {
    const tract = field.getTract();
    if (!tract) return '';
    const where = tract.getDurableHandle() ?? tract.getTemplatePath() ?? '';
    return where ? `${where}#${field.getFieldKey()}` : '';
  }

  /**
   * The field a line names, loaded on use (the way an exit loads where it
   * leads), or `null` when it will not resolve or is not a field.
   */
  private async loadField(ref: string): Promise<Field | null> {
    const cut = ref.lastIndexOf('#');
    if (cut <= 0) return null;
    const where = ref.slice(0, cut);
    const key = ref.slice(cut + 1);
    try {
      const tract = await this.loadTract(where);
      return tract?.fieldByKey(key) ?? null;
    } catch (err) {
      console.error(`HerdRegistry: field '${ref}' did not resolve`, err);
      return null;
    }
  }

  /**
   * The tract a line names: one keyed copy of a layout by its handle
   * (`<row>#<key>`), else the one authored tract by its path.
   *
   * ⭐ A keyed copy is re-entered through the FARM that owns it —
   * `CirculationWarren.admitFor(key)`, the same seam a parked character's
   * record re-enters a keyed room by: the institution over the key is a
   * map read up the key's ancestry, the holding is admitted (stood up and
   * woken if it was asleep) and the room is the holding's `roomForKey`. No
   * scan of the row's instances, and an asleep farm comes back WHOLE — its
   * tract sized against its open ground and wired to its yard — rather than
   * one tract minted on its own outside its farm (which a later wake would
   * then mint a second time under the same key). `admitFor` falls back to
   * the holding's entry room, so the answer is checked: it must be a tract
   * and it must be THIS one.
   */
  private async loadTract(where: string): Promise<Tract | null> {
    const hash = where.indexOf('#');
    if (hash > 0) {
      const key = where.slice(hash + 1);
      const room = await CirculationWarren.admitFor(key);
      return room instanceof Tract && room.getDurableHandle() === where ? room : null;
    }
    const place = await StuffApi.singleton<Stuff>(where);
    return place instanceof Tract ? place : null;
  }

  /** The species at `path`, or `null`. */
  private async loadSpecies(path: string): Promise<Species | null> {
    if (!path) return null;
    try {
      return await StuffApi.singleton<Species>(path);
    } catch (err) {
      console.error(`HerdRegistry: species '${path}' did not resolve`, err);
      return null;
    }
  }

  /** A head count as a person says it — *six*, *twelve*, *forty*. */
  private countWord(n: number): string {
    return COUNT_WORDS[n] ?? String(n);
  }
}

const SECONDS_PER_GAME_DAY = 86_400;

/** The row a drafted head is minted from — one row serves every species. */
const LIVESTOCK_ROW = '/trade/ranching/agent/livestock';

/** Why a head will not come out — closed; `draft` words each. */
export type DraftRefusalReason =
  | 'no-herd'
  | 'no-such-head'
  | 'already-drafted'
  | 'not-keeper'
  | 'mint-failed';

/** What `draftHead` answers: the head, or why not. */
export type DraftAnswer =
  | { ok: true; animal: Livestock; herd: HerdRecord }
  | { ok: false; reason: 'no-herd'; facts?: undefined }
  | { ok: false; reason: Exclude<DraftRefusalReason, 'no-herd'>; facts: { herd: HerdRecord } };

const COUNT_WORDS = [
  'no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
