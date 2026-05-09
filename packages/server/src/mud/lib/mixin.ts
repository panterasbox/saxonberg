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
  Visible: 'VisibleMixin',
  Sensor: 'SensorMixin',
  Vocal: 'VocalMixin',
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
  Perception: 'PerceptionMixin',
  Tangible: 'TangibleMixin',
  Organism: 'OrganismMixin',
  Sexed: 'SexedMixin',
  Radioactive: 'RadioactiveMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
