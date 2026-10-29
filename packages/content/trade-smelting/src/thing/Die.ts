/**
 * Die — ⭐ a striking die (ceramics S16): a hard block cut with a device,
 * that a blank laid on it and struck takes the shape of. `hammer <blank> on
 * <die>` — the smith's verb asks the anvil it was given whether it is a
 * striking die (the kernel's `StrikingDieMixin`), and this one is: the
 * blow's force against the blank's stiffness decides whether the device
 * comes up.
 *
 * It is the smith's `anvil` (a `Tool` with that capability on its row) so
 * the hammer's binder takes it, and its function IS its shape — so a die
 * cast from an impression of a die strikes too (M9).
 *
 * The struck piece carries the die's PROVENANCE: whose die it was — the
 * device it bears (`MarkedMixin`), recorded and never judged.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { StrikingDieMixin } from '@saxonberg/server/mud/lib/craft/StrikingDie';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

/** How far a blow drives the die home, m — the blow's energy over it is its force. */
const STROKE_M = 0.002;
/** The face a device is struck over, m² — a token's. */
const FACE_M2 = 1e-4;

/**
 * ⭐ A die affords the blow itself — `hammer <blank> on <die>`. Only the
 * smith's ANVIL afforded `hammer`, so a die standing in a foundry offered
 * nothing and no token could be struck there (the ceramics drive: "I don't
 * understand 'hammer'"). Smelting already depends on smithing, whose view
 * it is. And `impress`: its face bears a device (`MarkedMixin`), so pressed
 * into leather-hard clay it leaves its mark as a stamp does. ⚠ That is not
 * a strike — a strike needs the hammer's blow energy, which `impress` does
 * not carry, so a blank is struck only by `hammer`.
 */
const STRIKING = ['trade/smithing/cmd/crafting/hammer.yaml', 'platform/cmd/crafting/impress.yaml'];

export default class Die extends StrikingDieMixin(MarkedMixin(ToolMixin(DurableMixin(CraftedMixin(Good))))) {
  static commandContributions: CommandContributions = {
    environment: STRIKING,
    peers: STRIKING,
  };

  static fieldMeta: FieldMeta = {
    strikes: { persistent: true, authorable: true, ref: 'identity:kind' },
  };

  /** The row a struck blank becomes — the die's shape (a token). */
  public strikes = '';
  /** The device is cut into the face — felt as well as seen. */
  public override markForm = 'embossed';

  public getStrikes(): string {
    return this.strikes;
  }
  public setStrikes(value: string): void {
    this.strikes = typeof value === 'string' ? value.trim() : '';
  }

  /** ⭐ Whose device the face is cut with — authored, else whoever cut it. */
  public override getMarkDevice(): string {
    return super.getMarkDevice() || this.getMaker();
  }

  /**
   * ⭐ A blank struck on this: the blow's force (its energy over the stroke)
   * against the blank's stiffness (its hardness over the face, eased as it
   * nears its melting point). Strong enough, the blank becomes the die's
   * shape, carrying whose die it was; too weak, the device barely shows.
   */
  public override async strikeWith(blank: Stuff, blowJ: number, by: Stuff): Promise<Mml> {
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
    const token = await StuffApi.clone<Stuff>(this.strikes, undefined, { madeFrom: [blank] });
    if (MixinApi.isTangible(token)) {
      token.setMaterial(mat);
      token.setMass(Quantity.of(blank.getMass().rawValue(), 'kg'));
    }
    // ⚠ No cast record: a struck token is not cast, and whose device it
    // bears is the mark's (`takeDeviceFrom`, B84) — the one record (B95).
    // ⭐ The die's device is pressed into the token: it BEARS the mark
    // (`MarkedMixin`), and its look says whose — never written into its prose.
    if (MixinApi.isMarked(token)) token.takeDeviceFrom(this);
    const scope = MixinApi.isContainable(blank) ? blank.getContainer() : null;
    await StuffApi.destruct(blank);
    const into = scope !== null && MixinApi.isContainer(scope) ? scope : MixinApi.isContainer(by) ? by : null;
    if (into !== null && MixinApi.isContainable(token)) {
      ContainmentApi.move(token as Stuff & Containable, into as Stuff & Container);
    }
    await PersistableApi.captureHostOf(token);
    if (MixinApi.isDurable(self)) self.wear();
    return Mml.compose`The die bites. ${Mml.thing(token)} comes up off it with the device sharp on its face.`;
  }
}
