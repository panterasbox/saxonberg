/**
 * AirPump — ⭐⭐ **the pump that keeps a hard-hat diver alive** (underwater
 * C3, D27): a two-handled force pump on the quay, its hose running down
 * to a diver's helmet. Each spell at the handles sends a minute's air
 * down the hose; stop pumping and the helmet's air runs out in a minute,
 * and the diver is on the supply crisis with no warning but their own
 * breath — and two tugs on the line.
 *
 * It speaks the kernel's `Pumpable` protocol, so the verb is the same
 * `pump` that works a village well, and a hired pump hand works it with
 * the same verb (the `cranks` brain).
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type {
  Pumpable,
  PumpPrognosis,
  PumpResult,
} from '@saxonberg/server/mud/lib/pump/Pumpable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Lifeline from './Lifeline';

/** What the helmet a hose feeds looks like to the pump. */
interface Helmet {
  diver: Stuff;
  helmet: Stuff;
}

export default class AirPump extends Tool implements Pumpable {
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/device/pump.yaml'],
    environment: ['platform/cmd/device/pump.yaml'],
  };

  static fieldMeta: FieldMeta = {
    litresPerSpell: { persistent: true, authorable: true },
    spellSeconds: { persistent: true, authorable: true },
  };

  /** Air sent down the hose per spell at the handles, litres. */
  public litresPerSpell = 30;

  /** How long a spell at the handles takes, game-seconds. */
  public spellSeconds = 20;

  /** The hose a diver is on, in this place, and the helmet it feeds. */
  private helmetOnHose(): Helmet | null {
    const self = this as unknown as Stuff;
    const here = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (here === null || !MixinApi.isContainer(here)) return null;
    const hoses: Lifeline[] = [];
    for (const c of here.getContents()) {
      if (c instanceof Lifeline && c.getKind() === 'hose') hoses.push(c);
      if (MixinApi.isContainer(c)) {
        for (const held of c.getContents()) {
          if (held instanceof Lifeline && held.getKind() === 'hose') hoses.push(held);
        }
      }
    }
    for (const hose of hoses) {
      const diver = hose.getOnEnd();
      if (diver === null || !MixinApi.isSlotted(diver)) continue;
      for (const [, occupants] of diver.getAllOccupants()) {
        for (const occ of occupants) {
          const s = occ as unknown as Stuff;
          if (!MixinApi.isBulkable(s)) continue;
          if (s.getBulkMaterial('interior')?.getName() !== 'air') continue;
          return { diver, helmet: s };
        }
      }
    }
    return null;
  }

  public async planPump(by: Stuff): Promise<PumpPrognosis> {
    void by;
    const fed = this.helmetOnHose();
    if (fed === null) {
      return {
        kind: 'refusal',
        reason: 'no-diver-on-hose',
        prose: Mml.compose`The pump wheezes. There is nobody on the end of the hose to send air to.`,
      };
    }
    return {
      kind: 'plan',
      durationMs: this.spellSeconds * 1000,
      effortW: 250,
      beginSelf: Mml.compose`You throw your weight on the pump handles, up and down, steady.`,
      beginPeers: Mml.compose`The pump on the quay clanks and sighs.`,
      token: fed,
    };
  }

  public async completePump(by: Stuff, token: unknown): Promise<PumpResult> {
    void by;
    const fed = (token as Helmet | null) ?? this.helmetOnHose();
    if (fed === null || fed.helmet.isDestroyed() || !MixinApi.isBulkable(fed.helmet)) {
      return { self: Mml.compose`The hose goes slack; the air goes nowhere.`, litres: 0 };
    }
    const helmet = fed.helmet;
    const cap = helmet.getBulkCapacity('interior')?.rawValue() ?? this.litresPerSpell;
    const now = helmet.getBulkAmount('interior').rawValue();
    const next = Math.min(cap, now + this.litresPerSpell);
    helmet.setBulkAmount('interior', Quantity.of(next, 'L'));
    return {
      self: Mml.compose`Air goes down the hose with every stroke.`,
      peers: null,
      litres: next - now,
    };
  }
}
