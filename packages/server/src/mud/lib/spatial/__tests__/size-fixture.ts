/**
 * The size fixture (size and carrying W1): the five forms resident at their
 * row paths, materials with a density (and a strength), things with a mass
 * and a form, containers with an authored box, and places whose exposure is
 * stated rather than built — so a test reads as the requirements' table.
 */
import { vi } from 'vitest';
import Form from '../../../platform/idea/Form';
import Material from '../../material/Material';
import Good from '../../stuff/Good';
import Location from '../../location/Location';
import { ContainerMixin } from '../Container';
import { SealableMixin } from '../Sealable';
import { PlacingMixin } from '../Placing';
import { Exposure, type ExposureTop } from '../Exposure';
import { Quantity } from '../../quantity';
import type { DimensionsSpec } from '../Dimensions';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

const FORMS: Record<string, { aspect: DimensionsSpec; rigid: boolean }> = {
  rod: { aspect: { width: 1, depth: 1, height: 20 }, rigid: true },
  sheet: { aspect: { width: 50, depth: 70, height: 1 }, rigid: true },
  block: { aspect: { width: 1, depth: 1.5, height: 2 }, rigid: true },
  round: { aspect: { width: 1, depth: 1, height: 1 }, rigid: true },
  flexible: { aspect: { width: 6, depth: 8, height: 1 }, rigid: false },
};

/** The five shipped forms, resident at `/platform/idea/Form/<name>`. */
export function installForms(): void {
  for (const [name, f] of Object.entries(FORMS)) {
    makeStuffAtPath(() => {
      const form = new Form();
      form.setName(name);
      form.setAspect(f.aspect);
      form.setRigid(f.rigid);
      return form;
    }, `/platform/idea/Form/${name}`);
  }
}

/** A material at `path` with a density (kg/m³) and, optionally, a strength (MPa). */
export function material(path: string, density: number, tensileMPa = 0): Material {
  const had = StuffApi.findAllByTemplatePath<Material>(path)[0];
  if (had) return had;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(density, 'kg/m³'));
    m.setTensileStrengthMPa(tensileMPa);
    return m;
  }, path);
}

/** A plain thing. */
export class Item extends Good {}
/** A rigid container with no lid (a bucket, a crate). */
export class OpenBox extends ContainerMixin(Good) {}
/** A rigid container with a lid (a chest). */
export class Chest extends SealableMixin(ContainerMixin(Good)) {}
/** A surface and a hook in one (a table; a rail). */
export class Surface extends PlacingMixin(Good) {}

/** Make a thing of `material`, `kg`, an optional form and an optional authored box. */
export function thing<T extends Good>(
  make: () => T,
  opts: { material?: Material; kg?: number; shape?: string; box?: DimensionsSpec },
): T {
  const t = makeStuff(make);
  if (opts.material) t.setMaterial(opts.material);
  if (opts.kg !== undefined) t.setMass(Quantity.of(opts.kg, 'kg'));
  if (opts.shape) (t as unknown as { _shape: string })._shape = opts.shape;
  if (opts.box) t.setDimensions(opts.box);
  return t;
}

/**
 * A cube place of side `extent`, its exposure stated: a top, and walls or
 * none (`openSides` for an open-fronted one).
 */
export function place(
  extent: number,
  top: ExposureTop,
  walls: 'walled' | 'none',
  openSides = 0,
): Location {
  const room = makeStuff(() => new Location());
  room.setExtent(extent);
  vi.spyOn(room, 'exposure').mockReturnValue(
    new Exposure({
      structure: null,
      storey: null,
      declared: true,
      top,
      roof: null,
      walls: [],
      wallsNone: walls === 'none',
      openSides,
      onGrade: true,
      floorIsRoofOf: null,
    }),
  );
  return room;
}
