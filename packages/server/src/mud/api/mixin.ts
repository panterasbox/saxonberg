/**
 * MixinApi - Static utility class for mixin management
 *
 * Responsibilities:
 * - Query mixins applied to a class
 * - Collect persistent fields from all mixins
 * - Mixin registration and introspection
 *
 * This enables the Persistence Framework to automatically collect
 * persistent fields from all mixins in a class hierarchy.
 *
 * Usage:
 * ```typescript
 * import { Mixins } from '../lib/mixin';
 *
 * if (MixinApi.hasMixin(Player, Mixins.Named)) {
 *   // Player has NamedMixin
 * }
 * ```
 */

import type { MixinName, FieldMeta } from '../lib/mixin';
import { Mixins } from '../lib/mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import type { SettingsSchemaEntry } from '../lib/shell/Environment';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Surfaced } from '../lib/spatial/Surfaced';
import type { Mobile } from '../lib/spatial/Mobile';
import type { Sensor } from '../lib/message/Sensor';
import type { Vocal } from '../lib/message/Vocal';
import type { Aether } from '../lib/message/Aether';
import type { AetherHosted } from '../lib/augmentation/AetherHosted';
import type { Comms } from '../lib/comms/Comms';
import type { Forums } from '../lib/forum/Forums';
import type { Named } from '../lib/description/Named';
import type { Gendered } from '../lib/character/Gendered';
import type { Persona } from '../lib/character/Persona';
import type { Dispositioned } from '../lib/trait/Dispositioned';
import type { Advancing } from '../lib/advancement/Advancement';
import type { Visible } from '../lib/description/Visible';
import type { Perceptible } from '../lib/description/Perceptible';
import type { Detailed } from '../lib/description/Detailed';
import type { Propertied } from '../lib/stuff/Propertied';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Focused } from '../lib/command/Focused';
import type { Exitable } from '../lib/boundary/Exitable';
import type { Sealable } from '../lib/spatial/Sealable';
import type { Display } from '../lib/display/Display';
import type { Switchable } from '../lib/boundary/Switchable';
import type { Energized } from '../lib/electricity/Energized';
import type { Lockable } from '../lib/boundary/Locked';
import type { Foldable } from '../lib/slot/Foldable';
import type { Timekeeping } from '../lib/time/Timekeeping';
import type { CartesianCoordinates } from '../lib/location/CartesianCoordinates';
import type { SphericalCoordinates } from '../lib/location/SphericalCoordinates';
import type { AroundSaveHook } from '../lib/persistence/AroundSaveHook';
import type { AroundDeleteHook } from '../lib/persistence/AroundDeleteHook';
import type { PostRegistration } from '../lib/stuff/PostRegistration';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import type { Environment } from '../lib/shell/Environment';
import type { Alias } from '../lib/shell/Alias';
import type { Singleton } from '../lib/stuff/Singleton';
import type { DoorBearing } from '../lib/boundary/DoorBearing';
import type { Adornable } from '../lib/boundary/Adornable';
import type { Adornment } from '../lib/boundary/Adornment';
import type { AmbientLit } from '../lib/perception/AmbientLit';
import type { LightSource } from '../lib/perception/LightSource';
import type { SmellSource } from '../lib/perception/SmellSource';
import type { SoundSource } from '../lib/perception/SoundSource';
import type { Audible } from '../lib/perception/Audible';
import type { Augment } from '../lib/augmentation/Augment';
import type { CredentialWallet } from '../lib/credential/CredentialWallet';
import type { Perception } from '../lib/perception/Perception';
import type { Concealable } from '../lib/concealment/Concealable';
import type { Hiding } from '../lib/concealment/Hiding';
import type { Hazard } from '../lib/hazard/Hazard';
import type { Tangible } from '../lib/material/Tangible';
import type { Constructed } from '../lib/material/Constructed';
import type { Organism } from '../lib/species/Organism';
import type { Sexed } from '../lib/character/Sexed';
import type { Vitals } from '../lib/vitals/Vitals';
import type { Postmortem } from '../lib/mortality/Postmortem';
import type { Incorporeal } from '../lib/mortality/Incorporeal';
import type { Reserved } from '../lib/reserve';
import type { LoadBearing } from '../lib/encumbrance/LoadBearing';
import type { Metabolic } from '../lib/metabolism/Metabolic';
import type { Thermal } from '../lib/thermal/Thermal';
import type { Wet } from '../lib/wetness/Wet';
import type { Fresh } from '../lib/material/Freshness';
import type { Cured } from '../lib/material/Cured';
import type { Contaminable } from '../lib/material/Contaminable';
import type { Growing } from '../lib/husbandry/Growing';
import type { Fermenting } from '../lib/ferment/Fermenting';
import type { Plantable } from '../lib/husbandry/Plantable';
import type { Cultivable } from '../lib/husbandry/Cultivable';
import type { Combustible } from '../lib/fire/Combustible';
import type { Meltable } from '../lib/thermal/Meltable';
import type { Furnace } from '../lib/fire/Furnace';
import type { Respiration } from '../lib/respiration/Respiration';
import type { Radioactive } from '../lib/material/Radioactive';
import type { Workspace } from '../lib/shell/Workspace';
import type { Author } from '../lib/shell/Author';
import type { Perceiver } from '../lib/description/Perceiver';
import type { Scryable } from '../lib/perception/Scryable';
import type { Slotted } from '../lib/slot/Slotted';
import type { Persistable } from '../lib/persistence/Persistable';
import type { Forkable } from '../lib/persistence/Forkable';
import type {
  MixinSlice,
  CaptureContext,
  RestoreContext,
} from '../lib/persistence/PersistenceSlice';
import type { Slottable } from '../lib/slot/Slottable';
import type { Wearable } from '../lib/slot/Wearable';
import type { Wieldable } from '../lib/slot/Wieldable';
import type { Postured } from '../lib/slot/Postured';
import type { Posed } from '../lib/character/Posed';
import type { Mountable } from '../lib/slot/Mountable';
import type { Drivable } from '../lib/slot/Drivable';
import type { Haulable } from '../lib/slot/Haulable';
import type { Hauler } from '../lib/slot/Hauler';
import type { Spawner } from '../lib/stuff/Spawner';
import type { Spawned } from '../lib/stuff/Spawned';
import type { Globbable } from '../lib/stuff/Globbable';
import type { Chattel } from '../lib/chattel/Chattel';
import type { Estate } from '../lib/chattel/Estate';
import type { Resettable } from '../lib/residency/Resettable';
import type { ConsignmentShelf, HeldGoodsShelf } from '../lib/retail/Consignment';
import type { Bulkable } from '../lib/bulk/Bulkable';
import type { Engaged } from '../lib/activity/Engaged';
import type { Behaved } from '../lib/behavior/Behaved';
import type { Atmospheric } from '../lib/biome/Atmospheric';
import type { Addressable } from '../lib/address/Addressable';
import type { SkyExposed } from '../lib/biome/SkyExposed';
import type { Contacts } from '../lib/social/Contacts';
import type { NotifyPolicy } from '../lib/social/NotifyPolicy';
import type { SubjectSubscriber } from '../lib/forum/SubjectSubscriber';
import type { Soul } from '../lib/social/Soul';
import type { WarrenMember } from '../lib/location/WarrenMember';
import type { Offstage } from '../lib/employment/Offstage';
import type { BeliefStore } from '../lib/belief/BeliefStore';
import type { Disguisable } from '../lib/disguise/Disguisable';
import type { DisguiseBearing } from '../lib/disguise/Disguise';
import type { Status } from '../lib/status/Status';
import type { Identifiable } from '../lib/identification/Identifiable';
import type { Graded } from '../lib/craft/Graded';
import type { Tooled } from '../lib/craft/Tooled';
import type { Durable } from '../lib/material/Durable';
import type { Keen } from '../lib/material/Keen';
import type { Dressing } from '../lib/vitals/Dressing';
import type { Crafted } from '../lib/craft/Crafted';
import type { VesselKind } from '../lib/bulk/VesselKind';
import type { Cutlery } from '../lib/bulk/Utensil';
import type { Serviceable } from '../lib/craft/Serviceable';
import type { Maker } from '../lib/craft/Maker';
import type { Caster } from '../lib/magic/Caster';
import type { Arcane } from '../lib/magic/Arcane';
import type { Consumable } from '../lib/magic/Consumable';
import type { Potable } from '../lib/magic/Potable';
import type { Marked } from '../lib/description/Marked';
import type { Labelled } from '../lib/description/Labelled';
import type { Memorized } from '../lib/magic/Memorized';
import type { Circulating } from '../lib/residency/Circulating';
import type { Conduit } from '../lib/magic/Conduit';
import type { Charged } from '../lib/magic/Charged';
import type { Blessable } from '../lib/magic/Blessable';
import type { Builds } from '../lib/craft/ManualBuild';
import type { Bank } from '../lib/banking/Bank';
import type { Business } from '../platform/idea/Business';
import type { Organization } from '../lib/employment/Organization';
import type { Publisher } from '../lib/press/Publisher';
import type { Attendant } from '../lib/attendant/Attendant';
import type { Employed } from '../lib/employment/Employed';
import type { Combatant } from '../lib/combat/Combatant';
import type { CombatReactive } from '../lib/combat/CombatReactive';
import type { PartyMember } from '../lib/party/PartyMember';
import { ShadowApi } from './shadow';
import { SecurityApi } from './security';

// Re-export Mixins constants for convenience
export { Mixins } from '../lib/mixin';
// The face speaks these in `getAllFieldMeta`'s signature, so it
// re-exports them (the projection's re-export rule for `mud/api/`).
export type { FieldMeta, FieldMetaEntry } from '../lib/mixin';

/**
 * Any class-like constructor MixinApi may be asked to inspect.
 * Intentionally loose: mixin-decorated classes carry additional static markers
 * (_mixinName, persistentFields, commands) that are checked via
 * property access rather than declared on this type.
 *
 * Exported so callers that thread a constructor into MixinApi
 * (composition validation hooks, glob-identity helpers) can name the
 * type without redeclaring the `Function & ...` shape locally.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type AnyConstructor = Function & { prototype: unknown };

/** Shape of a mixin constructor — what queryMixins() returns elements of. */
/**
 * One entry from {@link MixinApi.getPersistenceContributors}: a
 * prototype-chain layer that contributes serialization to the persistence
 * spine. `key` is the layer's stable name (its slice key in a record's
 * `state`); `fields` are that layer's OWN declared persistent fields (the
 * default slice); `captureSlice` / `restoreSlice` are the optional non-field
 * hooks (`Container` / `Slotted`).
 */
export interface PersistenceContributor {
  key: string;
  fields: string[];
  captureSlice?: (host: Stuff, ctx: CaptureContext) => MixinSlice;
  restoreSlice?: (
    host: Stuff,
    slice: MixinSlice,
    ctx: RestoreContext,
  ) => Promise<void>;
}

interface MixinClass {
  _mixinName?: string;
  name?: string;
  /** The unified field-metadata static. Was four parallel statics. */
  fieldMeta?: FieldMeta;
  /**
   * Modalities a mixin contributes to the sensorium when active.
   * Declared here (a known mixin static marker) so consumers —
   * `PerceptionLogic.walkAugmentedModalities` — read it off the
   * `getActiveMixins` result without a structural cast.
   */
  _grantsModalities?: readonly string[];
  prototype: unknown;
}

/**
 * Static API for mixin management and introspection.
 */
export class MixinApi {
  /**
   * Get all mixins applied to a class by walking the prototype chain.
   * Returns an array of constructor functions.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of mixin constructors
   */
  public static queryMixins(constructor: AnyConstructor): MixinClass[] {
    const mixins: MixinClass[] = [];
    let current: unknown = constructor;

    // Walk up the prototype chain
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass;
      // Check if this level is a mixin (has _mixinName marker)
      if (
        Object.prototype.hasOwnProperty.call(c, '_mixinName') &&
        typeof c._mixinName === 'string'
      ) {
        mixins.push(c);
      }

      current = Object.getPrototypeOf(current);
    }

    return mixins;
  }

  /**
   * Get all persistent fields from mixins applied to a class.
   * Walks the prototype chain collecting fields from all mixins.
   *
   * This is used by PersistApi to automatically sync fields without
   * requiring manual field lists in every class.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of persistent field names
   */
  public static getMixinFields(constructor: AnyConstructor): string[] {
    const mixins = this.queryMixins(constructor);
    const fields: string[] = [];

    for (const mixin of mixins) {
      if (mixin.fieldMeta && typeof mixin.fieldMeta === 'object') {
        for (const [field, entry] of Object.entries(mixin.fieldMeta)) {
          if (entry?.persistent === true) fields.push(field);
        }
      }
    }

    // Remove duplicates
    return Array.from(new Set(fields));
  }

  /**
   * Check if a class or Stuff instance uses a specific mixin.
   *
   * Two overloads:
   *
   * - `hasMixin(constructor, name)` — pure constructor check, walks
   *   the prototype chain. Used for static introspection.
   * - `hasMixin(stuffInstance, name)` — also walks shadows attached
   *   to the host. A host without the mixin but carrying a shadow
   *   that composes it returns true. This is what the Witness
   *   pattern relies on so that a shadow can opt into receiving
   *   notifications even when the host doesn't compose the
   *   relevant mixin itself.
   *
   * Usage:
   * ```typescript
   * import { Mixins } from './mixin';
   *
   * if (MixinApi.hasMixin(Player, Mixins.Named)) {
   *   // Player class composes NamedMixin
   * }
   *
   * if (MixinApi.hasMixin(somePlayerInstance, Mixins.Named)) {
   *   // The instance OR any shadow on it composes NamedMixin
   * }
   * ```
   */
  public static hasMixin(
    constructor: AnyConstructor,
    mixinName: MixinName
  ): boolean;
  public static hasMixin(host: Stuff, mixinName: MixinName): boolean;
  public static hasMixin(
    arg: AnyConstructor | Stuff,
    mixinName: MixinName
  ): boolean {
    // A predicate's honest answer for a null/undefined host is `false`
    // — asked most often through the `isX` narrowers, whose callers may
    // hold an optional. A crash here (an async fire-and-forget path
    // asking about a gone actor) would be strictly worse information.
    if (arg == null) return false;
    if (typeof arg === 'function') {
      return this.#hasMixinOnConstructor(arg, mixinName);
    }
    const host = arg as Stuff;
    const shadowMap = ShadowApi.getAllShadows(host);
    for (const shadows of shadowMap.values()) {
      for (const sh of shadows) {
        if (
          this.#hasMixinOnConstructor(
            sh.constructor as AnyConstructor,
            mixinName
          )
        ) {
          return true;
        }
      }
    }
    return this.#hasMixinOnConstructor(
      host.constructor as AnyConstructor,
      mixinName
    );
  }

  static #hasMixinOnConstructor(
    constructor: AnyConstructor,
    mixinName: MixinName
  ): boolean {
    const mixins = this.queryMixins(constructor);
    return mixins.some((mixin) => {
      const name = mixin._mixinName || mixin.name;
      return name === mixinName;
    });
  }

  /**
   * Active-mixin substrate (augmentation Wave 1).
   *
   * Returns the set of mixin constructors currently "active" on
   * `stuff`. The substrate splits build-time composition from
   * runtime activation:
   *
   *   - Most mixins are NOT augment-gated (`_augmentGated !== true`).
   *     Native composition is sufficient — active iff composed.
   *   - Augment-gated mixins (`_augmentGated === true`) are active
   *     ONLY when an installed augment confers them via
   *     `AugmentMixin.confers()`.
   *
   * The walk is lazy in v1 (no cache); installing or removing an
   * augment takes effect on the next call. Future optimization
   * caches the set on the entity, invalidated on slot
   * occupy/release.
   *
   * The implementation looks at slot occupancy via
   * `SlotApi.getAllOccupants` for hosts that compose
   * `SlottedMixin`; non-slotted hosts have no augments and active
   * = composed for everything.
   */
  public static getActiveMixins(stuff: Stuff): readonly MixinClass[] {
    const composed = this.queryMixins(stuff.constructor as AnyConstructor);
    let conferredNames: Set<string> | null = null;
    const active: MixinClass[] = [];
    for (const mixin of composed) {
      const gated = (mixin as { _augmentGated?: boolean })._augmentGated;
      if (!gated) {
        active.push(mixin);
        continue;
      }
      if (conferredNames === null) {
        conferredNames = collectAugmentConferralNames(stuff);
      }
      const name = mixin._mixinName ?? mixin.name;
      if (name && conferredNames.has(name)) {
        active.push(mixin);
      }
    }
    return active;
  }

  /**
   * `getActiveMixins` membership predicate. Returns true iff a mixin
   * named `mixinName` is in the active set on `stuff`. For un-gated
   * mixins, equivalent to `hasMixin`; for gated ones, reflects
   * augment-toggled state.
   */
  public static isActive(stuff: Stuff, mixinName: string): boolean {
    return this.getActiveMixins(stuff).some(
      (m) => (m._mixinName ?? m.name) === mixinName,
    );
  }

  /**
   * Get the field-marshaller registry for a class — the map of
   * persistent-field names → marshaller templatePaths declared on
   * mixins / classes in the prototype chain.
   *
   * Walks the prototype chain concrete-class-first, so a subclass's
   * declaration wins over a base mixin's for the same field. The
   * returned map is keyed by field name; values are templatePath
   * strings that callers resolve via `StuffApi.findByTemplatePath`
   * at use time.
   *
   * Mirrors the shape of {@link getAllPersistentFields} and is the
   * companion lookup for `PersistentHydrator` / `Document`'s
   * marshaller-aware coercion path.
   *
   * @param constructor - The class constructor to inspect
   * @returns Map of field name to marshaller templatePath
   */
  public static getAllFieldMarshallers(
    constructor: AnyConstructor
  ): Record<string, string> {
    const meta = MixinApi.getAllFieldMeta(constructor);
    const out: Record<string, string> = {};
    for (const [field, entry] of Object.entries(meta)) {
      if (typeof entry.marshaller === 'string') out[field] = entry.marshaller;
    }

    return out;
  }

  /**
   * Collect the settings-schema entries declared across a class's
   * prototype chain — the raw walk over each layer's own static
   * `settings` array, one `(entry, sourceMixin)` pair per declared
   * entry. Picks up `static settings` from both mixin layers (the
   * common case, provenance = `_mixinName`) AND from substrate
   * classes whose concept they own (provenance falls back to `name`,
   * then `<anonymous>`).
   *
   * Sibling of {@link getAllFieldMarshallers} — same mixin-static-slot
   * collection shape. Shared by `EnvironmentMixin` (whose
   * `collectSchema` wrapper layers duplicate-key validation on top)
   * and `ShellApi.resolveSetting`'s non-Environment fallback. The
   * duplicate-key throw is intentionally NOT here — that's settings
   * validation, which belongs in the Environment wrapper.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of `(entry, sourceMixin)` pairs in chain order
   */
  public static collectSettingsSchema(
    constructor: AnyConstructor
  ): Array<{ entry: SettingsSchemaEntry; sourceMixin: string }> {
    const out: Array<{ entry: SettingsSchemaEntry; sourceMixin: string }> = [];
    let current: unknown = constructor;

    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        settings?: SettingsSchemaEntry[];
      };
      if (
        Object.prototype.hasOwnProperty.call(c, 'settings') &&
        Array.isArray(c.settings)
      ) {
        const sourceMixin = c._mixinName ?? c.name ?? '<anonymous>';
        for (const entry of c.settings) {
          out.push({ entry, sourceMixin });
        }
      }
      current = Object.getPrototypeOf(current);
    }

    return out;
  }

  /**
   * Convert a lowerCamel field name to its PascalCase form — the
   * suffix used when deriving a method name from a field name (e.g.,
   * `'coords'` → `'Coords'`, so a hydrator can dispatch
   * `'set' + pascalCase('coords')` → `'setCoords'`).
   *
   * Used by `PersistentHydrator` (Phase 1 `set<X>` / Phase 2
   * `apply<X>` dispatch) and `Zone.lookupField` (`get<X>` reflection).
   * Lives here because the field-name-to-method-name convention is
   * the same one `getAllPersistentFields` / `getAllInstructionFields`
   * presume — callers that introspect mixin field names also need
   * to derive method names from them.
   *
   * Empty string passes through unchanged.
   */
  public static pascalCase(field: string): string {
    return field.length === 0
      ? field
      : field[0]!.toUpperCase() + field.slice(1);
  }

  /**
   * Collect `static fieldMeta` from every layer of the prototype chain —
   * the one collector the four legacy ones become derivations of.
   *
   * Mirrors {@link getAllPersistentFields}'s four invariants exactly:
   * the same loop guard, `hasOwnProperty` at each level (the static is
   * inherited, so a subclass declaring its own would otherwise mask the
   * ancestry), a type guard on the value, and a terminal dedupe — here
   * expressed as first-write-wins into the accumulator rather than a
   * `Set`, because entries merge rather than collapse.
   *
   * **The merge is PROPERTY-level, first-declaration-wins per property**,
   * walking concrete class first. Not field-level. The distinction is
   * load-bearing rather than pedantic: `Weapon` declares a marshaller for
   * `mass` while `Tangible` declares `mass` persistent, so field-level
   * shadowing would make `Weapon`'s `{ marshaller }` replace
   * `{ persistent: true }` outright and **`mass` would stop persisting on
   * every weapon in the game** — silently. Per property: booleans
   * first-wins is a union (nothing declares `false`), `marshaller`
   * first-wins reproduces `getAllFieldMarshallers`, and
   * `ref`/`lifetime`/`inverse` first-wins is "a subclass may sharpen".
   *
   * **Key order is load-bearing.** Keys land in first-seen order, which
   * is concrete-first chain order — so
   * `Object.keys(meta).filter((k) => meta[k].persistent)` reproduces
   * `getAllPersistentFields` exactly, including the order
   * `PersistentHydrator` Phase 1 applies fields in.
   *
   * @param constructor - The class constructor to inspect
   * @returns One merged entry per declared field, in chain order
   */
  public static getAllFieldMeta(constructor: AnyConstructor): FieldMeta {
    const out: FieldMeta = {};
    let current: unknown = constructor;

    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & { fieldMeta?: FieldMeta };
      if (
        Object.prototype.hasOwnProperty.call(c, 'fieldMeta') &&
        c.fieldMeta &&
        typeof c.fieldMeta === 'object'
      ) {
        for (const [field, entry] of Object.entries(c.fieldMeta)) {
          if (!entry || typeof entry !== 'object') continue;
          const existing = out[field];
          if (!existing) {
            out[field] = { ...entry };
            continue;
          }
          // Fill only what no nearer layer already said.
          for (const [prop, value] of Object.entries(entry)) {
            if (!(prop in existing)) {
              (existing as Record<string, unknown>)[prop] = value;
            }
          }
        }
      }
      current = Object.getPrototypeOf(current);
    }

    return out;
  }

  /**
   * Get all persistent fields (from mixins and every class in the chain).
   *
   * A thin derivation of {@link getAllFieldMeta} — the chain walk, the
   * `hasOwnProperty` guard and the dedupe all live there now. The
   * signature is unchanged so the ~50 call sites did not move, and key
   * order is preserved (fieldMeta keys are collected concrete-first), so
   * this returns the same array in the same order it always did.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of all persistent field names (deduplicated)
   */
  public static getAllPersistentFields(constructor: AnyConstructor): string[] {
    const meta = MixinApi.getAllFieldMeta(constructor);
    return Object.keys(meta).filter((f) => meta[f]!.persistent === true);
  }

  /**
   * The persistence-spine per-mixin contributor walk — the sibling of
   * {@link getAllPersistentFields}, one entry per prototype-chain layer
   * that contributes serialization. Each entry names the layer (its
   * `_mixinName` or class name — the key its slice lands under in a
   * {@link PersistedRecord}'s `state`), that layer's OWN declared
   * persistent `fieldMeta` entries (the default-slice fields — NOT the aggregated
   * chain, so each layer's slice is independent), and its optional
   * `captureSlice` / `restoreSlice` hooks (present on `Container` /
   * `Slotted`, which serialize non-field state).
   *
   * Walked concrete-class-first (chain order) and de-duplicated by key so
   * the first declaration of a key wins. `PersistableLogic` drives capture
   * and restore over this list.
   *
   * @param constructor - The class constructor to inspect
   * @returns One descriptor per contributing layer, in chain order
   */
  public static getPersistenceContributors(
    constructor: AnyConstructor,
  ): PersistenceContributor[] {
    const out: PersistenceContributor[] = [];
    const seen = new Set<string>();
    let current: unknown = constructor;

    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        captureSlice?: unknown;
        restoreSlice?: unknown;
      };
      // OWN `_mixinName` only — the static is inherited, so a concrete
      // subclass (e.g. `ContentChest extends ContainerMixin(...)`) would
      // otherwise borrow its base mixin's name as its key, colliding with
      // that mixin's real layer. Fall back to the class name for concrete
      // (non-mixin) layers.
      const ownMixinName = Object.prototype.hasOwnProperty.call(
        c,
        '_mixinName',
      )
        ? c._mixinName
        : undefined;
      const key = ownMixinName || c.name;
      // This walk deliberately keeps its own per-LAYER traversal rather
      // than reading the flattened `getAllFieldMeta` map: it needs each
      // layer's own `_mixinName` ownership (the key its slice lands
      // under in a PersistedRecord), which flattening loses. Only the
      // field list moves to `fieldMeta`.
      const ownMeta =
        Object.prototype.hasOwnProperty.call(c, 'fieldMeta') &&
        c.fieldMeta &&
        typeof c.fieldMeta === 'object'
          ? c.fieldMeta
          : null;
      const ownFields = ownMeta
        ? Object.keys(ownMeta).filter((f) => ownMeta[f]?.persistent === true)
        : [];
      const hasCapture =
        Object.prototype.hasOwnProperty.call(c, 'captureSlice') &&
        typeof c.captureSlice === 'function';
      const hasRestore =
        Object.prototype.hasOwnProperty.call(c, 'restoreSlice') &&
        typeof c.restoreSlice === 'function';
      if (key && !seen.has(key) && (ownFields.length > 0 || hasCapture)) {
        seen.add(key);
        out.push({
          key,
          fields: ownFields,
          captureSlice: hasCapture
            ? (c.captureSlice as PersistenceContributor['captureSlice'])
            : undefined,
          restoreSlice: hasRestore
            ? (c.restoreSlice as PersistenceContributor['restoreSlice'])
            : undefined,
        });
      }
      current = Object.getPrototypeOf(current);
    }

    return out;
  }

  /**
   * Type-predicate narrowing helpers.
   *
   * Each predicate performs a runtime mixin check and threads the matching
   * interface into TypeScript's control-flow narrowing:
   *
   * ```ts
   * if (MixinApi.isContainer(obj)) {
   *   obj.getContents(); // obj is Stuff & Container here
   * }
   * ```
   *
   * Prefer these over `hasMixin(obj.constructor, Mixins.X)` + cast when the
   * goal is to call interface methods on the narrowed object. `hasMixin`
   * remains the primitive for dynamic introspection (iterating queryMixins).
   */

  public static isContainer(obj: Stuff): obj is Stuff & Container {
    return this.hasMixin(obj, Mixins.Container);
  }

  /**
   * ⭐ **The one open-container rule.** A container whose contents are
   * exposed to the space it stands in: the glass rack's coupes, the
   * floor stock's kegs, a crate of limes. Everything that means "you can
   * reach/see one level into that" asks THIS — `PerceptionApi.canReach`,
   * the `peers` scope walk, `mustBeInLocation`, `VisionModality` — so
   * the four can never disagree about what is exposed.
   *
   * Two exclusions, both load-bearing:
   * - **A shut container hides its contents.** Non-`Sealable` is always
   *   open (a rack has no lid); a `Sealable` that is closed is opaque.
   * - **A container that is somebody is never transparent.** You cannot
   *   reach into another actor's pockets, so anything that is a person or
   *   a creature is excluded even standing open. ⚠ `Organism` is in that
   *   test deliberately: keying only on `CommandGiver`/`HasInteractive`
   *   covered players and NPCs and left every non-commandable creature's
   *   inventory transparent — a pack animal's panniers were public.
   */
  public static isOpenContainer(obj: Stuff): obj is Stuff & Container {
    if (!this.isContainer(obj)) return false;
    if (
      this.isCommandGiver(obj) ||
      this.isHasInteractive(obj) ||
      this.isOrganism(obj)
    ) {
      return false;
    }
    return !(this.isSealable(obj) && !obj.isOpen());
  }

  public static isContainable(obj: Stuff): obj is Stuff & Containable {
    return this.hasMixin(obj, Mixins.Containable);
  }

  public static isSurfaced(obj: Stuff): obj is Stuff & Surfaced {
    return this.hasMixin(obj, Mixins.Surfaced);
  }

  public static isMobile(obj: Stuff): obj is Stuff & Mobile {
    return this.hasMixin(obj, Mixins.Mobile);
  }

  public static isSensor(obj: Stuff): obj is Stuff & Sensor {
    return this.hasMixin(obj, Mixins.Sensor);
  }

  public static isVocal(obj: Stuff): obj is Stuff & Vocal {
    return this.hasMixin(obj, Mixins.Vocal);
  }

  public static isAether(obj: Stuff): obj is Stuff & Aether {
    return this.hasMixin(obj, Mixins.Aether);
  }

  public static isAetherHosted(obj: Stuff): obj is Stuff & AetherHosted {
    return this.hasMixin(obj, Mixins.AetherHosted);
  }

  public static isComms(obj: Stuff): obj is Stuff & Comms {
    return this.hasMixin(obj, Mixins.Comms);
  }

  public static isForums(obj: Stuff): obj is Stuff & Forums {
    return this.hasMixin(obj, Mixins.Forums);
  }

  public static isNamed(obj: Stuff): obj is Stuff & Named {
    return this.hasMixin(obj, Mixins.Named);
  }

  public static isGendered(obj: Stuff): obj is Stuff & Gendered {
    return this.hasMixin(obj, Mixins.Gendered);
  }

  public static isPersona(obj: Stuff): obj is Stuff & Persona {
    return this.hasMixin(obj, Mixins.Persona);
  }

  public static isDispositioned(obj: Stuff): obj is Stuff & Dispositioned {
    return this.hasMixin(obj, Mixins.Dispositioned);
  }

  public static isAdvancing(obj: Stuff): obj is Stuff & Advancing {
    return this.hasMixin(obj, Mixins.Advancement);
  }

  public static isVisible(obj: Stuff): obj is Stuff & Visible {
    return this.hasMixin(obj, Mixins.Visible);
  }

  public static isPerceptible(obj: Stuff): obj is Stuff & Perceptible {
    return this.hasMixin(obj, Mixins.Perceptible);
  }

  /** Does `obj` carry a concealment level (presence-concealment)? */
  public static isConcealable(obj: Stuff): obj is Stuff & Concealable {
    return this.hasMixin(obj, Mixins.Concealable);
  }

  /** Can `obj` enter a dynamic `hide` state (the actor-side concealment)? */
  public static isHiding(obj: Stuff): obj is Stuff & Hiding {
    return this.hasMixin(obj, Mixins.Hiding);
  }

  /** Is `obj` a self-resolving trap/hazard (springs at a traverse/interact)? */
  public static isHazard(obj: Stuff): obj is Stuff & Hazard {
    return this.hasMixin(obj, Mixins.Hazard);
  }

  public static isDetailed(obj: Stuff): obj is Stuff & Detailed {
    return this.hasMixin(obj, Mixins.Detailed);
  }

  public static isPropertied(obj: Stuff): obj is Stuff & Propertied {
    return this.hasMixin(obj, Mixins.Propertied);
  }

  public static isCommandGiver(obj: Stuff): obj is Stuff & CommandGiver {
    return this.hasMixin(obj, Mixins.CommandGiver);
  }

  public static isFocused(obj: Stuff): obj is Stuff & Focused {
    return this.hasMixin(obj, Mixins.Focused);
  }

  public static isExitable(obj: Stuff): obj is Stuff & Exitable {
    return this.hasMixin(obj, Mixins.Exitable);
  }

  public static isCredentialWallet(
    obj: Stuff,
  ): obj is Stuff & CredentialWallet {
    return this.hasMixin(obj, Mixins.CredentialWallet);
  }

  /** A screen that shows one source to everyone who can see it (`DisplayMixin`). */
  public static isDisplay(obj: Stuff): obj is Stuff & Display {
    return this.hasMixin(obj, Mixins.Display);
  }

  public static isSealable(obj: Stuff): obj is Stuff & Sealable {
    return this.hasMixin(obj, Mixins.Sealable);
  }

  public static isSwitchable(obj: Stuff): obj is Stuff & Switchable {
    return this.hasMixin(obj, Mixins.Switchable);
  }

  /** Is `obj` an electrical source (held at a potential)? */
  public static isEnergized(obj: Stuff): obj is Stuff & Energized {
    return this.hasMixin(obj, Mixins.Energized);
  }

  public static isLockable(obj: Stuff): obj is Stuff & Lockable {
    return this.hasMixin(obj, Mixins.Lockable);
  }

  public static isFoldable(obj: Stuff): obj is Stuff & Foldable {
    return this.hasMixin(obj, Mixins.Foldable);
  }

  public static isTimekeeping(obj: Stuff): obj is Stuff & Timekeeping {
    return this.hasMixin(obj, Mixins.Timekeeping);
  }

  public static isCartesianCoordinates(obj: Stuff): obj is Stuff & CartesianCoordinates {
    return this.hasMixin(obj, Mixins.CartesianCoordinates);
  }

  public static isSphericalCoordinates(obj: Stuff): obj is Stuff & SphericalCoordinates {
    return this.hasMixin(obj, Mixins.SphericalCoordinates);
  }

  public static isAroundSaveHook(obj: Stuff): obj is Stuff & AroundSaveHook {
    return this.hasMixin(obj, Mixins.AroundSaveHook);
  }

  public static isAroundDeleteHook(obj: Stuff): obj is Stuff & AroundDeleteHook {
    return this.hasMixin(obj, Mixins.AroundDeleteHook);
  }

  public static isPostRegistration(obj: Stuff): obj is Stuff & PostRegistration {
    return this.hasMixin(obj, Mixins.PostRegistration);
  }

  public static isHasInteractive(obj: Stuff): obj is Stuff & HasInteractive {
    return this.hasMixin(obj, Mixins.HasInteractive);
  }

  public static isEnvironment(obj: Stuff): obj is Stuff & Environment {
    return this.hasMixin(obj, Mixins.Environment);
  }

  public static isAlias(obj: Stuff): obj is Stuff & Alias {
    return this.hasMixin(obj, Mixins.Alias);
  }

  public static isContacts(obj: Stuff): obj is Stuff & Contacts {
    return this.hasMixin(obj, Mixins.Contacts);
  }

  public static isNotifyPolicy(obj: Stuff): obj is Stuff & NotifyPolicy {
    return this.hasMixin(obj, Mixins.NotifyPolicy);
  }

  public static isSubjectSubscriber(
    obj: Stuff,
  ): obj is Stuff & SubjectSubscriber {
    return this.hasMixin(obj, Mixins.SubjectSubscriber);
  }

  public static isSoul(obj: Stuff): obj is Stuff & Soul {
    return this.hasMixin(obj, Mixins.Soul);
  }

  public static isWorkspace(obj: Stuff): obj is Stuff & Workspace {
    return this.hasMixin(obj, Mixins.Workspace);
  }

  public static isAuthor(obj: Stuff): obj is Stuff & Author {
    return this.hasMixin(obj, Mixins.Author);
  }

  public static isPerceiver(obj: Stuff): obj is Stuff & Perceiver {
    return this.hasMixin(obj, Mixins.Perceiver);
  }

  public static isScryable(obj: Stuff): obj is Stuff & Scryable {
    return this.hasMixin(obj, Mixins.Scryable);
  }

  public static isSingleton(obj: Stuff): obj is Stuff & Singleton {
    return this.hasMixin(obj, Mixins.Singleton);
  }

  public static isDoorBearing(obj: Stuff): obj is Stuff & DoorBearing {
    return this.hasMixin(obj, Mixins.DoorBearing);
  }

  public static isAdornable(obj: Stuff): obj is Stuff & Adornable {
    return this.hasMixin(obj, Mixins.Adornable);
  }

  public static isAdornment(obj: Stuff): obj is Stuff & Adornment {
    return this.hasMixin(obj, Mixins.Adornment);
  }

  public static isAmbientLit(obj: Stuff): obj is Stuff & AmbientLit {
    return this.hasMixin(obj, Mixins.AmbientLit);
  }

  public static isLightSource(obj: Stuff): obj is Stuff & LightSource {
    return this.hasMixin(obj, Mixins.LightSource);
  }

  public static isSmellSource(obj: Stuff): obj is Stuff & SmellSource {
    return this.hasMixin(obj, Mixins.SmellSource);
  }

  public static isAudible(obj: Stuff): obj is Stuff & Audible {
    return this.hasMixin(obj, Mixins.Audible);
  }

  public static isSoundSource(obj: Stuff): obj is Stuff & SoundSource {
    return this.hasMixin(obj, Mixins.SoundSource);
  }

  public static isAugment(obj: Stuff): obj is Stuff & Augment {
    return this.hasMixin(obj, Mixins.Augment);
  }

  public static isPerception(obj: Stuff): obj is Stuff & Perception {
    return this.hasMixin(obj, Mixins.Perception);
  }

  public static isTangible(obj: Stuff): obj is Stuff & Tangible {
    return this.hasMixin(obj, Mixins.Tangible);
  }

  public static isConstructed(obj: Stuff): obj is Stuff & Constructed {
    return this.hasMixin(obj, Mixins.Constructed);
  }

  public static isOrganism(obj: Stuff): obj is Stuff & Organism {
    return this.hasMixin(obj, Mixins.Organism);
  }

  public static isSexed(obj: Stuff): obj is Stuff & Sexed {
    return this.hasMixin(obj, Mixins.Sexed);
  }

  public static isVitals(obj: Stuff): obj is Stuff & Vitals {
    return this.hasMixin(obj, Mixins.Vitals);
  }

  /**
   * A participant with no body that can act on matter — a shade today,
   * and the deferred prison skin later.
   */
  public static isIncorporeal(obj: Stuff): obj is Stuff & Incorporeal {
    return this.hasMixin(obj, Mixins.Incorporeal);
  }

  /**
   * A body that runs a postmortem clock — decay, forensic readability, and
   * the "don't collect me yet" eviction veto.
   */
  public static isPostmortem(obj: Stuff): obj is Stuff & Postmortem {
    return this.hasMixin(obj, Mixins.Postmortem);
  }

  public static isReserved(obj: Stuff): obj is Stuff & Reserved {
    return this.hasMixin(obj, Mixins.Reserved);
  }

  public static isLoadBearing(obj: Stuff): obj is Stuff & LoadBearing {
    return this.hasMixin(obj, Mixins.LoadBearing);
  }

  public static isMetabolic(obj: Stuff): obj is Stuff & Metabolic {
    return this.hasMixin(obj, Mixins.Metabolic);
  }

  public static isThermal(obj: Stuff): obj is Stuff & Thermal {
    return this.hasMixin(obj, Mixins.Thermal);
  }

  public static isWet(obj: Stuff): obj is Stuff & Wet {
    return this.hasMixin(obj, Mixins.Wet);
  }

  /**
   * A host carrying the spoilage gauge. Composed on every `Thing`, so the
   * predicate is nearly always true — what actually decides whether a
   * thing rots is its Material's tabulated activation energy
   * (`isPerishable()`), not this.
   */
  public static isFresh(obj: Stuff): obj is Stuff & Fresh {
    return this.hasMixin(obj, Mixins.Fresh);
  }

  /**
   * A host carrying the per-instance **water state** — the drying /
   * curing axis. Distinct from {@link isFresh}: that is the population
   * living in the matter, this is the matter's own available water.
   */
  public static isCured(obj: Stuff): obj is Stuff & Cured {
    return this.hasMixin(obj, Mixins.Cured);
  }

  /**
   * A host that can carry pathogens — food, and anything that touches
   * food. ⚠ Composing it claims only that a load CAN be put here; a host
   * that nothing contaminated reads `{}` for ever, because contamination
   * is an event and never a clock.
   */
  public static isContaminable(obj: Stuff): obj is Stuff & Contaminable {
    return this.hasMixin(obj, Mixins.Contaminable);
  }

  public static isGrowing(obj: Stuff): obj is Stuff & Growing {
    return this.hasMixin(obj, Mixins.Growing);
  }

  /**
   * A vessel that ferments what its interior holds — the durative
   * transform (the vat, the carboy, the conditioning bottle).
   */
  public static isFermenting(obj: Stuff): obj is Stuff & Fermenting {
    return this.hasMixin(obj, Mixins.Fermenting);
  }

  /**
   * Can this be put in the ground? The `plant` verb's kind gate —
   * the capability, not the `Seed` class, so a future cutting / tuber /
   * bulb is plantable without extending `Seed`.
   */
  public static isPlantable(obj: Stuff): obj is Stuff & Plantable {
    return this.hasMixin(obj, Mixins.Plantable);
  }

  /**
   * Ground that holds plants — a pot (N = 1) or a garden bed (N > 1).
   * The narrowing that replaced `instanceof PlantPot` across the
   * cultivation verbs.
   *
   * Narrows to the WHOLE composed surface, not just `Cultivable`:
   * `CultivableMixin`'s base constraint already requires Container +
   * Bulkable + Slotted, so a cultivable provably has them, and a caller
   * that needs `occupy`/`vacate` should not have to narrow twice.
   */
  public static isCultivable(
    obj: Stuff
  ): obj is Stuff & Cultivable & Container & Bulkable & Slotted {
    return this.hasMixin(obj, Mixins.Cultivable);
  }

  public static isCombustible(obj: Stuff): obj is Stuff & Combustible {
    return this.hasMixin(obj, Mixins.Combustible);
  }

  public static isMeltable(obj: Stuff): obj is Stuff & Meltable {
    return this.hasMixin(obj, Mixins.Meltable);
  }

  public static isFurnace(obj: Stuff): obj is Stuff & Furnace {
    return this.hasMixin(obj, Mixins.Furnace);
  }

  public static isRespiration(obj: Stuff): obj is Stuff & Respiration {
    return this.hasMixin(obj, Mixins.Respiration);
  }

  public static isRadioactive(obj: Stuff): obj is Stuff & Radioactive {
    return this.hasMixin(obj, Mixins.Radioactive);
  }

  public static isPersistable(obj: Stuff): obj is Stuff & Persistable {
    return this.hasMixin(obj, Mixins.Persistable);
  }

  public static isForkable(obj: Stuff): obj is Forkable {
    return this.hasMixin(obj, Mixins.Forkable);
  }

  public static isSlotted(obj: Stuff): obj is Stuff & Slotted {
    return this.hasMixin(obj, Mixins.Slotted);
  }

  public static isSlottable(obj: Stuff): obj is Stuff & Slottable {
    return this.hasMixin(obj, Mixins.Slottable);
  }

  public static isWearable(obj: Stuff): obj is Stuff & Wearable {
    return this.hasMixin(obj, Mixins.Wearable);
  }

  public static isWieldable(obj: Stuff): obj is Stuff & Wieldable {
    return this.hasMixin(obj, Mixins.Wieldable);
  }

  public static isPostured(obj: Stuff): obj is Stuff & Postured {
    return this.hasMixin(obj, Mixins.Postured);
  }

  public static isPosed(obj: Stuff): obj is Stuff & Posed {
    return this.hasMixin(obj, Mixins.Posed);
  }

  public static isMountable(obj: Stuff): obj is Stuff & Mountable {
    return this.hasMixin(obj, Mixins.Mountable);
  }

  public static isDrivable(obj: Stuff): obj is Stuff & Drivable {
    return this.hasMixin(obj, Mixins.Drivable);
  }

  public static isHaulable(obj: Stuff): obj is Stuff & Haulable {
    return this.hasMixin(obj, Mixins.Haulable);
  }

  public static isHauling(obj: Stuff): obj is Stuff & Hauler {
    return this.hasMixin(obj, Mixins.Hauler);
  }

  public static isSpawner(obj: Stuff): obj is Stuff & Spawner {
    return this.hasMixin(obj, Mixins.Spawner);
  }

  public static isSpawned(obj: Stuff): obj is Stuff & Spawned {
    return this.hasMixin(obj, Mixins.Spawned);
  }

  public static isGlobbable(obj: Stuff): obj is Stuff & Globbable {
    return this.hasMixin(obj, Mixins.Globbable);
  }

  /** A movable good carrying a durable per-instance chattel identity. */
  public static isChattel(obj: Stuff): obj is Stuff & Chattel {
    return this.hasMixin(obj, Mixins.Chattel);
  }

  /** A principal whose record carries the goods it holds title to. */
  public static isEstate(obj: Stuff): obj is Stuff & Estate {
    return this.hasMixin(obj, Mixins.Estate);
  }

  /** An object that restores itself on the game-time reset sweep. */
  public static isResettable(obj: Stuff): obj is Stuff & Resettable {
    return this.hasMixin(obj, Mixins.Resettable);
  }

  /** A held-goods fixture — the custody base (a coat check OR a
   * consignment shelf): holds player-owned goods, hands them back to their
   * owner. `reclaim` narrows on this so it serves both. */
  public static isHeldGoodsShelf(
    obj: Stuff,
  ): obj is Stuff & HeldGoodsShelf {
    return this.hasMixin(obj, Mixins.HeldGoodsShelf);
  }

  /** The store's brokerage shelf (held goods + the sale layer). */
  public static isConsignmentShelf(
    obj: Stuff,
  ): obj is Stuff & ConsignmentShelf {
    return this.hasMixin(obj, Mixins.ConsignmentShelf);
  }

  public static isBulkable(obj: Stuff): obj is Stuff & Bulkable {
    return this.hasMixin(obj, Mixins.Bulkable);
  }

  public static isEngaged(obj: Stuff): obj is Stuff & Engaged {
    return this.hasMixin(obj, Mixins.Engaged);
  }

  public static isBehaved(obj: Stuff): obj is Stuff & Behaved {
    return this.hasMixin(obj, Mixins.Behaved);
  }

  public static isAtmospheric(obj: Stuff): obj is Stuff & Atmospheric {
    return this.hasMixin(obj, Mixins.Atmospheric);
  }

  public static isAddressable(obj: Stuff): obj is Stuff & Addressable {
    return this.hasMixin(obj, Mixins.Addressable);
  }

  public static isSkyExposed(obj: Stuff): obj is Stuff & SkyExposed {
    return this.hasMixin(obj, Mixins.SkyExposed);
  }

  public static isWarrenMember(obj: Stuff): obj is Stuff & WarrenMember {
    return this.hasMixin(obj, Mixins.WarrenMember);
  }

  public static isOffstage(obj: Stuff): obj is Stuff & Offstage {
    return this.hasMixin(obj, Mixins.Offstage);
  }

  public static isBeliefStore(obj: Stuff): obj is Stuff & BeliefStore {
    return this.hasMixin(obj, Mixins.BeliefStore);
  }

  public static isDisguisable(obj: Stuff): obj is Stuff & Disguisable {
    return this.hasMixin(obj, Mixins.Disguisable);
  }

  public static isDisguiseBearing(obj: Stuff): obj is Stuff & DisguiseBearing {
    return this.hasMixin(obj, Mixins.DisguiseBearing);
  }

  public static isStatus(obj: Stuff): obj is Stuff & Status {
    return this.hasMixin(obj, Mixins.Status);
  }

  public static isIdentifiable(obj: Stuff): obj is Stuff & Identifiable {
    return this.hasMixin(obj, Mixins.Identifiable);
  }

  public static isGraded(obj: Stuff): obj is Stuff & Graded {
    return this.hasMixin(obj, Mixins.Graded);
  }

  public static isTool(obj: Stuff): obj is Stuff & Tooled {
    return this.hasMixin(obj, Mixins.Tool);
  }

  /** A durable good with a wear-on-use condition gauge (tool / weapon /
   * armor). A `Tool` is also `Durable`; the reverse does not hold. */
  public static isDurable(obj: Stuff): obj is Stuff & Durable {
    return this.hasMixin(obj, Mixins.Durable);
  }

  /** An edged/pointed good with the fast-cycling keenness (edge) gauge —
   * Durable's working-surface sibling. See KeenMixin. */
  public static isKeen(obj: Stuff): obj is Stuff & Keen {
    return this.hasMixin(obj, Mixins.Keen);
  }

  /** A first-aid dressing item (bandage / gauze / rag). See DressingMixin. */
  public static isDressing(obj: Stuff): obj is Stuff & Dressing {
    return this.hasMixin(obj, Mixins.Dressing);
  }

  public static isCrafted(obj: Stuff): obj is Stuff & Crafted {
    return this.hasMixin(obj, Mixins.Crafted);
  }

  public static isVesselKind(obj: Stuff): obj is Stuff & VesselKind {
    return this.hasMixin(obj, Mixins.VesselKind);
  }

  public static isCutlery(obj: Stuff): obj is Stuff & Cutlery {
    return this.hasMixin(obj, Mixins.Cutlery);
  }

  public static isServiceable(obj: Stuff): obj is Stuff & Serviceable {
    return this.hasMixin(obj, Mixins.Serviceable);
  }

  /**
   * Whether `obj` can **currently** fulfill an order. `MakerMixin` is
   * augment-gated, so this routes through {@link isActive} (activeness),
   * not {@link hasMixin} (composition): a bar `Crafter` composes
   * `MakerMixin` always but is a maker only while its on-shift Position
   * confers it. The two `isMaker` consumers — `CraftingLogic.resolveMaker`
   * (order fulfilment) and `BankingControllerBase` (the house
   * representative) — thereby resolve only the on-shift bartender.
   */
  public static isMaker(obj: Stuff): obj is Stuff & Maker {
    return this.isActive(obj, Mixins.Maker);
  }

  /** A manual-build vessel — the shaker/mixing-glass that buffers a build. */
  public static isBuildVessel(obj: Stuff): obj is Stuff & Builds {
    return this.hasMixin(obj, Mixins.ManualBuild);
  }

  /**
   * An actor whose **casting faculty is active** — composed AND conferred
   * (the actor's `Species.innateMixins` or an augment names `CasterMixin`;
   * the `isMaker` activation precedent). Every `Character` composes the
   * mixin; only a casting species' members pass this predicate, so the
   * `cast` pipeline and the verb affordance key on *activation*, not
   * composition.
   */
  public static isCaster(obj: Stuff): obj is Stuff & Caster {
    return this.isActive(obj, Mixins.Caster);
  }

  /**
   * A thing that **produces magic-tagged effects** and can name its grid
   * footprint — every magic item today, traps and NPC powers later.
   * Composition, not activation: a depleted wand is still arcane (its
   * ward interaction and its rarity do not depend on its charge).
   */
  public static isArcane(obj: Stuff): obj is Stuff & Arcane {
    return this.hasMixin(obj, Mixins.Arcane);
  }

  /** A discrete item that packages one act and spends itself doing it. */
  public static isConsumable(obj: Stuff): obj is Stuff & Consumable {
    return this.hasMixin(obj, Mixins.Consumable);
  }

  /** A liquid that carries a working — composed on the Material (D4). */
  public static isPotable(obj: Stuff): obj is Stuff & Potable {
    return this.hasMixin(obj, Mixins.Potable);
  }

  /** A thing bearing readable marks — scroll, book, label, signpost. */
  public static isMarked(obj: Stuff): obj is Stuff & Marked {
    return this.hasMixin(obj, Mixins.Marked);
  }

  /**
   * A thing a player can write their own name on (D28). General
   * annotation — it serves storage, shops and gifts as much as it serves
   * an unidentified flask.
   */
  public static isLabelled(obj: Stuff): obj is Stuff & Labelled {
    return this.hasMixin(obj, Mixins.Labelled);
  }

  /** A mind currently holding spell specifications (D15). */
  public static isMemorized(obj: Stuff): obj is Stuff & Memorized {
    return this.hasMixin(obj, Mixins.Memorized);
  }

  /** Part of the world's countable stock — the distribution marker (D21). */
  public static isCirculating(obj: Stuff): obj is Stuff & Circulating {
    return this.hasMixin(obj, Mixins.Circulating);
  }

  /**
   * A **battery**: holds energy, spends it on use, and leaks (D7).
   * Composition, not state — a DEPLETED wand is still `Charged`, which
   * is what lets its verb keep affording while failing audibly (D34).
   */
  public static isCharged(obj: Stuff): obj is Stuff & Charged {
    return this.hasMixin(obj, Mixins.Charged);
  }

  /**
   * Does this thing couple an arcane reserve to a shell? The apparatus
   * half of `recharge` — see {@link ConduitMixin}.
   */
  public static isConduit(obj: Stuff): obj is Stuff & Conduit {
    return this.hasMixin(obj, Mixins.Conduit);
  }


  /**
   * Carries a blessed/uncursed/cursed band — a potency level on the
   * item's own effect axis (D11). **Opt-in per template**: most things
   * have no BUC state and should not carry the hidden-state risk.
   */
  public static isBlessable(obj: Stuff): obj is Stuff & Blessable {
    return this.hasMixin(obj, Mixins.Blessable);
  }

  public static isBank(obj: Stuff): obj is Stuff & Bank {
    return this.hasMixin(obj, Mixins.Bank);
  }

  /**
   * An entity with an org chart — positions, holders and an appointing
   * authority (the `OrganizationMixin` marker). Every Business is one; a
   * ministry or a press office is one that does not trade.
   */
  public static isOrganization(obj: Stuff): obj is Stuff & Organization {
    return this.hasMixin(obj, Mixins.Organization);
  }

  /**
   * An organization that publishes (`PublisherMixin`) — a press office, a
   * ministry's communications shop, a newspaper.
   */
  public static isPublisher(obj: Stuff): obj is Stuff & Publisher {
    return this.hasMixin(obj, Mixins.Publisher);
  }

  /** A standalone employing Business (the `BusinessMixin` marker). */
  public static isBusiness(obj: Stuff): obj is Stuff & Business {
    return this.hasMixin(obj, Mixins.Business);
  }

  /** A storefront-attention service point (`AttendantMixin`). */
  public static isAttendant(obj: Stuff): obj is Stuff & Attendant {
    return this.hasMixin(obj, Mixins.Attendant);
  }

  /** An actor that can hold employment relationships (`EmployedMixin`). */
  public static isEmployed(obj: Stuff): obj is Stuff & Employed {
    return this.hasMixin(obj, Mixins.Employed);
  }

  /** An actor that can fight (`CombatantMixin`). */
  public static isCombatant(obj: Stuff): obj is Stuff & Combatant {
    return this.hasMixin(obj, Mixins.Combatant);
  }

  /** A combat-reactive instrument/carrier (`CombatReactiveMixin`) — the
   * instrument dynamics seam the combat engine scans for. */
  public static isCombatReactive(obj: Stuff): obj is Stuff & CombatReactive {
    return this.hasMixin(obj, Mixins.CombatReactive);
  }

  /** An actor that can belong to a party (`PartyMemberMixin`). */
  public static isPartyMember(obj: Stuff): obj is Stuff & PartyMember {
    return this.hasMixin(obj, Mixins.PartyMember);
  }

  /**
   * Walk the prototype chain unioning the static `instructionFields`
   * arrays declared at each level. Deduplicates. Mirrors the shape of
   * {@link getAllPersistentFields} but for **instruction fields** —
   * declarations applied to produce/modify derived runtime state via
   * an `applyX` method, rather than stored as the value of a property.
   *
   * Instruction fields are the second half of the property/instruction
   * split (see `feedback_property_vs_instruction_fields`). `exits` on
   * `ExitableMixin` is the canonical example: the YAML data is a
   * `Record<string, ExitInstruction>` recipe, applied by `applyExits` to
   * populate the runtime `exits: Map<string, Exit>`. There is no
   * paired getter for the spec; the runtime collection has its own
   * API (`getExit`, `addExit`, …).
   *
   * `PersistentHydrator` dispatches in two phases: Phase 1 reads every
   * entry in `getAllPersistentFields` and writes via `setX` (or
   * bracket-assigns when no setter exists); Phase 2 reads every entry
   * in `getAllInstructionFields` and calls `applyX`. An instruction
   * field whose `applyX` method is missing is a configuration bug,
   * surfaced as a clear runtime error at hydrate time.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of all instruction field names (deduplicated)
   */
  public static getAllInstructionFields(constructor: AnyConstructor): string[] {
    const meta = MixinApi.getAllFieldMeta(constructor);
    return Object.keys(meta).filter((f) => meta[f]!.instruction === true);
  }

  /**
   * Walk the prototype chain unioning the static `subscribableFields`
   * arrays declared at each level. Mirrors the shape of
   * {@link getAllPersistentFields}. Order is parent-first → child-
   * last; later entries on the same name win in the caller's
   * downstream merge (`collectSubscribableFields` in mql-subscription.ts).
   *
   * `SubscribableFieldDescriptor` is defined in `mql-subscription.ts`;
   * we use a structural local type here to avoid a runtime import
   * cycle (mixin.ts is below mql-subscription.ts in the layering).
   */
  public static getAllSubscribableFields(
    constructor: AnyConstructor,
  ): Array<{ name: string; [k: string]: unknown }> {
    const out: Array<{ name: string; [k: string]: unknown }> = [];
    let current: unknown = constructor;
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        subscribableFields?: Array<{ name: string; [k: string]: unknown }>;
      };
      if (
        Object.prototype.hasOwnProperty.call(c, 'subscribableFields') &&
        Array.isArray(c.subscribableFields)
      ) {
        out.push(...c.subscribableFields);
      }
      current = Object.getPrototypeOf(current);
    }
    return out;
  }

  /**
   * Walk the prototype chain unioning the static `markupAugmenters`
   * arrays declared at each level. Returned in **parent-first →
   * child-last** order so `Mml.augment`'s fold applies the more
   * fundamental transformations first and the more specific
   * (deeper in the chain) ones last — same intuition as CSS
   * specificity.
   *
   * Distinct from {@link getAllSubscribableFields}, which is
   * leaf-first because a subclass's descriptor needs to override
   * the parent's on the collision Map; augmenters have no
   * override semantics, so we order for readability instead.
   *
   * The augmenter signature `(text, host, viewer) => string` is
   * defined in `api/mml.ts` (alongside the `Mml.augment` static);
   * we use a structural local type here to avoid a runtime import
   * cycle (mixin.ts is below mml.ts in the layering).
   */
  public static getAllMarkupAugmenters(
    constructor: AnyConstructor,
  ): Array<(text: string, host: unknown, viewer: unknown, opts?: unknown) => string> {
    type AugFn = (
      text: string,
      host: unknown,
      viewer: unknown,
      opts?: unknown,
    ) => string;
    // Walk leaf → root, collecting contributing levels.
    const chain: AugFn[][] = [];
    let current: unknown = constructor;
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        markupAugmenters?: AugFn[];
      };
      if (
        Object.prototype.hasOwnProperty.call(c, 'markupAugmenters') &&
        Array.isArray(c.markupAugmenters)
      ) {
        chain.push(c.markupAugmenters);
      }
      current = Object.getPrototypeOf(current);
    }
    // Flatten root → leaf so the fold applies parent's augmenters
    // before child's.
    const out: AugFn[] = [];
    for (let i = chain.length - 1; i >= 0; i--) {
      out.push(...chain[i]!);
    }
    return out;
  }

  /**
   * Walk the prototype chain unioning the static `globIdentityFields`
   * arrays declared at each level. Deduplicates. Mirrors the shape of
   * {@link getAllPersistentFields}.
   *
   * A glob's "kind" is defined by the values of these fields plus
   * `templatePath`; two globs merge iff their templatePath matches and
   * every glob-identity field has equal values.
   */
  public static getAllGlobIdentityFields(constructor: AnyConstructor): string[] {
    const meta = MixinApi.getAllFieldMeta(constructor);
    return Object.keys(meta).filter((f) => meta[f]!.globIdentity === true);
  }

  /**
   * Once-per-class composition validation hook.
   *
   * Walks the prototype chain calling each level's static
   * `__validateComposition__(ctor)` method exactly once per concrete
   * class. Mixins that want to enforce composition constraints
   * declare the static; everyone else is a no-op.
   *
   * Called from `StuffApi.register` so the check fires the first time
   * an instance of a given class lands in the registry. Subsequent
   * registrations of the same class short-circuit on the WeakSet
   * memo.
   *
   * ## HMR behavior
   *
   * The memo is keyed on **constructor identity**, not class name.
   * `HotReloadApi.reload` re-evaluates a module and produces a NEW
   * class binding (per `ModuleApi.stamp`'s "first-stamp-wins" rule —
   * same name, fresh identity). The new class is not in the WeakSet,
   * so the next first-instance-of-class registration re-runs
   * validation against whatever `__validateComposition__` is on the
   * NEW chain. Old class identities stay memoized — fine, because
   * nothing creates new instances of a post-HMR-retired class.
   *
   * **Leaf reload required.** Reloading a mixin module alone is NOT
   * enough to pick up a new check. JS class inheritance is bound at
   * class-definition time: `class Coin extends GlobbableMixin(Idea)`
   * captures whatever `GlobbableMixin` returned at that expression's
   * evaluation. Reloading `Globbable.ts` produces a new mixin
   * function and registers it with `HotReloadApi`, but `Coin`'s
   * prototype chain still points at the OLD mixin output. Since
   * `Coin`'s constructor identity hasn't changed, the WeakSet hit
   * memoizes the old validation forever.
   *
   * To rotate the validation: reload the **leaf class** too. That
   * re-evaluates its `class Coin extends GlobbableMixin(Idea)`
   * expression against the new mixin output, produces a fresh
   * `Coin` constructor identity, and the next first-instance triggers
   * the new check.
   *
   * No auto-cascade — there's no machinery that reloads leaves when
   * a mixin reloads. That's intentional: bulk re-instantiation while
   * a player is mid-action would be jarring. The right tool for
   * "refresh every Globbable in the world" is an MQL query (e.g.,
   * `world:[mixin.GlobbableMixin]`) plus an explicit reload, run by
   * the dev when they're ready. Forgetting to reload leaves doesn't
   * create inconsistency — the old check just keeps applying; the
   * new constraint silently doesn't tighten, but nothing breaks.
   *
   * Cross-reference: `docs/subsystems/mixins.md` §Composition
   * validation, `docs/subsystems/hot-reload.md` §Composition
   * validation.
   *
   * ## Current opt-ins
   *
   * - `GlobbableMixin` — `⊥ Container`, `⊥ Singleton`,
   *   `globIdentityFields ⊂ persistentFields`.
   * - `PerceiverMixin` — requires `Sensor` on the chain. The TS
   *   bound is loose (`MixinConstructor`); the `Perceiver extends
   *   Sensor` interface relationship narrows the type but doesn't
   *   enforce composition. Without runtime co-composition,
   *   `MixinApi.isPerceiver` would lie.
   *
   * ## Not migrated (TypeScript bound already covers)
   *
   * A bound is cheaper and more specific — see the principle in
   * `docs/subsystems/mixins.md` §Composition validation. These
   * mixins document a constraint, but the constraint is enforced at
   * compile time and doesn't need the runtime hook:
   *
   * - `AdornableMixin` — `MixinConstructor<Stuff & Container>`.
   * - `WearableMixin` / `WieldableMixin` —
   *   `MixinConstructor<Stuff & Slottable & Containable>`.
   * - `MobileMixin` — `MixinConstructor<Stuff & Containable>`.
   * - `PosturedMixin` / `MountableMixin` / `DrivableMixin` —
   *   `MixinConstructor<Stuff & Slotted>`.
   * - `WorkspaceMixin` — `MixinConstructor<Stuff & Environment>`.
   *
   * Soft pairings documented in JSDoc but not strictly required
   * (e.g., `AdornmentMixin` typically composed with `Containable` so
   * it can become inventory after detach — but a never-detached
   * adornment is fine without it) are not modeled here either.
   */
  public static assertComposable(constructor: AnyConstructor): void {
    if (this.#validatedClasses.has(constructor)) return;
    MixinApi.#validateFieldMeta(constructor);
    let current: unknown = constructor;
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        __validateComposition__?: (ctor: AnyConstructor) => void;
      };
      if (
        Object.prototype.hasOwnProperty.call(c, '__validateComposition__') &&
        typeof c.__validateComposition__ === 'function'
      ) {
        c.__validateComposition__(constructor);
      }
      current = Object.getPrototypeOf(current);
    }
    this.#validatedClasses.add(constructor);
  }

  /**
   * The `ref: 'instance'` fields of a class, or `null` when it has none
   * — the set the proxy get-trap consults to self-heal a destroyed
   * target on read.
   *
   * **Every** single instance ref self-heals on read; the `lifetime`
   * axis names only the *destruct-side* rule. That is not a
   * simplification: three shipped sites already carry two rules at once
   * (`Hauler`/`Haulable` are symmetric AND self-heal, `Containable`
   * is self-heal AND R2.4, `Boundary`'s anchors are symmetric AND
   * owned), so making the axes exclusive would contradict the tree.
   * `weak` therefore means "no destruct-side rule", not "the only one
   * that heals".
   *
   * Returns `null` rather than an empty set on purpose: the trap's hot
   * path is a single `!== null`, and for nearly every class in the game
   * that is the whole cost.
   *
   * Memoized on constructor identity, which is HMR-correct — a reloaded
   * module yields a fresh constructor and therefore a fresh entry.
   */
  public static getWeakRefFields(
    constructor: AnyConstructor
  ): ReadonlySet<string> | null {
    const cached = MixinApi.#weakRefFields.get(constructor);
    if (cached !== undefined) return cached;
    const meta = MixinApi.getAllFieldMeta(constructor);
    const fields = Object.keys(meta).filter(
      (f) => meta[f]!.ref === 'instance'
    );
    const result = fields.length > 0 ? new Set(fields) : null;
    MixinApi.#weakRefFields.set(constructor, result);
    return result;
  }

  static #weakRefFields = new WeakMap<
    AnyConstructor,
    ReadonlySet<string> | null
  >();

  /**
   * Reference-axis validation, run once per class at registration.
   *
   * These are not style rules. Each names a combination that cannot be
   * made to work, so the honest place to find out is registration —
   * loudly, naming the field and the class — rather than a silent
   * mis-persist or a dangling ref discovered months later.
   *
   * Checked on the MERGED metadata, which is why it lives here and not
   * in `lint:field-meta`: the merge is property-level up the prototype
   * chain, so a base may declare `ref: 'instance'` and a subclass
   * sharpen it with a `lifetime`. Only a walk that holds the
   * constructor can see the result. The static lint carries the
   * complementary rules — the ones that are wrong within a single class
   * body no matter what any other layer says.
   *
   * Rule 4 is deliberately **same-class only**. A cross-class pair
   * (`Adornment.adornedTo` ↔ `Adornable.fixtureSlots`) lives on two
   * different hosts, and registering one cannot see the other; that case
   * belongs to `lint:field-meta`, which sees the whole tree statically.
   */
  static #validateFieldMeta(constructor: AnyConstructor): void {
    const meta = MixinApi.getAllFieldMeta(constructor);
    const name = (constructor as { name?: string }).name ?? '<anonymous>';
    const fail = (field: string, why: string): never => {
      throw new Error(
        `${name}.fieldMeta['${field}']: ${why}. See docs/ref-shapes.md.`
      );
    };

    for (const [field, entry] of Object.entries(meta)) {
      if (entry.ref === 'instance' && entry.persistent) {
        fail(
          field,
          `an instance ref cannot be persistent — a stuffId does not ` +
            `survive a reboot, so there is nothing durable to write down ` +
            `(an IDENTITY ref with persistent: true is the normal case)`
        );
      }
      if (entry.ref === 'identity' && entry.lifetime) {
        fail(
          field,
          `an identity ref takes no lifetime — it re-resolves from its ` +
            `path on read, so it cannot dangle`
        );
      }
      if (entry.lifetime && entry.ref !== 'instance') {
        fail(
          field,
          `declares lifetime '${entry.lifetime}' without ref: 'instance' ` +
            `— a lifetime is the destruct-side rule for an instance ref`
        );
      }
      if (entry.lifetime === 'symmetric' && !entry.inverse) {
        fail(
          field,
          `is symmetric with no 'inverse' — the framework cannot find ` +
            `what to clear on the other side`
        );
      }
      // Same-class reciprocity. A cross-class inverse is invisible from
      // here and is left to the whole-tree lint; an inverse naming a
      // field this class DOES declare must point back.
      const other = entry.inverse ? meta[entry.inverse] : undefined;
      if (entry.inverse && other && other.lifetime !== 'symmetric') {
        fail(
          field,
          `names inverse '${entry.inverse}', which this class declares ` +
            `but not as symmetric — a symmetric pair must be reciprocal`
        );
      }
    }
  }

  static #validatedClasses = new WeakSet<AnyConstructor>();
}



/**
 * Collect every gated-mixin name *conferred* onto `stuff`, from BOTH
 * conferral sources — the innate⊕acquired union:
 *   - **acquired**: installed slot augments (`AugmentMixin.confers()`),
 *     walked via the SlottedMixin `getAllOccupants` surface;
 *   - **innate**: the actor's species (`Species.innateMixins`), reached
 *     via the structural `getSpecies()` surface.
 *
 * Used by `getActiveMixins` to resolve gated mixins' activation state.
 * A non-Slotted host simply contributes no augment names; a host with
 * no species contributes no innate names. Both surfaces are duck-typed
 * to avoid a startup import cycle through `SlotApi` / `Species`.
 */
function collectAugmentConferralNames(stuff: Stuff): Set<string> {
  const out = new Set<string>();
  // `getAllOccupants` is the SlottedMixin surface — returns a
  // Map<slotName, ReadonlySet<occupant>>. Non-Slotted hosts have no
  // augments; return the empty set. Structural-shape lookup avoids
  // importing SlotApi at module load (would re-enter this module via
  // its decorator-decoration chain).
  const slotted = stuff as unknown as {
    getAllOccupants?: () => ReadonlyMap<string, ReadonlySet<Stuff>>;
  };
  const getter = slotted.getAllOccupants;
  if (typeof getter === 'function') {
    let occupantsByslot: ReadonlyMap<string, ReadonlySet<Stuff>> | undefined;
    try {
      occupantsByslot = getter.call(stuff);
    } catch {
      occupantsByslot = undefined;
    }
    if (occupantsByslot) {
      for (const occupantSet of occupantsByslot.values()) {
        for (const occupant of occupantSet) {
          if (!MixinApi.hasMixin(occupant, 'AugmentMixin' as MixinName)) {
            continue;
          }
          const augment = occupant as unknown as {
            confers?: () => readonly string[];
          };
          if (typeof augment.confers !== 'function') continue;
          let names: readonly string[];
          try {
            names = augment.confers();
          } catch {
            continue;
          }
          for (const name of names) out.add(name);
        }
      }
    }
  }
  // Intrinsic (innate) conferral: union the actor's species
  // `innateMixins`, the mirror of `AugmentMixin.confers()`. Reached by
  // the same structural-shape lookup as `getAllOccupants` to avoid an
  // import cycle through Species. A born-attuned species confers
  // `AetherMixin` with no implant. Hot-path cost is one `getSpecies()`
  // templatePath lookup, run only when a gated mixin is hit.
  const speciesHost = stuff as unknown as {
    getSpecies?: () => { getInnateMixins?: () => readonly string[] } | null;
  };
  if (typeof speciesHost.getSpecies === 'function') {
    let innate: readonly string[] | undefined;
    try {
      innate = speciesHost.getSpecies()?.getInnateMixins?.();
    } catch {
      innate = undefined;
    }
    if (innate) for (const name of innate) out.add(name);
  }
  // Employment conferral: an on-shift Position confers its `confers`
  // mixins on the holder (the `getConferredMixinNames` seam on
  // `EmployedMixin`). The same structural soft-lookup — no import of the
  // employment layer — so an on-shift bartender's gated `MakerMixin` goes
  // active and an off-shift one's goes inert.
  const employed = stuff as unknown as {
    getConferredMixinNames?: () => readonly string[];
  };
  if (typeof employed.getConferredMixinNames === 'function') {
    let names: readonly string[] | undefined;
    try {
      names = employed.getConferredMixinNames();
    } catch {
      names = undefined;
    }
    if (names) for (const name of names) out.add(name);
  }
  return out;
}

SecurityApi.decorateApiClass(MixinApi);
