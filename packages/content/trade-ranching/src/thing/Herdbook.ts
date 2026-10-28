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
import { FixtureMixin } from '@saxonberg/server/mud/lib/stuff/Fixture';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Field from '@saxonberg/content-trade-farming/src/location/Field';
import HerdRegistry, {
  DEFAULT_FEMALE_FRACTION,
  DEFAULT_FOUNDING_MEAN_AGE_DAYS,
} from '../idea/HerdRegistry';

const HerdbookBase = FixtureMixin(Thing);

/**
 * ⭐ `look herdbook` says where the herd is grazing — or that it is on no
 * field, eating nothing (cover build D12). Sync: it reads the book's own
 * cache of the record.
 */
function grazingAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Herdbook)) return text;
  const line = host.grazingLine();
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

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
    environment: [
      'trade/ranching/cmd/ranching/draft.yaml',
      // ⭐ Moving the herd is the book's act too (cover build D13).
      'trade/ranching/cmd/ranching/move.yaml',
    ],
    peers: [
      'trade/ranching/cmd/ranching/draft.yaml',
      'trade/ranching/cmd/ranching/move.yaml',
    ],
  };

  /** Where the herd is grazing, read off the book (cover build). */
  static markupAugmenters: MarkupAugmenter[] = [grazingAugmenter];

  static fieldMeta: FieldMeta = {
    herdId: { persistent: true, authorable: true },
    herdName: { persistent: true, authorable: true },
    speciesPath: { persistent: true, authorable: true, ref: 'identity:constituent' },
    tally: { persistent: true, authorable: true },
    foundingMeanAgeDays: { persistent: true, authorable: true },
    femaleFraction: { persistent: true, authorable: true },
    holderRef: { persistent: true, authorable: true },
    homeExtent: { persistent: true, authorable: true },
    grazing: { persistent: true, authorable: true },
  };

  /**
   * ⭐ The field the herd starts on — its path (cover build D8). Applied
   * to the record ONCE, when the record has never been put on a field;
   * after that the record's own pointer, which `move` writes, is the
   * truth.
   */
  protected grazing: string = '';

  /**
   * What the book last read of where its herd is, for `look` — a cache
   * of the record, refreshed when the book is created and when the herd
   * is moved here. `null` = not yet read.
   */
  private _grazingLine: string | null = null;

  public getGrazing(): string { return this.grazing; }
  public setGrazing(value: string): void { this.grazing = value ?? ''; }

  /** The book's line about where its herd is, or `null` before it knows. */
  public grazingLine(): string | null {
    return this._grazingLine;
  }

  /** Record that the herd now grazes `fieldName` (`''` = no field). */
  public noteGrazing(fieldName: string): void {
    this._grazingLine = fieldName
      ? `By the book, the herd is grazing ${fieldName}.`
      : 'By the book, the herd is on no field, eating nothing it is given.';
  }

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

  /**
   * ⭐ The share of head that are female (dairy D12) — a venue fact: the
   * ox register authors `0` (every head a bullock), a dairy book `0.95`.
   */
  protected femaleFraction: number = DEFAULT_FEMALE_FRACTION;

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

  public getFemaleFraction(): number { return this.femaleFraction; }
  public setFemaleFraction(value: number): void {
    this.femaleFraction =
      Number.isFinite(value) && value >= 0 && value <= 1
        ? value
        : DEFAULT_FEMALE_FRACTION;
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
  public override async onCreate(): Promise<void> {
    await super.onCreate();
    if (!this.herdId || !this.speciesPath || this.tally <= 0) return;
    const registry = await this.registry();
    if (registry === null) return;
    const existing = await registry.read(this.herdId);
    if (existing === null) {
      await registry.file({
      herdId: this.herdId,
      name: this.herdName || this.herdId,
      speciesPath: this.speciesPath,
      tally: this.tally,
      foundingMeanAgeDays: this.foundingMeanAgeDays,
      femaleFraction: this.femaleFraction,
      holderRef: this.holderRef,
      homeExtent: this.homeExtent,
      founded: this.foundedNow(),
      drafted: [],
      overlay: {},
    });
    }
    await this.settleGrazing(registry);
  }

  /**
   * ⭐ Put an authored herd on its authored field — once, get-or-create
   * like the filing (cover build D8): a record that has been on a field
   * keeps wherever `move` last put it.
   */
  private async settleGrazing(registry: HerdRegistry): Promise<void> {
    let herd = await registry.read(this.herdId);
    if (herd === null) return;
    // ⭐ The record points at its book, so a move can tell the book.
    const own = this.getTemplatePath() ?? '';
    if (own && herd.bookPath !== own) {
      herd = { ...herd, bookPath: own };
      await registry.update(herd);
    }
    let path = herd.grazing ?? '';
    if (!path && this.grazing) {
      try {
        const place = await StuffApi.singleton<Stuff>(this.grazing);
        if (place instanceof Field) {
          await registry.graze(this.herdId, place);
          path = this.grazing;
        }
      } catch (err) {
        console.error(`Herdbook: grazing '${this.grazing}' did not resolve`, err);
      }
    }
    const field = path ? StuffApi.findByTemplatePath(path) : null;
    this.noteGrazing(field ? field.getPresentation() : '');
  }

  /** The register, or `null` when there is no world to file into yet. */
  private async registry(): Promise<HerdRegistry | null> {
    // ⭐ `singleton` IS the get-or-create; a resident pre-check in front
    // of it is the same index read written twice.
    try {
      return await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    } catch (err) {
      // ⚠ Tolerated — there may be no world to file into yet — but never
      // SILENT: a register that exists and will not resolve is an
      // authoring fault, and a bare `return null` makes it look like the
      // ordinary pre-boot case.
      console.error(`Herdbook: herd registry did not resolve`, err);
      return null;
    }
  }

  /** Game-seconds now, or 0 when there is no world clock (pre-boot / tests). */
  private foundedNow(): number {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return 0;
    return WorldClockApi.getNow().rawValue();
  }
}
