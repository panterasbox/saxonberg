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
export type MixinConstructor<T = object> = (new (...args: any[]) => T) | (abstract new (...args: any[]) => T);

/**
 * Mixin name constants.
 * Use these constants instead of string literals when checking for mixins.
 */
export const Mixins = {
  Named: 'NamedMixin',
  Gendered: 'GenderedMixin',
  Container: 'ContainerMixin',
  Containable: 'ContainableMixin',
  Surfaced: 'SurfacedMixin',
  Visible: 'VisibleMixin',
  Sensor: 'SensorMixin',
  Vocal: 'VocalMixin',
  Aether: 'AetherMixin',
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
  Radioactive: 'RadioactiveMixin',
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
  Engaged: 'EngagedMixin',
  Atmospheric: 'AtmosphericMixin',
  SkyExposed: 'SkyExposedMixin',
  Soul: 'SoulMixin',
  Contacts: 'ContactsMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
