/**
 * Marshaller — bridges a single field's runtime value-object shape
 * to its stored persistence shape.
 *
 * Saxonberg's persistence default is "scalars and arrays of scalars."
 * That covers almost every field — booleans, numbers, strings,
 * primitive tuples, keyword lists, templatePath strings for Stuff
 * cross-references. Mixins that carry richer runtime types decompose
 * them into named scalar fields and reconstruct on read (see e.g.
 * `AmbientLitMixin` storing `ambientIntensity` + `ambientColor`
 * separately, the getter rebuilding a `Light` instance).
 *
 * Marshallers are the **escape hatch** for the rare field whose
 * storage shape genuinely doesn't decompose into named scalars —
 * variable-key maps (`Record<currency, amount>`), structured
 * composites with internal substructure, future composite types we
 * can't anticipate. The Marshaller owns the raw↔runtime conversion
 * so the mixin's runtime setter stays strict on the value-object
 * type and never has to know the persistence shape exists.
 *
 * Idea-shaped (extends `Idea`, registered by templatePath via
 * `StuffApi.findByTemplatePath`) so content-author marshallers
 * participate in `HotReloadApi` and can be hot-swapped without
 * restarting the server. Stateless by contract — a marshaller's
 * `fromStored` / `toStored` are pure functions of their input.
 *
 * Shape mirrors `PersistentHydrator`: concrete subclasses set
 * `static templatePath = '/lib/persistence/...'`, get registered
 * via the standard Stuff lifecycle (clone or createSync depending
 * on context), and resolve via `StuffApi.findByTemplatePath` at the
 * use site.
 *
 * Wiring:
 *   - A mixin declares marshallers for its persistent fields via
 *     `static fieldMarshallers: Record<fieldName, marshallerTemplatePath>`.
 *   - `MixinApi.getAllFieldMarshallers(constructor)` walks the
 *     prototype chain collecting these maps (subclass-wins).
 *   - `PersistentHydrator.hydrate` and `Document.toDocument` /
 *     `Document.fromDocument` look up the marshaller for each
 *     field and apply `fromStored` / `toStored` around the
 *     bracket-assign / bracket-read.
 *
 * Seeding (production): a CMS template at the marshaller's
 * `templatePath` is the canonical bootstrap path, mirroring how
 * `PersistentHydrator` is itself templated. v1 ships no production
 * marshallers (the existing object-shaped Light fields flatten to
 * scalars instead); the seeding pattern lands when a real production
 * marshaller arrives.
 */

import { Idea } from '../stuff/Idea';

export abstract class Marshaller<TRuntime, TStored> extends Idea {
  /**
   * Convert raw stored persistence shape into a runtime value object.
   * Called by `PersistentHydrator.hydrate` and
   * `Document.fromDocument` before bracket-assigning into the
   * target — the strict mixin setter sees the runtime type, not
   * the raw shape.
   */
  public abstract fromStored(stored: TStored): TRuntime;

  /**
   * Convert a runtime value object into the stored persistence
   * shape. Called by `Document.toDocument` before writing into
   * the doc.
   */
  public abstract toStored(runtime: TRuntime): TStored;
}
