/**
 * Herdbook — the book on the byre wall, and ⭐⭐ **the door into the
 * ranching half.**
 *
 * Two things were missing and they were the same thing. `draft` — the act
 * that turns a number in a book into an animal — was afforded by NOTHING,
 * so a player standing in the byre got *"I don't understand 'draft'"*;
 * `Livestock` affords the other seven verbs, but you need `draft` before
 * an animal exists to stand next to, which is a circle. And no herd could
 * be filed in play at all: only tests called `HerdRegistry.file`. Found
 * by driving the campus farm.
 *
 * ⭐ **A fixture, and the `ClaimsRegister` shape exactly.** The mine's
 * counter affords `stake` to whoever is in the room and names the
 * diggings it records for; this affords `draft` and names the herd it
 * records. A trade's acts are conferred by the trade's own fixtures,
 * never by a core mixin — and *"the register is a pointer, not a
 * database"* holds here too: the record lives in the document store, and
 * this row holds the citation and the founding facts.
 *
 * ## ⭐⭐ Why the VENUE authors the herd and the TRADE keeps it
 *
 * P4 pins herd documents under `/trade/ranching/herds`, on a branch
 * titled to the ranching group — deliberately, because D79 makes the
 * herdbook a **sales document** and a record whose subject can edit it is
 * the lemons fraud with the engine supplying the pen. But that pinning
 * also means a venue cannot ship its own herd the way Rejection ships the
 * Ferrow, and a byre with no cattle in it is not a farm.
 *
 * This is the seam that resolves it, and it is the real-world one:
 * **you fill in the form; the society keeps the book.** The venue authors
 * the herd here, on its own row under its own title; registration files
 * it through the gated transport onto the trade's branch, where nobody at
 * this farm can edit it afterwards. Custody of the record stays separate
 * from ownership of the herd, which is the whole of P4 — and now it is
 * separate in a way somebody can actually walk up to.
 *
 * ⚠ **Filing is get-or-create, not overwrite.** A herd that has been
 * grazed, drafted from and returned to has a history in the register, and
 * a room re-registering after an eviction must never roll it back to the
 * founding numbers. The row is what the herd STARTED as; the document is
 * what it has become.
 *
 * See [docs/subsystems/ranching.md].
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { FixtureMixin } from '@saxonberg/server/mud/lib/stuff/Fixture';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import HerdRegistry, {
  DEFAULT_FOUNDING_MEAN_AGE_DAYS,
} from '../idea/HerdRegistry';

const HerdbookBase = PostRegistrationMixin(FixtureMixin(DetailedMixin(Thing)));

/** The registry singleton's identity path. */
const HERD_REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

export default class Herdbook extends HerdbookBase {
  /**
   * ⭐ The book affords `draft` to whoever is in the room — the
   * content-affords-the-verb rule, and the reason the act is available
   * where the stock is and nowhere else. `return` is not here: it is
   * afforded by the animal, which by definition you are holding.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/ranching/cmd/ranching/draft.yaml'],
    peers: ['trade/ranching/cmd/ranching/draft.yaml'],
  };

  static fieldMeta: FieldMeta = {
    herdId: { persistent: true, authorable: true },
    herdName: { persistent: true, authorable: true },
    speciesPath: { persistent: true, authorable: true },
    tally: { persistent: true, authorable: true },
    foundingMeanAgeDays: { persistent: true, authorable: true },
    holderRef: { persistent: true, authorable: true },
    homeExtent: { persistent: true, authorable: true },
  };

  /** The register's key, and the seed every head in the herd is drawn from. */
  protected herdId: string = '';

  /** What the keeper calls them. */
  protected herdName: string = '';

  /** The species every head belongs to. */
  protected speciesPath: string = '';

  /** How many head the herd was founded with. */
  protected tally: number = 0;

  /**
   * ⭐ How old the founding head were, on average, in game days.
   *
   * A venue fact: *"we bought six three-year-old cows"* is a different
   * herd from six yearlings, and it is the herd's own history rather
   * than the species'. Ages derive from this plus elapsed game time, so
   * the herd gets older the way everything else does.
   */
  protected foundingMeanAgeDays: number = DEFAULT_FOUNDING_MEAN_AGE_DAYS;

  /** Who owns them — a `ParcelOwner`-shaped principal ref. */
  protected holderRef: string = '';

  /** The ground they claim as home — the jurisdictional anchor (D95). */
  protected homeExtent: string = '';

  public getHerdId(): string { return this.herdId; }
  public setHerdId(value: string): void { this.herdId = value ?? ''; }

  public getHerdName(): string { return this.herdName; }
  public setHerdName(value: string): void { this.herdName = value ?? ''; }

  public getSpeciesPath(): string { return this.speciesPath; }
  public setSpeciesPath(value: string): void { this.speciesPath = value ?? ''; }

  public getTally(): number { return this.tally; }

  public getFoundingMeanAgeDays(): number { return this.foundingMeanAgeDays; }
  public setFoundingMeanAgeDays(value: number): void {
    this.foundingMeanAgeDays =
      Number.isFinite(value) && value > 0 ? value : DEFAULT_FOUNDING_MEAN_AGE_DAYS;
  }
  public setTally(value: number): void {
    this.tally = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  public getHolderRef(): string { return this.holderRef; }
  public setHolderRef(value: string): void { this.holderRef = value ?? ''; }

  public getHomeExtent(): string { return this.homeExtent; }
  public setHomeExtent(value: string): void { this.homeExtent = value ?? ''; }

  /**
   * File the herd if the register does not already hold it.
   *
   * ⚠ **Get-or-create, and the direction matters.** An existing record
   * always wins: it carries the tally as it stands, what has been drafted
   * out, and the sparse overlay of everything the herd remembers about
   * individual head. Re-filing on every registration would erase all of
   * that every time the room went cold.
   *
   * ⚠ A row that names no herd files nothing and says nothing. An empty
   * `herdId` is an authoring mistake, but a book on a wall with no herd
   * behind it yet is also a perfectly ordinary thing for a venue to want.
   *
   * @hook
   */
  public override async postRegister(): Promise<void> {
    await super.postRegister();
    if (!this.herdId || !this.speciesPath || this.tally <= 0) return;
    const registry = await this.registry();
    if (registry === null) return;
    if ((await registry.read(this.herdId)) !== null) return;
    await registry.file({
      herdId: this.herdId,
      name: this.herdName || this.herdId,
      speciesPath: this.speciesPath,
      tally: this.tally,
      foundingMeanAgeDays: this.foundingMeanAgeDays,
      holderRef: this.holderRef,
      homeExtent: this.homeExtent,
      founded: this.foundedNow(),
      drafted: [],
      overlay: {},
    });
  }

  /** The register, or `null` when there is no world to file into yet. */
  private async registry(): Promise<HerdRegistry | null> {
    const resident = StuffApi.findByTemplatePath<HerdRegistry>(HERD_REGISTRY_PATH);
    if (resident) return resident;
    try {
      return await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    } catch {
      return null;
    }
  }

  /** Game-seconds now, or 0 when there is no world clock (pre-boot / tests). */
  private foundedNow(): number {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return 0;
    return WorldClockApi.getNow().rawValue();
  }
}
