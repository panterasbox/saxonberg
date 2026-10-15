/**
 * SiteMixin — what STANDS with a place: the non-contained singletons that
 * load when the place loads.
 *
 * ## ⭐⭐ Load on use, by reference
 *
 * Content loads when a player's act forces it, by following AUTHORED
 * references from what is already loaded — never by searching the
 * template table, and never at boot unless the reason is written down
 * (the scan sweep, 2026-10-14). A room already names what loads with it
 * through `props:` and `cast:` ({@link StagedMixin}); those are things the
 * room CONTAINS. What was missing is the same for things that are not
 * contained: a business, a structure, an institution, a fixture that
 * seats itself. Before this, every one of them was BOOTED so that a
 * synchronous reader could find it live — 128 boot entries, most of them
 * for exactly that reason.
 *
 * So a place names them, in one list:
 *
 * ```yaml
 * stands:
 *   - /world/terminus/hearthworks/idea/business
 * ```
 *
 * and loading the place stands them up. The author puts the entry where
 * the relation belongs — a shop room names its house, a district zone
 * names its tower, a suburb's zone names its plat book.
 *
 * ## Why one list on any place
 *
 * It generalises the maritime fix's `structures:` on `SpatialZone`, which
 * was the first of these and named only one kind. One field, not a field
 * per kind: the applier does not care what stands, only that it does.
 * Composed on `Location` (every room rung) and `SpatialZone` (every
 * region in space) — not on `Zone`, because a `FolderZone` or a `Clade`
 * is not a place, and not on `StagedMixin`, because a chest composes that
 * and nothing stands with a chest.
 *
 * ⭐ No host guard and no `onCreate`: the applier is host-agnostic and a
 * blank list costs nothing.
 *
 * ## Kicked, never awaited
 *
 * {@link Site.applyStands} starts each load and returns. A ship standing
 * up reaches back for the sea it sails on, and a sea that awaited its
 * ships inside its own load would wait on itself (the maritime back-edge).
 * A caller that must have them awaits {@link Site.standsLoaded}; a
 * synchronous reader sees whichever are up through {@link Site.standing}.
 *
 * Nothing here is persisted: the list is authored and comes back with the
 * row (scan-sweep requirements § 7).
 */
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';
import { StuffApi } from '../../api/stuff';

/** Public shape provided by SiteMixin. */
export interface Site {
  /**
   * @hook Invoked by the `TemplateApplier`'s Phase-2 instruction dispatch
   *   from a template's `stands` field. Records the paths and KICKS a
   *   `StuffApi.singleton` per path without awaiting; a path that will not
   *   stand up warns and the rest still load.
   */
  applyStands(paths: string[] | null): Promise<void>;
  /** Resolves once every path this place names has been stood up (or failed). */
  standsLoaded(): Promise<void>;
  /** The named singletons that are standing now — a synchronous, live read. */
  standing(): Stuff[];
  /** The authored paths, whether or not they are standing. */
  standsPaths(): readonly string[];
}

export function SiteMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SiteMixin extends Base implements Site {
    static _mixinName: string = 'SiteMixin';

    static fieldMeta: FieldMeta = {
      stands: { instruction: true, authorable: true, inherit: 'by-entry' },
    };

    private _standsPaths: string[] = [];
    private _standsLoading: Promise<void> | null = null;

    public async applyStands(paths: string[] | null): Promise<void> {
      this._standsPaths = Array.isArray(paths)
        ? paths.map((p) => String(p))
        : [];
      const self = (this as unknown as Stuff).getTemplatePath() ?? '?';
      this._standsLoading = Promise.all(
        this._standsPaths.map((p) =>
          StuffApi.singleton<Stuff>(p).catch((err: unknown) => {
            console.warn(
              `SiteMixin: '${self}' names '${p}' in stands:, which did not stand up:`,
              err,
            );
            return null;
          }),
        ),
      ).then(() => undefined);
    }

    public standsLoaded(): Promise<void> {
      return this._standsLoading ?? Promise.resolve();
    }

    public standing(): Stuff[] {
      const out: Stuff[] = [];
      for (const p of this._standsPaths) {
        const s = StuffApi.findByTemplatePath<Stuff>(p);
        if (s && !s.isDestroyed()) out.push(s);
      }
      return out;
    }

    public standsPaths(): readonly string[] {
      return this._standsPaths;
    }
  };
}
