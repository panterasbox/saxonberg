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
  // First-aid dressing capability — any item that can dress a wound
  // (bandage / gauze / clean rag). The harm build's medic vertical.
  Dressing: 'DressingMixin',
  Reserved: 'ReservedMixin',
  Radioactive: 'RadioactiveMixin',
  // The form axis — a material worked into a Construction (materials-
  // response). Composed by armor (resist profile) and weapons (delivery).
  Constructed: 'ConstructedMixin',
  Branded: 'BrandedMixin',
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
  Behaved: 'BehavedMixin',
  Graded: 'GradedMixin',
  // A physical thing that wears out with use (the condition/wear gauge).
  // Composed by tools, weapons, and armor alike — durability is not "tool".
  Durable: 'DurableMixin',
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
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
