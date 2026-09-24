/**
 * FloorMixin — *this Thing is the ground you stand on.*
 *
 * The ground build's whole capability, on one host. Before it, `Floor` was
 * a bare composition (`Bulkable + Postured + Slotted + Adornment +
 * Detailed + Visible + Thing`) with **zero defaults**: no slot, no
 * material, and no answer to *what am I standing on*. Six rows existed,
 * five of them repeating the same slot block by hand, none of them
 * authoring a material — so `ElectricityLogic.floorConducts`, which reads
 * `floor.getMaterial()`, had been dead since the day it shipped.
 *
 * What composing this adds:
 *
 * - **`ground` and `floor` as keywords, by construction.** ⚠⚠ This is the
 *   one that mends the defect that opened the cycle, and it has to be here
 *   rather than on a row. The MQL scope walk pools a thing's own
 *   `perceivedKeywordsFor` → `getKeywords()`, and `pushDetails` gives a
 *   detail the pool `[id]` and **nothing from its authored `keywords:`**.
 *   So `default-floor`'s detail listing `ground` was dead text, and
 *   attaching that row to every room in the game would still have left
 *   bare `sit` broken. The union is on the class, where a row cannot
 *   forget it — belt and braces with `lint:ground` clause (d), which also
 *   makes every row say it out loud.
 * - **One canonical posture slot** when a row authors none, so `sit`,
 *   `lie` and `kneel` work on any floor rather than the five that happened
 *   to repeat the block. An author who wants *stand only* still authors
 *   `staticSlots` and is obeyed.
 * - **The material ladder** (`resolveUnderfoot`), five rungs, authored
 *   first, resolved once at attach and stamped — because every reader of a
 *   floor's material is synchronous and rung 3 is not.
 * - **The derived kind** (`getGroundKind`), `f(materialClass, onGrade,
 *   worked, standingWater)` over `GROUND_KIND_FOLD`. ⭐ Never authored:
 *   two rooms paved in the same stone read the same without anybody having
 *   chosen anything, which is the `set-paving` half of AC 17.
 * - **One sentence on `look`** (the `Stand.ts` augmenter shape).
 *
 * ## Host placement
 *
 * `platform/thing/Floor` only, outermost over its stack. Nothing else
 * composes it today; a vehicle deck or a raft would compose it
 * deliberately, with `onGrade: false`. ⭐ The test the plan set: no guard
 * anywhere re-narrows who composes this. The three resolvers **select** a
 * floor among a room's fixtures — that is selection within a set, not a
 * host-set narrowing — and if `ensureFloor` ever needs
 * `if (!(room instanceof CartesianLocation))` the mechanism is on the
 * wrong class.
 */

import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { BiomeApi } from '../../api/biome';
import { AddressApi } from '../../api/address';
import { MixinApi } from '../../api/mixin';
import { AppSettingKeys } from '../config/AppSettings';
import { Mixins, type MixinConstructor, type FieldMeta } from '../mixin';
import { UNBOUNDED_CAPACITY, type SlotSpec } from '../slot/Slotted';
import { Postures } from '../slot/Postured';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type Material from '../material/Material';
import type { Tangible } from '../material/Tangible';
import type { Bulkable } from '../bulk/Bulkable';
import type { Adornment } from '../boundary/Adornment';
import type { Adornable } from '../boundary/Adornable';
import type { Slotted } from '../slot/Slotted';
import type { Visible } from '../description/Visible';
import type { GroundSource } from './GroundSource';
import {
  GROUND_CLASS_PRECEDENCE,
  GROUND_KIND_FOLD,
  GROUND_KIND_PHRASES,
  GROUND_TAG_CLASSES,
  type GroundKind,
  type GroundMaterialClass,
} from './GroundKind';

const FLOOR_MIXIN = 'FloorMixin';

/**
 * Which rung of the ladder answered. Reported by `getUnderfootRung()` and
 * by the census, so *how* a floor got its material is always readable.
 *
 * 1 the row's own `_materialPath` · 2 the Location's `floor.material` ·
 * 3 the ground beneath (a `GroundSource`) · 4 the room-kind default ·
 * 5 the plain default. `null` = never resolved.
 */
export type UnderfootRung = 1 | 2 | 3 | 4 | 5;

/** The two words every floor answers to, whatever its row says. */
export const FLOOR_KEYWORDS: readonly string[] = ['floor', 'ground'];

/**
 * The one canonical posture-bearing slot, used when a row authors no
 * `staticSlots`. Shape pinned by `lib/slot/__tests__/Floor.test.ts`, which
 * is the five rows' hand-repeated block.
 */
export const CANONICAL_GROUND_SLOT: SlotSpec = Object.freeze({
  name: 'ground:1',
  accepts: Mixins.Slottable,
  capacity: UNBOUNDED_CAPACITY,
  postures: [Postures.Sit, Postures.Lie, Postures.Kneel, Postures.Stand],
  userFacingDetail: 'floor',
});

/** Public shape added by FloorMixin. */
export interface Floor {
  /**
   * The authored tri-state. `null` means *derive it* — which is the
   * default, and the reason an author almost never touches this.
   */
  getOnGrade(): boolean | null;
  setOnGrade(value: boolean | null): void;
  /**
   * ⭐ Does the ground continue beneath this floor? Resolved: the authored
   * answer when there is one, else derived from the room.
   *
   * ⚠ This is **not** *is there a floor here* — that is the room's
   * question (`Location.ensureFloor` / `noDefaultFloor`), and conflating
   * the two is what would floor a mid-air room. `onGrade` is only ever
   * asked of a floor that already exists.
   */
  isOnGrade(): boolean;
  /** Has somebody dressed, laid or rammed this? */
  isWorked(): boolean;
  setWorked(value: boolean): void;
  /** What you are standing on, as one of the ten closed words. */
  getGroundKind(): GroundKind;
  /**
   * Standing water in the surface slot. Read for exactly one kind
   * (`mire`); public because the puddle summary and the conduction walk
   * both already ask the same question their own way.
   */
  hasStandingWater(): boolean;
  /** The material path the ladder stamped, or `null`. */
  getUnderfootMaterialPath(): string | null;
  /** Which rung answered, or `null` if the ladder has not run. */
  getUnderfootRung(): UnderfootRung | null;
  /**
   * Run the ladder and stamp the result. Async because rung 3 reads a
   * zone field; idempotent-by-overwrite, so a quarry whose floor changes
   * as it is dug calls it again.
   */
  resolveUnderfoot(): Promise<void>;
  /** The one derived sentence `look` appends, or `null` when it has none. */
  groundPhrase(): string | null;
}

/**
 * What a `FloorMixin` host wants from the Location it is attached to.
 * Duck-typed rather than imported: `Location` gains these in W2, and the
 * floor has to work attached to anything Adornable (an `ExitableVessel`
 * deck, a future conveyance) without claiming they are Locations.
 */
interface FloorHost {
  getFloorSpec?(): { material?: string; onGrade?: boolean; worked?: boolean } | null;
  floorDefaults?(onGrade: boolean): { worked: boolean; materialPath: string };
  getZone?(): { lookupField<T>(field: string): Promise<T | null>; getCellSize?(): number } | null;
  getCoordinates?(): [number, number, number];
  getAddress?(): string | null;
}

/** Read a dial, falling back to a literal. The `WeatherLogic` shape. */
function dialStr(key: string, fallback: string): string {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? fallback : raw;
  } catch {
    return fallback;
  }
}

/** Read a dial with no honest literal fallback. */
function dialStrOrNull(key: string): string | null {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? null : raw;
  } catch {
    return null;
  }
}

/**
 * Classify a material's tags into one of the five recognised classes.
 * `null` when nothing matches — which folds to `contrived`.
 */
function classifyTags(tags: readonly string[]): GroundMaterialClass | null {
  const found = new Set<GroundMaterialClass>();
  for (const tag of tags) {
    const cls = GROUND_TAG_CLASSES[tag.toLowerCase()];
    if (cls) found.add(cls);
  }
  for (const cls of GROUND_CLASS_PRECEDENCE) {
    if (found.has(cls)) return cls;
  }
  return null;
}

/**
 * Append the floor's reading to its long description on `look`. Sync,
 * reads only the host's own fields plus its material; no memo, no
 * registry. The `standAugmenter` shape.
 */
function floorAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isActive(host, FLOOR_MIXIN)) return text;
  const line = (host as unknown as Floor).groundPhrase();
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function FloorMixin<
  TBase extends MixinConstructor<
    Stuff & Tangible & Slotted & Bulkable & Adornment & Visible
  >,
>(Base: TBase) {
  // Declared-then-returned (the Slotted / Stand shape).
  class FloorMixin extends Base implements Floor {
    static _mixinName = FLOOR_MIXIN;

    /** The derived reading, rendered into the host's `look`. */
    static markupAugmenters: MarkupAugmenter[] = [floorAugmenter];

    static fieldMeta: FieldMeta = {
      onGrade: { persistent: true, authorable: true },
      worked: { persistent: true, authorable: true },
    };

    /**
     * Tri-state. `null` (the default) means *derive from the room* — see
     * `isOnGrade`. An author who knows better (a cottage's earth floor in
     * a building that sits on grade) writes `true` and is obeyed.
     */
    public onGrade: boolean | null = null;

    /** Dressed, laid or rammed by somebody. Default: no. */
    public worked: boolean = false;

    /**
     * Where the ladder landed. ⚠ Runtime-only and deliberately NOT in
     * `fieldMeta`: `AdornableMixin.captureSlice` captures no fixture
     * state at all, so there is nothing to persist into — and a stamp
     * that survived a restart would be a stale answer about ground that
     * may have been dug since.
     */
    private underfootMaterialPath: string | null = null;
    private underfootRung: UnderfootRung | null = null;

    // ───────────────────────── the two fields ─────────────────────────

    /**
     * The Adornable this floor is attached to — the room, in every case
     * that exists today. Narrowed locally rather than declared on the
     * base constraint: the convention is `MixinApi.isX` at the call site
     * (CLAUDE.md § Go Through the API Layer), and it keeps the mixin
     * composable over anything that happens to be an Adornment.
     */
    private hostOf(): (Stuff & Adornable) | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isAdornment(self)) return null;
      return self.getAdornedTo();
    }

    public getOnGrade(): boolean | null {
      return this.onGrade;
    }

    public setOnGrade(value: boolean | null): void {
      this.onGrade = value;
    }

    public isWorked(): boolean {
      return this.worked;
    }

    public setWorked(value: boolean): void {
      this.worked = value;
    }

    /**
     * ⭐ D8: on grade iff the room is sky-exposed **or** sits below datum.
     * A street and a field are on grade; a mine gallery and a cellar are
     * on grade; an indoor ground-floor room, an upper storey, a holodeck
     * circle and the Lounge are not.
     *
     * An unattached floor answers `false` — it is not anywhere, so
     * nothing continues beneath it.
     */
    public isOnGrade(): boolean {
      if (this.onGrade !== null) return this.onGrade;
      const host = this.hostOf();
      if (!host) return false;
      try {
        if (BiomeApi.isSkyExposed(host as unknown as Stuff & Container)) {
          return true;
        }
      } catch {
        // No biome resolves (the Lounge) — `isSkyExposed` answers false
        // by design, and a throw here is the same answer.
      }
      const coords = (host as unknown as FloorHost).getCoordinates?.();
      if (coords && coords[2] < 0) return true;
      return false;
    }

    // ───────────────────────── the material ───────────────────────────

    public getUnderfootMaterialPath(): string | null {
      return this.underfootMaterialPath;
    }

    public getUnderfootRung(): UnderfootRung | null {
      return this.underfootRung;
    }

    /**
     * Authored first, then whatever the ladder stamped. ⭐ Overriding the
     * read rather than writing `_materialPath` is what lets every shipped
     * consumer of a floor's material — `floorConducts`, the puddle
     * summary, `materials-response`, the augmenter — see the honest
     * answer with no new call, while `_materialPath` stays purely the
     * author's field.
     */
    public getMaterial(detailKey?: string): Material | null {
      const own = super.getMaterial(detailKey);
      if (own) return own;
      if (!this.underfootMaterialPath) return null;
      return (
        StuffApi.findByTemplatePath<Material>(this.underfootMaterialPath) ??
        null
      );
    }

    /**
     * The five-rung ladder, run once at attach (`Location.ensureFloor`)
     * and again whenever the ground under a floor changes.
     *
     *   1. the row's authored `_materialPath` — always wins;
     *   2. the Location's `floor.material`;
     *   3. **if on grade** — the ground beneath, through a `GroundSource`;
     *   4. the room-kind default (`Location.floorDefaults()`);
     *   5. the plain default (the indoor dial).
     *
     * ⚠ Written to load **nothing**: no `find`, no `hydrate`, no roster
     * warm. That is deliberate and load-bearing — the hydration slate is
     * running a census-and-ratchet on `postRegister` bodies that load
     * state, and `ensureFloor` must never match it. It constructs a
     * companion object and resolves a citation; if a later edit pulls a
     * `findByTemplatePath` into the hook's body, that ratchet's number
     * moves and this decision is void.
     */
    public async resolveUnderfoot(): Promise<void> {
      // Rung 1 — the author's own field. Nothing to stamp: `getMaterial`
      // already prefers it, and stamping would shadow a later edit.
      if (super.getMaterial()) {
        this.underfootMaterialPath = null;
        this.underfootRung = 1;
        return;
      }

      const host = this.hostOf() as unknown as FloorHost | null;

      // Rung 2 — the Location's own `floor:` spec.
      const spec = host?.getFloorSpec?.() ?? null;
      if (spec?.material) {
        this.underfootMaterialPath = spec.material;
        this.underfootRung = 2;
        return;
      }

      // Rung 3 — the ground beneath. Only asked when on grade.
      if (host && this.isOnGrade()) {
        const beneath = await this.groundBeneath(host);
        if (beneath) {
          this.underfootMaterialPath = beneath;
          this.underfootRung = 3;
          return;
        }
      }

      // Rung 4 — the room-kind default.
      // ⚠⚠ `isOnGrade()` MUST be passed: `floorDefaults` keys the indoor vs
      // outdoor material on it, and calling it bare made every on-grade
      // room whose rung 3 found nothing read as BOARDS instead of loam —
      // a whole class of outdoor rooms silently floored wrong. Caught by
      // `Floor.test.ts`'s "a citation naming nothing resolvable" case.
      const defaults = host?.floorDefaults?.(this.isOnGrade());
      if (defaults?.materialPath) {
        this.underfootMaterialPath = defaults.materialPath;
        this.underfootRung = 4;
        return;
      }

      // Rung 5 — the plain default. A plain floor is a board floor.
      this.underfootMaterialPath = dialStr(
        AppSettingKeys.groundFloorIndoorMaterialPath,
        '/stuff/idea/material/wood/oak'
      );
      this.underfootRung = 5;
    }

    /**
     * Rung 3, resolved. The zone's `groundCharacter` citation first (the
     * top band is what you are standing on), then its `deposit` citation,
     * then the realm's default source. Each is asked through
     * `GroundSourceMixin`; with the ground pack absent none of them
     * resolves and this answers `null`, which is the honest degradation.
     */
    private async groundBeneath(host: FloorHost): Promise<string | null> {
      const zone = host.getZone?.() ?? null;
      const cell = host.getCoordinates?.() ?? [0, 0, 0];
      const size = zone?.getCellSize?.() ?? 1;
      const spot: readonly [number, number] = [cell[0] * size, cell[1] * size];
      const zM = cell[2] * size;
      const address = await this.addressOf(host);

      const cited: (string | null)[] = [];
      if (zone) {
        cited.push(await zone.lookupField<string>('groundCharacter'));
        cited.push(await zone.lookupField<string>('deposit'));
      }
      cited.push(dialStrOrNull(AppSettingKeys.groundDefaultSourcePath));

      for (const path of cited) {
        if (!path) continue;
        const source = StuffApi.findByTemplatePath<Stuff>(path);
        if (!source || !MixinApi.isGroundSource(source)) continue;
        const answer = (source as Stuff & GroundSource).groundMaterialAt(
          spot,
          zM,
          address
        );
        if (answer) return answer;
      }
      return null;
    }

    /**
     * The address that crosses the seam — the covering Locality's, so a
     * deposit answers the floor exactly what it answers the mine (which
     * seeds on `resolveLocalityFor(...)`.getAddress()). Falls back to the
     * host's own address, then the empty string.
     */
    private async addressOf(host: FloorHost): Promise<string> {
      try {
        const locality = await AddressApi.resolveLocalityFor(
          this.hostOf() as unknown as Stuff & Container
        );
        const addr = locality?.getAddress?.();
        if (addr) return addr;
      } catch {
        // No address registry / no covering locality — fall through.
      }
      return host.getAddress?.() ?? '';
    }

    // ────────────────────────── the kind ──────────────────────────────

    /**
     * The fold, over `GROUND_KIND_FOLD`. First rule whose every stated
     * condition holds wins; `contrived` when none does, which is the
     * honest answer for an invented material and not an error.
     */
    public getGroundKind(): GroundKind {
      const material = this.getMaterial();
      const materialClass = material
        ? classifyTags(material.getTags())
        : null;
      if (materialClass === null) return 'contrived';

      const onGrade = this.isOnGrade();
      const worked = this.isWorked();
      const standingWater = this.hasStandingWater();

      for (const rule of GROUND_KIND_FOLD) {
        if (rule.materialClass !== materialClass) continue;
        if (rule.onGrade !== undefined && rule.onGrade !== onGrade) continue;
        if (rule.worked !== undefined && rule.worked !== worked) continue;
        if (
          rule.standingWater !== undefined &&
          rule.standingWater !== standingWater
        ) {
          continue;
        }
        return rule.kind;
      }
      return 'contrived';
    }

    /**
     * Is there standing water in the floor's surface slot? Read for
     * exactly one kind (`mire`) — the heath floor is peat that the storm
     * fills, so it is earth in a dry spell and mire in the rain, which is
     * the truth its own row already describes in prose.
     */
    public hasStandingWater(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self) || !self.hasSurfaceBulk()) return false;
      return !self.getBulk('surface').isEmpty();
    }

    /**
     * The one sentence `look floor` appends — *"It is granite, set as
     * paving."* `null` when the floor has no material at all, because a
     * sentence naming nothing is worse than no sentence.
     */
    public groundPhrase(): string | null {
      const material = this.getMaterial();
      if (!material) return null;
      const name = material.getAppearance() || material.getName();
      if (!name) return null;
      return `It is ${name}, ${GROUND_KIND_PHRASES[this.getGroundKind()]}.`;
    }

    // ──────────────────── keywords and the slot ───────────────────────

    /**
     * ⚠⚠ `floor` and `ground`, always. See the header: the scope walk
     * pools `getKeywords()` and a detail's authored keyword list is never
     * consulted, so this is the only place the words can live where a row
     * cannot forget them.
     */
    public getKeywords(): string[] {
      const own = super.getKeywords();
      const seen = new Set(own.map((k: string) => k.toLowerCase()));
      const out = [...own];
      for (const word of FLOOR_KEYWORDS) {
        if (!seen.has(word)) out.push(word);
      }
      return out;
    }

    /**
     * The canonical posture slot when a row authors none. Five of the six
     * shipped rows repeat this block by hand and one (`forge-floor`)
     * forgot it entirely, which is why it could be poured on but not sat
     * on. A row that authors `staticSlots` is obeyed exactly — including
     * a row that wants *stand only*.
     */
    public getSlotNames(): readonly string[] {
      const authored = super.getSlotNames();
      if (authored.length > 0) return authored;
      return [CANONICAL_GROUND_SLOT.name];
    }

    public getSlotSpec(name: string): SlotSpec | null {
      const authored = super.getSlotSpec(name);
      if (authored) return authored;
      if (super.getSlotNames().length > 0) return null;
      return name === CANONICAL_GROUND_SLOT.name
        ? CANONICAL_GROUND_SLOT
        : null;
    }
  }
  return FloorMixin;
}
