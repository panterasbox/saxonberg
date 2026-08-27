/**
 * lib-to-obj-moves — the single source of truth for the lib/→obj/
 * taxonomy migration.
 *
 * Five consumers read this table: the file mover, the import codemod,
 * the YAML/TS/MD text sweep, the `lint:instanceable` gate, and the
 * `migrate-lib-to-obj` data migration. One table means the code on disk
 * and the rows in Mongo cannot drift apart.
 *
 * ## Idempotency is structural, not a flag
 *
 * Every `from` begins `/lib/`; no `to` does. Therefore
 * `rewrite(rewrite(x)) === rewrite(x)`, and a half-migrated database
 * converges rather than corrupting. Nothing here depends on remembering
 * to pass a flag.
 *
 * ## Three axes, deliberately separate
 *
 * A naive "rewrite every /lib/ string" pass is WRONG, and the reason is
 * the splits: `/lib/stuff/Thing` stays exactly where it is as a class,
 * but templates that used to name it must now name `/obj/Prop`. The same
 * literal means different things in an import, a gate string, and a
 * template's `class:` field.
 *
 *   - `file`     The .ts file moved. Rewrite relative imports, template
 *                `class:` values, and `FromModule`/`FromController` gate
 *                strings — all three name the module.
 *   - `classref` A split. NO file moved; the abstract base stays in
 *                `lib/`. Rewrite ONLY template `class:` values. Touching
 *                an import or a gate string here would repoint live code
 *                at the wrong class.
 *   - `path`     A template path moved. Rewrite template-path literals
 *                in .ts/.yaml/.md and relocate the seed file. Never an
 *                import — template paths are not module paths.
 *
 * `hydratorClass` is a **template path**, not a module path, despite
 * looking like one (`api/stuff.ts` resolves it via `singleton()`). It
 * rides the `path` axis. This is the single easiest thing to get wrong
 * in this migration.
 *
 * See docs/plans/lib-obj-taxonomy-plan.md §2.
 */

export type MoveAxis = 'file' | 'classref' | 'path';

export interface MoveRule {
  /** Always starts with "/lib/". */
  from: string;
  to: string;
  /** "exact" = whole-string match; "prefix" = match including the trailing slash. */
  kind: 'exact' | 'prefix';
  axis: MoveAxis;
  note?: string;
}

/* ───────────────────────── the file axis ─────────────────────────
 * 77 class files leaving lib/. Flat at obj/<Name> unless the class is
 * in one of the eight closed clusters (see the plan's §2.1 table).
 */
const FILE_MOVES: ReadonlyArray<readonly [string, string]> = [
  // — obj/equipment/ —
  ['/lib/equipment/Armor', '/obj/equipment/Armor'],
  ['/lib/equipment/Garment', '/obj/equipment/Garment'],
  ['/lib/equipment/Handcart', '/obj/equipment/Handcart'],
  ['/lib/equipment/Pack', '/obj/equipment/Pack'],
  ['/lib/equipment/PortableLight', '/obj/equipment/PortableLight'],
  ['/lib/equipment/Shield', '/obj/equipment/Shield'],
  ['/lib/equipment/Weapon', '/obj/equipment/Weapon'],
  // subclasses land beside the base they extend
  ['/lib/electricity/StunBaton', '/obj/equipment/StunBaton'],
  ['/lib/disguise/DisguiseGarment', '/obj/equipment/DisguiseGarment'],

  // — obj/modalities/ —
  ['/lib/perception/modalities/VisionModality', '/obj/modalities/VisionModality'],
  ['/lib/perception/modalities/SoundModality', '/obj/modalities/SoundModality'],
  ['/lib/perception/modalities/SmellModality', '/obj/modalities/SmellModality'],
  ['/lib/perception/modalities/TasteModality', '/obj/modalities/TasteModality'],
  ['/lib/perception/modalities/TouchModality', '/obj/modalities/TouchModality'],
  ['/lib/perception/modalities/VerbalESPModality', '/obj/modalities/VerbalESPModality'],
  ['/lib/perception/modalities/EmotiveESPModality', '/obj/modalities/EmotiveESPModality'],

  // — obj/location/ —
  ['/lib/location/CartesianZone', '/obj/location/CartesianZone'],
  ['/lib/location/FurnishableRoom', '/obj/location/FurnishableRoom'],
  ['/lib/location/SphericalLocation', '/obj/location/SphericalLocation'],
  ['/lib/location/SphericalZone', '/obj/location/SphericalZone'],

  // — obj/species/ —
  ['/lib/species/BodyPlan', '/obj/species/BodyPlan'],
  ['/lib/species/Clade', '/obj/species/Clade'],
  ['/lib/species/Species', '/obj/species/Species'],

  // — obj/magic/ —
  ['/lib/magic/GlowlightOrb', '/obj/magic/GlowlightOrb'],
  ['/lib/magic/SparkSource', '/obj/magic/SparkSource'],
  ['/lib/magic/Spell', '/obj/magic/Spell'],

  // — obj/corpo/ —
  ['/lib/corpo/Brand', '/obj/corpo/Brand'],
  ['/lib/corpo/BrandedBottle', '/obj/corpo/BrandedBottle'],
  ['/lib/corpo/Corpo', '/obj/corpo/Corpo'],

  // — obj/persistence/ —
  ['/lib/persistence/EncryptedStringMarshaller', '/obj/persistence/EncryptedStringMarshaller'],
  ['/lib/persistence/PersistentHydrator', '/obj/persistence/PersistentHydrator'],
  ['/lib/persistence/QuantityMarshaller', '/obj/persistence/QuantityMarshaller'],

  // — obj/material/ —
  // A cluster because MaterialLogic.boot FILTERS on it: it keeps a
  // template row only when `tpl.class.startsWith('/obj/material/')`.
  // Flat placement broke that filter, so the directory is load-bearing
  // rather than cosmetic.
  ['/lib/material/ConsumableMaterial', '/obj/material/ConsumableMaterial'],
  ['/lib/material/RadioactiveMaterial', '/obj/material/RadioactiveMaterial'],

  // — obj/sandbox/ —
  ['/lib/sandbox/CircleFloor', '/obj/sandbox/CircleFloor'],
  ['/lib/sandbox/SandboxCrossing', '/obj/sandbox/SandboxCrossing'],
  ['/lib/sandbox/WireBody', '/obj/sandbox/WireBody'],

  // — flat at obj/ —
  ['/lib/address/Locality', '/obj/Locality'],
  ['/lib/advancement/Discipline', '/obj/Discipline'],
  ['/lib/attendant/AttendancePoint', '/obj/AttendancePoint'],
  ['/lib/attendant/Ticket', '/obj/Ticket'],
  ['/lib/augmentation/AetherImplant', '/obj/AetherImplant'],
  ['/lib/banking/BankCounter', '/obj/BankCounter'],
  ['/lib/banking/PaymentCard', '/obj/PaymentCard'],
  ['/lib/biome/SkyExposedBiome', '/obj/SkyExposedBiome'],
  ['/lib/boundary/Door', '/obj/Door'],
  ['/lib/boundary/Window', '/obj/Window'],
  ['/lib/character/Crafter', '/obj/Crafter'],
  ['/lib/character/HaulingCreature', '/obj/HaulingCreature'],
  ['/lib/civics/Government', '/obj/Government'],
  ['/lib/combat/CombatFormation', '/obj/CombatFormation'],
  ['/lib/comms/CommsUpdate', '/obj/CommsUpdate'],
  ['/lib/craft/ToolItem', '/obj/ToolItem'],
  ['/lib/craft/Whetstone', '/obj/Whetstone'],
  ['/lib/credential/CredentialWalletUpdate', '/obj/CredentialWalletUpdate'],
  ['/lib/electricity/LiveWire', '/obj/LiveWire'],
  ['/lib/employment/Business', '/obj/Business'],
  ['/lib/employment/JobBoard', '/obj/JobBoard'],
  ['/lib/forum/ForumsUpdate', '/obj/ForumsUpdate'],
  ['/lib/hazard/Trap', '/obj/Trap'],
  ['/lib/hazard/TrapKit', '/obj/TrapKit'],
  ['/lib/home/HomeZone', '/obj/HomeZone'],
  ['/lib/identification/IdentifiableThing', '/obj/IdentifiableThing'],
  ['/lib/identification/IdentifyScroll', '/obj/IdentifyScroll'],
  ['/lib/lock/Key', '/obj/Key'],
  ['/lib/locomotion/LocomotionMode', '/obj/LocomotionMode'],

  ['/lib/messaging/Topic', '/obj/Topic'],
  ['/lib/mortality/Shade', '/obj/Shade'],
  ['/lib/party/Mercenary', '/obj/Mercenary'],
  ['/lib/party/Party', '/obj/Party'],
  ['/lib/retail/ConsignmentShelf', '/obj/ConsignmentShelf'],
  ['/lib/retail/Stock', '/obj/Stock'],
  ['/lib/script/EvalScript', '/obj/EvalScript'],
  ['/lib/spatial/Surface', '/obj/Surface'],
  ['/lib/stuff/VoidLocation', '/obj/VoidLocation'],
  ['/lib/vitals/Condition', '/obj/Condition'],
  ['/lib/zone/FolderZone', '/obj/FolderZone'],
];

/* ───────────────────────── the classref axis ─────────────────────────
 * The eight splits. The `from` class STAYS in lib/ as substrate; a new
 * concrete class in obj/ absorbs the generic clones. Only a template's
 * `class:` field is repointed — never an import, never a gate string.
 */
const CLASSREF_MOVES: ReadonlyArray<readonly [string, string, string]> = [
  ['/lib/stuff/Thing', '/obj/Prop', 'generic props: gutter-litter, rations, anvil, toilet'],
  ['/lib/location/CartesianLocation', '/obj/location/Room', '37 room templates'],
  ['/lib/npc/NPC', '/obj/NPC', '8 cast templates'],
  ['/lib/stuff/Vessel', '/obj/Vessel', 'bag-of-holding'],
  ['/lib/boundary/Exit', '/obj/Exit', 'archway, stair'],
  ['/lib/material/Material', '/obj/material/Material', '24 pack materials'],
  ['/lib/biome/Biome', '/obj/Biome', '3 pack biomes'],
  ['/lib/creature/Creature', '/obj/Corpse', 'the corpse is a game object, not a generic creature'],
];

/* ───────────────────────── the path axis ─────────────────────────
 * Template paths. Prefix-only: LEAF NAMES NEVER CHANGE, because
 * `TemplatePathPrefixes`-based lookups concatenate `${prefix}${key}`
 * and a changed leaf silently breaks them.
 *
 * Three families (material, species, biome) are content-structural
 * rather than class-structural — their folders are taxonomy, and their
 * leaves span several classes — so they keep their own tree, re-rooted
 * lowercase. That matches the /obj/ content roots that already exist
 * (`/obj/gear/`, `/obj/exits/`, `/obj/clothes/`, `/obj/arms/`), whose
 * backing classes likewise live elsewhere.
 */
const PATH_MOVES: ReadonlyArray<readonly [string, string, 'exact' | 'prefix']> = [
  // families named for their class
  ['/lib/messaging/Topic/', '/obj/Topic/', 'prefix'],
  ['/lib/advancement/Discipline/', '/obj/Discipline/', 'prefix'],
  ['/lib/persistence/QuantityMarshaller/', '/obj/persistence/QuantityMarshaller/', 'prefix'],
  ['/lib/locomotion/', '/obj/LocomotionMode/', 'prefix'],
  ['/lib/magic/Spell/', '/obj/magic/Spell/', 'prefix'],
  ['/lib/corpo/Brand/', '/obj/corpo/Brand/', 'prefix'],
  ['/lib/corpo/Corpo/', '/obj/corpo/Corpo/', 'prefix'],
  ['/lib/corpo/demo/', '/obj/corpo/demo/', 'prefix'],
  ['/lib/perception/modalities/', '/obj/modalities/', 'prefix'],
  ['/lib/combat/CombatFormation/', '/obj/CombatFormation/', 'prefix'],
  ['/lib/civics/Government/', '/obj/Government/', 'prefix'],
  ['/lib/body-plans/', '/obj/species/BodyPlan/', 'prefix'],

  // the five condition families collapse under one root
  ['/lib/metabolism/conditions/', '/obj/Condition/metabolism/', 'prefix'],
  ['/lib/thermal/conditions/', '/obj/Condition/thermal/', 'prefix'],
  ['/lib/magic/conditions/', '/obj/Condition/magic/', 'prefix'],
  ['/lib/mortality/conditions/', '/obj/Condition/mortality/', 'prefix'],
  ['/lib/respiration/conditions/', '/obj/Condition/respiration/', 'prefix'],

  // content-structural trees (pack-installed)
  ['/lib/material/', '/obj/material/', 'prefix'],
  ['/lib/biome/', '/obj/biome/', 'prefix'],
  ['/lib/biome', '/obj/biome', 'exact'],
  ['/lib/species/', '/obj/species/', 'prefix'],

  // the Locality family: /lib/address is BOTH a FolderZone row and the
  // parent of 12 leaves, so it needs both an exact and a prefix rule.
  // It must stay a folder row or the leaves violate the folder/leaf
  // invariant (TemplateApi.validateFolderLeafSave).
  ['/lib/address/', '/obj/Locality/', 'prefix'],
  ['/lib/address', '/obj/Locality', 'exact'],

  // singletons
  ['/lib/persistence/PersistentHydrator', '/obj/persistence/PersistentHydrator', 'exact'],
  ['/lib/persistence/EncryptedStringMarshaller', '/obj/persistence/EncryptedStringMarshaller', 'exact'],
  ['/lib/magic/SparkSource', '/obj/magic/SparkSource', 'exact'],
  ['/lib/magic/GlowlightOrb', '/obj/magic/GlowlightOrb', 'exact'],
  ['/lib/sandbox/CircleFloor', '/obj/sandbox/CircleFloor', 'exact'],
  ['/lib/zone/FolderZone', '/obj/FolderZone', 'exact'],
  ['/lib/mortality/corpse', '/obj/Corpse', 'exact'],
  ['/lib/lock/Key', '/obj/Key', 'exact'],
  ['/lib/banking/PaymentCard', '/obj/PaymentCard', 'exact'],
  ['/lib/augmentation/AetherImplant', '/obj/AetherImplant', 'exact'],
  ['/lib/comms/CommsUpdate', '/obj/CommsUpdate', 'exact'],
  ['/lib/forum/ForumsUpdate', '/obj/ForumsUpdate', 'exact'],
  ['/lib/credential/CredentialWalletUpdate', '/obj/CredentialWalletUpdate', 'exact'],

  // the lounge ownership root. There is no src/mud/lib/lounge/ directory
  // — the source-tree half of AccessRegistry.resolveSourceFolderZone's
  // mapping is already vestigial; the live half is the `parcels` title.
  ['/lib/lounge', '/obj/lounge', 'exact'],
];

export const MOVES: readonly MoveRule[] = [
  ...FILE_MOVES.map(
    ([from, to]) => ({ from, to, kind: 'exact', axis: 'file' }) as MoveRule
  ),
  ...CLASSREF_MOVES.map(
    ([from, to, note]) => ({ from, to, kind: 'exact', axis: 'classref', note }) as MoveRule
  ),
  ...PATH_MOVES.map(
    ([from, to, kind]) => ({ from, to, kind, axis: 'path' }) as MoveRule
  ),
];

/**
 * Rules sorted longest-`from`-first, exact before prefix at equal
 * length. Order is what makes `/lib/address` and `/lib/address/`
 * coexist, and what stops `/lib/magic/` swallowing
 * `/lib/magic/Spell/`.
 */
function orderedRules(axes?: readonly MoveAxis[]): readonly MoveRule[] {
  const pool = axes ? MOVES.filter((r) => axes.includes(r.axis)) : MOVES;
  return [...pool].sort((a, b) => {
    if (b.from.length !== a.from.length) return b.from.length - a.from.length;
    if (a.kind !== b.kind) return a.kind === 'exact' ? -1 : 1;
    return a.from.localeCompare(b.from);
  });
}

/**
 * Rewrite one whole string. Returns `null` when no rule applies — the
 * caller distinguishes "unchanged" from "changed to the same value".
 *
 * `axes` narrows which rules may fire, which is how a wave applies half
 * the table and how the classref axis is kept away from imports.
 */
export function rewrite(value: string, axes?: readonly MoveAxis[]): string | null {
  if (typeof value !== 'string' || !value.includes('/lib/')) return null;
  for (const rule of orderedRules(axes)) {
    if (rule.kind === 'exact') {
      if (value === rule.from) return rule.to;
    } else if (value.startsWith(rule.from)) {
      return rule.to + value.slice(rule.from.length);
    }
  }
  return null;
}

/**
 * Repo-relative file-path rules (NOT template paths): the seed tree and
 * the packs' content trees. Tests reference these by disk path.
 */
export const REPO_PATH_MOVES: ReadonlyArray<readonly [string, string]> = [
  ['content/lib/', 'content/obj/'],
];

/** Rewrite a repo-relative or absolute file path string. */
export function rewriteRepoPath(value: string): string | null {
  for (const [from, to] of REPO_PATH_MOVES) {
    if (value.includes(from)) return value.split(from).join(to);
  }
  return null;
}
