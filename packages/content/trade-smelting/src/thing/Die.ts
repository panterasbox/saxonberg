/**
 * Die — ⭐ a striking die (ceramics S16): a hard block cut with a device,
 * that a blank laid on it and struck takes the shape of. `hammer <blank> on
 * <die>` — the smith's verb asks the anvil it was given whether it
 * `strikeWith`s (a structural probe), and this one does: the blow's force
 * against the blank's stiffness decides whether the device comes up.
 *
 * It is the smith's `anvil` (a `Tool` with that capability on its row) so
 * the hammer's binder takes it, and its function IS its shape — so a die
 * cast from an impression of a die strikes too (M9).
 *
 * The struck piece carries the die's PROVENANCE: whose die it was, recorded
 * as a cast records the thing it was taken from (`castFrom`), never judged.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

/** How far a blow drives the die home, m — the blow's energy over it is its force. */
const STROKE_M = 0.002;
/** The face a device is struck over, m² — a token's. */
const FACE_M2 = 1e-4;

/**
 * ⭐ A die affords the blow itself — `hammer <blank> on <die>`, and the
 * universal `impress die on <blank>`. Only the smith's ANVIL afforded
 * `hammer`, so a die standing in a foundry offered nothing and no token
 * could be struck there (the ceramics drive: "I don't understand
 * 'hammer'"). Smelting already depends on smithing, whose view it is.
 */
const STRIKING = ['trade/smithing/cmd/crafting/hammer.yaml', 'platform/cmd/crafting/impress.yaml'];

export default class Die extends ToolMixin(DurableMixin(CraftedMixin(Good))) {
  static commandContributions: CommandContributions = {
    environment: STRIKING,
    peers: STRIKING,
  };

  static fieldMeta: FieldMeta = {
    strikes: { persistent: true, authorable: true, ref: 'identity:kind' },
    markOf: { persistent: true, authorable: true },
  };

  /** The row a struck blank becomes — the die's shape (a token). */
  public strikes = '';
  /** Whose device the die was cut with — an identity path; `''` = its maker's. */
  public markOf = '';

  public getStrikes(): string {
    return this.strikes;
  }
  public setStrikes(value: string): void {
    this.strikes = typeof value === 'string' ? value.trim() : '';
  }

  /** Whose die this is — the device's owner, else its maker. */
  public markIdentity(): string {
    return this.markOf || this.getMaker();
  }

  /**
   * ⭐ A blank struck on this: the blow's force (its energy over the stroke)
   * against the blank's stiffness (its hardness over the face, eased as it
   * nears its melting point). Strong enough, the blank becomes the die's
   * shape, carrying whose die it was; too weak, the device barely shows.
   */
  public async strikeWith(blank: Stuff, blowJ: number, by: Stuff): Promise<ReturnType<typeof Mml.compose>> {
    const self = this as unknown as Stuff;
    if (!MixinApi.isTangible(blank) || this.strikes === '') {
      return Mml.compose`Nothing comes of it — ${Mml.thing(blank)} is no blank for this die.`;
    }
    const mat = blank.getMaterial();
    if (mat === null || !mat.hasTag('metal')) {
      return Mml.compose`${Mml.thing(blank)} is not metal; it only bruises.`;
    }
    const mp = mat.getMeltingPoint().rawValue();
    const t = MixinApi.isThermal(blank) ? blank.getTemperature().rawValue() : 0;
    const ease = mp > 0 && t > 0 ? Math.max(0.1, 1 - t / mp) : 1;
    const stiffN = mat.getHardness().rawValue() * 1e6 * FACE_M2 * ease;
    const forceN = blowJ / STROKE_M;
    if (forceN < stiffN) {
      return Mml.compose`The hammer rings off ${Mml.thing(blank)} and the device barely shows on it. It is too hard to strike cold — heat it, or strike harder.`;
    }
    let token: Stuff;
    try {
      token = await StuffApi.clone<Stuff>(this.strikes, undefined, { madeFrom: [blank] });
    } catch {
      return Mml.compose`Nothing comes of it.`;
    }
    const whose = this.markIdentity();
    if (MixinApi.isTangible(token)) {
      token.setMaterial(mat);
      token.setMass(Quantity.of(blank.getMass().rawValue(), 'kg'));
      token.setCastFrom({
        kindPath: this.strikes,
        takenFromIdentity: whose,
        takenAtS: WorldClockApi.getNow().rawValue(),
      });
    }
    const who = whose ? StuffApi.findByTemplatePath<Stuff>(whose)?.getPresentation() ?? '' : '';
    const t2 = token as unknown as { getLongDescription?(): string; setLongDescription?(s: string): void };
    t2.setLongDescription?.(
      `${t2.getLongDescription?.() ?? ''} Struck from ${who ? `${who}'s` : 'a'} die: the device stands up crisp on both faces.`.trim(),
    );
    const scope = MixinApi.isContainable(blank) ? blank.getContainer() : null;
    await StuffApi.destruct(blank);
    const into = scope !== null && MixinApi.isContainer(scope) ? scope : MixinApi.isContainer(by) ? by : null;
    if (into !== null && MixinApi.isContainable(token)) {
      ContainmentApi.move(token as Stuff & Containable, into as Stuff & Container);
    }
    await PersistableApi.captureHostOf(token).catch(() => undefined);
    if (MixinApi.isDurable(self)) (self as unknown as { wear(n?: number): void }).wear();
    return Mml.compose`The die bites. ${Mml.thing(token)} comes up off it with the device sharp on its face.`;
  }
}
