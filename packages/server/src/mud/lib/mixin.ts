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
  Reserved: 'ReservedMixin',
  Radioactive: 'RadioactiveMixin',
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
  Globbable: 'GlobbableMixin',
  Bulkable: 'BulkableMixin',
  UnboundedSource: 'UnboundedSourceMixin',
  Engaged: 'EngagedMixin',
  Atmospheric: 'AtmosphericMixin',
  Addressable: 'AddressableMixin',
  SkyExposed: 'SkyExposedMixin',
  Soul: 'SoulMixin',
  Contacts: 'ContactsMixin',
  SubjectSubscriber: 'SubjectSubscriberMixin',
  WarrenMember: 'WarrenMemberMixin',
  Lounge: 'LoungeMixin',
  FastTravel: 'FastTravelMixin',
  TravelCredential: 'TravelCredentialMixin',
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
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
