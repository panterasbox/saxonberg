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
  Tab: 'TabMixin',
  // Haulage — a dragged container (cart) and the creature that pulls it.
  Haulable: 'HaulableMixin',
  Hauler: 'HaulerMixin',
  // Employment — the standalone Business entity and an actor's employment
  // relationships (an on-shift Position confers its duties via augments).
  Business: 'BusinessMixin',
  Employed: 'EmployedMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
