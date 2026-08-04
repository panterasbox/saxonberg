/**
 * Shared infrastructure for the mixin suite.
 *
 * Scope: things genuinely global to the suite as a whole — the base
 * constructor type and the registry of mixin names. Individual mixin
 * interfaces (Named, Container, Visible, etc.) live with their mixin
 * module, not here.
 */

/**
 * Mixin constructor type.
 * A mixin is a function that takes a base class and returns an extended class.
 * Supports both concrete and abstract constructors.
 */
// `any[]` constructor args are intrinsic to the TS mixin pattern: a
// mixin extends an arbitrary base and forwards `super(...args)`, which
// `unknown[]`/`never[]` can't type. This is the canonical exception
// (see the TypeScript handbook's mixin section), so it's the one place
// the rule is deliberately suppressed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MixinConstructor<T = object> = (new (...args: any[]) => T) | (abstract new (...args: any[]) => T);

/**
 * What ONE field declares about itself.
 *
 * `static fieldMeta` inverts the old arrangement. Field metadata used to
 * live in four parallel statics — `persistentFields`, `fieldMarshallers`,
 * `instructionFields`, `globIdentityFields` — each keyed by field name,
 * so answering "what is true of this field?" meant consulting four
 * places and adding a fifth concern meant adding a fifth static. Here
 * each field is a key and everything about it is its value.
 *
 * Declared per class body and collected up the prototype chain by
 * {@link MixinApi.getAllFieldMeta}, own-property only, concrete class
 * first. **The merge is PROPERTY-level, not field-level**: a subclass
 * declaring `{ marshaller }` for a field its base declares
 * `{ persistent: true }` for gets both. Field-level shadowing would
 * silently drop the base's declaration — `Weapon`/`Tangible` `mass` is
 * the live case, and it would have stopped persisting.
 *
 * Lives here rather than in `api/` so 200+ `lib/` mixins can annotate a
 * static without importing out of the Api tier.
 */
export interface FieldMetaEntry {
  /** Round-trips through persistence. Was `static persistentFields`. */
  persistent?: true;
  /**
   * TemplatePath of the Marshaller that converts this field to and from
   * stored form. Was `static fieldMarshallers`.
   */
  marshaller?: string;
  /**
   * Applied by an `apply<Field>` method at hydrate Phase 2 rather than
   * assigned. Was `static instructionFields`.
   */
  instruction?: true;
  /**
   * Participates in glob stack identity — two globs merge only when
   * every such field is equal. Was `static globIdentityFields`.
   */
  globIdentity?: true;

  /**
   * **Axis 1** — what this field points at when it points at other
   * Stuff.
   *
   * `identity` stores a templatePath ("what kind of thing"), is
   * persistable, and re-resolves on read, so it cannot dangle.
   * `instance` stores a live ref ("this particular object") and is
   * never persistable, because `stuffId` does not survive a reboot.
   *
   * The discriminator is **the holder's meaning, not a property of the
   * target** — "the room I am in" is an instance ref even though rooms
   * have unique paths. That is why it is declared and not inferred.
   */
  ref?: 'identity' | 'instance';
  /**
   * **Axis 2** — what happens to the target when this holder destructs.
   * Instance refs only; an identity ref re-resolves and cannot dangle.
   *
   * Read-side self-heal is the DEFAULT for every single instance ref, so
   * this names only the *destruct-side* rule: `weak` means "none",
   * `symmetric` clears the named {@link inverse} on the other side, and
   * `owned` destructs the target.
   *
   * `owned` is the dangerous one — it means "this has no existence
   * without me", NOT "I hold it". `Container.contents` looks exactly
   * like the shipped `owned` exemplars and must never be declared one.
   */
  lifetime?: 'weak' | 'symmetric' | 'owned';
  /** The reciprocal field on the other side. Required for `symmetric`. */
  inverse?: string;

  /** Author-editable in the Studio. Was the `@authorable` TSDoc tag. */
  authorable?: true;
  /** Studio picker type for an authorable ref. Was `@authorable ref:<T>`. */
  authorPicker?: string;
  /**
   * Engine-written rather than author-editable. Was `@runtimeState`.
   * A **subset** of `persistent`, not a contradiction with it.
   */
  runtimeState?: true;

  /**
   * **Reveal level of this field's VALUE wherever it surfaces.**
   *
   * A derived panel emits live field values, and some of those are
   * spoilers — a species' resistances, a hazard's trigger, a creature's
   * weakness. Authored prose carries page defaults and inline tags;
   * derived fields carry nothing, so without this a composition panel
   * is a hole straight through the reveal model.
   *
   * ⭐ **Declared on the field, not in the component**, because the
   * same field is a spoiler *wherever* it surfaces — a wiki panel, the
   * Studio, help, a future codex. A policy table owned by the wiki
   * would be wrong the moment anything else rendered the same value.
   *
   * ⚠ **Absent means level 0 — OPEN.** This is a reveal system
   * defaulting to reveal, so the reasoning is worth stating: the
   * alternative empties every panel until several hundred mundane
   * fields are tagged, and trains authors to tag reflexively rather
   * than thoughtfully. Density and hardness are not spoilers; a
   * species' resistances are.
   *
   * The cost is real and is not being papered over — a newly-added
   * spoilery field is visible until somebody tags it. It is covered
   * the way the sandbox boundary exemptions are: **by enumeration, not
   * inference.** A snapshot test lists every field a panel can surface
   * with its level, so introducing a spoiler without a tag shows up as
   * a diff in review rather than as a leak in production.
   */
  spoiler?: 0 | 1 | 2 | 3;

  /**
   * **Reveal level of this field's NAME** — the level at which a
   * reader learns the field *exists at all*. Defaults to
   * {@link spoiler}, which is the whole-row behaviour: on a creature
   * whose `fireVulnerability` is a spoiler, knowing it HAS one is most
   * of the information, so name and value hide together.
   *
   * ⭐ Declare it lower than `spoiler` where **the existence is schema
   * and only the measurement is content**. "This material has a
   * density" is not a secret — it is what `help` and the generated API
   * docs publish. `750 kg/m³` is the thing worth working for. So
   * `Material`'s measured properties carry `spoilerName: 0` beside
   * `spoiler: 1`, and a reader sees the property list with the numbers
   * collapsed rather than a table of blanks.
   *
   * ⚠ Splitting them is **opting into a redaction marker**, which the
   * reveal model refuses everywhere else. That is coherent only
   * because the marker reveals nothing here: the name was already
   * public. Do not split a field whose existence is the reveal — the
   * empty cell would announce exactly what the level was protecting.
   */
  spoilerName?: 0 | 1 | 2 | 3;
}

/** One class body's field declarations, keyed by instance field name. */
export type FieldMeta = Record<string, FieldMetaEntry>;

/**
 * Mixin name constants.
 * Use these constants instead of string literals when checking for mixins.
 */
export const Mixins = {
  Named: 'NamedMixin',
  Gendered: 'GenderedMixin',
  Persona: 'PersonaMixin',
  Advancement: 'AdvancementMixin',
  Container: 'ContainerMixin',
  Containable: 'ContainableMixin',
  Surfaced: 'SurfacedMixin',
  Visible: 'VisibleMixin',
  Sensor: 'SensorMixin',
  Vocal: 'VocalMixin',
  Aether: 'AetherMixin',
  AetherHosted: 'AetherHostedMixin',
  Comms: 'CommsMixin',
  Forums: 'ForumsMixin',
  Perceptible: 'PerceptibleMixin',
  // Presence-concealment — "how hard is it to notice this is here?". One
  // level on every loose perceivable (Thing/Creature/Exit); subsumes the
  // old Exit.hidden boolean. Read by the detection gate (PerceptionApi).
  Concealable: 'ConcealableMixin',
  // The actor-side of concealment — a Character's dynamic `hide` state,
  // overriding getConcealment() with a derived level while hidden. Composed
  // outside Creature's ConcealableMixin. See lib/concealment/Hiding.
  Hiding: 'HidingMixin',
  // A self-resolving trap/hazard — state + delivery + its own resolution,
  // sprung at the traverse (Mobile) or an interact (OpenController). No Api.
  Hazard: 'HazardMixin',
  Detailed: 'DetailedMixin',
  Propertied: 'PropertiedMixin',
  CommandGiver: 'CommandGiverMixin',
  Focused: 'FocusedMixin',
  Mobile: 'MobileMixin',
  CartesianCoordinates: 'CartesianCoordinatesMixin',
  SphericalCoordinates: 'SphericalCoordinatesMixin',
  Exitable: 'ExitableMixin',
  Sealable: 'SealableMixin',
  // Binary on/off — a lamppost, a beacon, a machine.
  Switchable: 'SwitchableMixin',
  // Binary locked/unlocked — composed onto Door beneath Sealable.
  Lockable: 'LockableMixin',
  // Binary folded/unfolded — a folding chair refuses its posture slots.
  Foldable: 'FoldableMixin',
  // Displays game-time — a pocket watch, a clock tower, a sundial.
  Timekeeping: 'TimekeepingMixin',
  // The windable/drifting clockwork inside a mechanical timepiece.
  MechanicalMovement: 'MechanicalMovementMixin',
  AroundSaveHook: 'AroundSaveHookMixin',
  AroundDeleteHook: 'AroundDeleteHookMixin',
  PostRegistration: 'PostRegistrationMixin',
  HasInteractive: 'HasInteractiveMixin',
  Environment: 'EnvironmentMixin',
  Alias: 'AliasMixin',
  Singleton: 'SingletonMixin',
  DoorBearing: 'DoorBearingMixin',
  Adornable: 'AdornableMixin',
  Adornment: 'AdornmentMixin',
  AmbientLit: 'AmbientLitMixin',
  LightSource: 'LightSourceMixin',
  SmellSource: 'SmellSourceMixin',
  SoundSource: 'SoundSourceMixin',
  // Discrete-event sound push — a whistle, a bell, an alarm, a chime.
  Audible: 'AudibleMixin',
  Augment: 'AugmentMixin',
  Perception: 'PerceptionMixin',
  Tangible: 'TangibleMixin',
  Organism: 'OrganismMixin',
  Sexed: 'SexedMixin',
  Vitals: 'VitalsMixin',
  // What a body does after it stops: the decay clock, the forensic
  // readability curve, and the eviction veto that keeps a corpse in the
  // world long enough to be studied.
  Postmortem: 'PostmortemMixin',
  // Present, but unable to touch anything — the capability half of
  // function-over-form. Platform verbs ride the participant; embodied
  // verbs are refused by the `requiresEmbodied` validator.
  Incorporeal: 'IncorporealMixin',
  // First-aid dressing capability — any item that can dress a wound
  // (bandage / gauze / clean rag). The harm build's medic vertical.
  Dressing: 'DressingMixin',
  Reserved: 'ReservedMixin',
  Radioactive: 'RadioactiveMixin',
  // The form axis — a material worked into a Construction (materials-
  // response). Composed by armor (resist profile) and weapons (delivery).
  Constructed: 'ConstructedMixin',
  Branded: 'BrandedMixin',
  // Chattel — a movable good's durable per-instance identity, the key its
  // unspoofable ownership is stamped against (the parcel-title twin).
  // Composed at the Thing tier; refused on fungible stacks (Globbable).
  Chattel: 'ChattelMixin',
  // Estate — owner-based persistence: the goods a principal holds title to,
  // wherever they sit. The counterpart to the Container slice's skip rule.
  Estate: 'EstateMixin',
  // Commerce — the shared authored price-list (Law 1: worth on the offer,
  // not the good). Composed by the bar's Menu and the store's Stock.
  PricedOffer: 'PricedOfferMixin',
  // Residency — the game-time reset (repop) sweep's consumer marker: an
  // object that restores itself on the sweep (the shop's Stock tops up).
  Resettable: 'ResettableMixin',
  // Consignment — the store's brokerage shelf: holds player-owned goods in
  // custody (ownership stays with the consignor) + the listing registry.
  ConsignmentShelf: 'ConsignmentShelfMixin',
  Workspace: 'WorkspaceMixin',
  Author: 'AuthorMixin',
  Perceiver: 'PerceiverMixin',
  Scryable: 'ScryableMixin',
  Slotted: 'SlottedMixin',
  Slottable: 'SlottableMixin',
  Wearable: 'WearableMixin',
  Wieldable: 'WieldableMixin',
  Postured: 'PosturedMixin',
  Posed: 'PosedMixin',
  Mountable: 'MountableMixin',
  Drivable: 'DrivableMixin',
  Climbable: 'ClimbableMixin',
  Swimmable: 'SwimmableMixin',
  Flyable: 'FlyableMixin',
  Spawner: 'SpawnerMixin',
  Spawned: 'SpawnedMixin',
  Populates: 'PopulatesMixin',
  Persistable: 'PersistableMixin',
  Forkable: 'ForkableMixin',
  Globbable: 'GlobbableMixin',
  Bulkable: 'BulkableMixin',
  UnboundedSource: 'UnboundedSourceMixin',
  Engaged: 'EngagedMixin',
  Atmospheric: 'AtmosphericMixin',
  Addressable: 'AddressableMixin',
  SkyExposed: 'SkyExposedMixin',
  Soul: 'SoulMixin',
  Contacts: 'ContactsMixin',
  NotifyPolicy: 'NotifyPolicyMixin',
  SubjectSubscriber: 'SubjectSubscriberMixin',
  WarrenMember: 'WarrenMemberMixin',
  Lounge: 'LoungeMixin',
  FastTravel: 'FastTravelMixin',
  Fixture: 'FixtureMixin',
  LoadBearing: 'LoadBearingMixin',
  BeliefStore: 'BeliefStoreMixin',
  Disguisable: 'DisguisableMixin',
  DisguiseBearing: 'DisguiseBearingMixin',
  Status: 'StatusMixin',
  Identifiable: 'IdentifiableMixin',
  Metabolic: 'MetabolicMixin',
  NutritionLabel: 'NutritionLabelMixin',
  Thermal: 'ThermalMixin',
  ThermalRegulation: 'ThermalRegulationMixin',
  Respiration: 'RespirationMixin',
  // The cross-cutting wetness gauge — any Thing / body can be wet.
  Wet: 'WetMixin',
  // The living-world growth model — a cultivated thing that grows.
  Growing: 'GrowingMixin',
  // Ground that holds plants: soil + N plant slots. A pot is this at N = 1;
  // a garden bed is the same surface with a bigger N.
  Cultivable: 'CultivableMixin',
  Behaved: 'BehavedMixin',
  Graded: 'GradedMixin',
  // A physical thing that wears out with use (the condition/wear gauge).
  // Composed by tools, weapons, and armor alike — durability is not "tool".
  Durable: 'DurableMixin',
  // The working-surface (edge) wear axis — Durable's fast-cycling sibling.
  Keen: 'KeenMixin',
  Tool: 'ToolMixin',
  Crafted: 'CraftedMixin',
  Maker: 'MakerMixin',
  ManualBuild: 'ManualBuildMixin',
  Bank: 'BankMixin',
  // The unified credential holder — one keyed store of credentials-as-data,
  // composed on the born-with wallet app and on the physical cards.
  CredentialWallet: 'CredentialWalletMixin',
  // Haulage — a dragged container (cart) and the creature that pulls it.
  Haulable: 'HaulableMixin',
  Hauler: 'HaulerMixin',
  // Employment — the standalone Business entity and an actor's employment
  // relationships (an on-shift Position confers its duties via augments).
  Business: 'BusinessMixin',
  Employed: 'EmployedMixin',
  // Attendant — the universal storefront-attention substrate: a service-point
  // fixture holding the queue + being-attended leases (a server's attention).
  Attendant: 'AttendantMixin',
  // Combat — "I can fight": combat verb affordances + the innate-attack
  // hook. All fight state is session-scoped, never on the Creature.
  Combatant: 'CombatantMixin',
  // Combat-reactive — the instrument dynamics seam: the marker the combat
  // engine scans for, whose hooks fire at fixed beat-lifecycle points.
  CombatReactive: 'CombatReactiveMixin',
  // Party — "I can belong to a party": the sparse active-party pointer on
  // Avatars + the hireable Mercenary NPC. Combat's friend/foe seam reads it.
  PartyMember: 'PartyMemberMixin',
  // Electricity — "I am a source held at a potential": a live wire, a stun
  // baton, the deferred wall socket / Lightning bolt. Read by the
  // conduction walk (ElectricityApi) to impose a potential difference.
  Energized: 'EnergizedMixin',
  // Fire — "I can burn": flammable matter carrying a fuel reserve + a
  // Burning active state, driven past its (wetness-adjusted) ignition point
  // by the combustion driver (FireApi). Reads its material's
  // autoignitionTemperature / heatOfCombustion.
  Combustible: 'CombustibleMixin',
  // Phase change — "I can melt": a solid whose material melts past its
  // meltingPoint (a latent-heat plateau), flowing to a Bulkable liquid.
  // Driven by heat (ThermalApi.reconcilePhase), not fire-specific.
  Meltable: 'MeltableMixin',
  // Furnace — a Combustible-fuelled sustained heat source (forge/kiln/oven/
  // campfire): pinned hot while lit + fuelled, bellows-boosted, heats the
  // Meltables in its scope. Generalizes the Campfire pin.
  Furnace: 'FurnaceMixin',
  // Magic — the anatomical casting faculty (mana reserve + serenity
  // recovery + composure read + overchannel strain). Composed on
  // Character, gated: active only when the Species intrinsically confers
  // it (innateMixins) or an augment does. See docs/subsystems/magic.md.
  Caster: 'CasterMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
