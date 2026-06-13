/**
 * Application-settings key registry.
 *
 * The central index of the *blessed* application-setting keys and their
 * seed defaults. Modeled on {@link ../paths.ts | `lib/paths.ts`}: a setting
 * key is *data* (a string into the open `values` bag of the `AppSettings`
 * singleton), so the TS-side index of those keys — and the one place each
 * default is written — belongs in a single module, not scattered as magic
 * strings across every consumer.
 *
 * This is **not** the persistence schema. `AppSettings` stores a single
 * open `Record<string,string>` bag; the verb can set any key. This registry
 * only indexes the keys the engine itself reads, so consumers reference a
 * constant (typo → compile error) and a shared default (e.g.
 * `defaultStartLocation`, read at every avatar-mint site) is written once.
 * Adding a knob = one entry here + the consumer that reads it; it never
 * touches the `AppSettings` Document's persisted shape.
 *
 * `lib/paths.ts`'s own docstring already defers spawn/evacuation
 * content-paths "to app config" — i.e. to this registry. Unlike
 * `lib/paths.ts` (cross-cutting infra at `lib/` root), this is one
 * subsystem's typed surface, so it lives in the subsystem dir.
 */

/** The blessed application-setting keys. Reference these, never a literal. */
export const AppSettingKeys = {
  /**
   * Where a brand-new avatar's `startLocation` is initialized at mint
   * time — the post-char-gen / guest / signup spawn default, and nothing
   * else. The per-avatar `Avatar.startLocation` field (durable spawn +
   * recall) takes its initial value from here.
   */
  defaultStartLocation: "defaultStartLocation",

  /**
   * Where an orphaned `HasInteractive` evacuates when its container
   * destructs with no outer (`Container.cleanupOnDestruct`). The void is
   * the designed target: a bootstrap-pinned singleton that refuses
   * destruct.
   */
  evacuationFallback: "evacuationFallback",
} as const;

export type AppSettingKey =
  (typeof AppSettingKeys)[keyof typeof AppSettingKeys];

/**
 * Seed defaults, keyed by the registry constants. The single place each
 * v1 default string is written. `AppSettings.loadOrSeed` copies this into
 * the bag on a fresh DB; `AppApi.setting` falls back to it for any key a
 * pre-existing row predates.
 */
export const AppSettingDefaults: Record<string, string> = {
  [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
  [AppSettingKeys.evacuationFallback]: "/domain/void",
};
