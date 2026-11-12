/**
 * DyestuffCatalogue — the singleton that serves the `dyestuff` documents
 * (madder, weld, woad, kermes; a chemical-industry pack's synthetic
 * alizarin), any pack's `content/dyestuffs/`. What a dyestuff IS:
 * `src/lib/Dyestuff.ts`.
 *
 * ⭐ A dyestuff is FOUND by the material it dyes with — the kind's card
 * key `material` (load-on-use D6) — so a bath of madder finds madder's
 * document with no kernel field on `Material` and no roster warm: `dye`
 * asks {@link forMaterial} and the hit is kept. Nothing boots it.
 */

import { DocumentCatalogue } from '@saxonberg/server/mud/lib/document/DocumentCatalogue';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import type { BoundaryRole } from '@saxonberg/server/mud/lib/security/BoundaryRole';
import Dyestuff, { type DyeChemistry, type ShadeAvatar } from '../lib/Dyestuff';

export default class DyestuffCatalogue extends DocumentCatalogue<Dyestuff> {
  /** A reference catalogue everyone reads — `dye` inside a circle (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'dyestuff';

  /** Validate a dyestuff document at `path`; throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): Dyestuff {
    const why = (r: string): never => {
      throw new Error(`dyestuff '${path}': ${r}`);
    };
    const material = typeof data.material === 'string' ? data.material : '';
    if (!material.startsWith('/')) why(`material '${material}' is not a material path`);
    const chemistry = data.chemistry as DyeChemistry;
    if (chemistry !== 'mordant' && chemistry !== 'vat') {
      why(`chemistry '${String(chemistry)}' is not 'mordant' | 'vat'`);
    }
    if (!Array.isArray(data.shades)) why('shades must be a list');
    const shades: ShadeAvatar[] = [];
    for (const s of data.shades as Array<Partial<ShadeAvatar>>) {
      if (!Number.isFinite(s?.fastness) || s.fastness! < 0 || s.fastness! > 1) {
        why(`fastness ${String(s?.fastness)} is outside 0..1`);
      }
      // ⚠ REQUIRED: a dye with no position cannot be mixed, and would
      // fail silently — the cloth simply comes out uncoloured.
      for (const k of ['transmitR', 'transmitG', 'transmitB'] as const) {
        const v = s?.[k];
        if (!Number.isFinite(v) || v! < 0 || v! > 1) {
          why(`${k} ${String(v)} is outside 0..1 (mordant '${String(s?.mordant)}')`);
        }
      }
      shades.push({
        mordant: String(s.mordant ?? ''),
        colour: String(s.colour ?? ''),
        fastness: s.fastness!,
        transmitR: s.transmitR!,
        transmitG: s.transmitG!,
        transmitB: s.transmitB!,
      });
    }
    return new Dyestuff(path, material, chemistry, shades);
  }

  /**
   * ⭐ The dyestuff whose bath is `material` — resident first, else the
   * store's card (`material`), kept. `null` when nothing dyes with it.
   */
  public async forMaterial(material: string): Promise<Dyestuff | null> {
    const resident = this.resident().find((d) => d.getMaterialPath() === material);
    if (resident) return resident;
    const [doc] = await DocumentApi.findByKey('dyestuff', 'material', { eq: material, limit: 1 });
    return doc ? this.ensure(doc.getPath()) : null;
  }
}
