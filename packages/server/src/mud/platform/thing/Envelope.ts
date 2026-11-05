/**
 * Envelope — a paper sleeve a letter goes in, gummed or waxed shut.
 *
 * ⭐ A closed envelope keeps its letter: nothing goes in or comes out of it
 * shut, so the only way to the letter is to OPEN it — and opening a sealed
 * envelope breaks the seal, which anyone who looks at it afterwards sees.
 * Tearing it open spills the letter and is not quiet about it either.
 * Paper: it burns and pulps.
 */

import Good from '../../lib/stuff/Good';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { ReservedMixin } from '../../lib/reserve';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { TearableMixin, type TearOutcome } from '../../lib/material/Tearable';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { VetoResult } from '../../lib/errors';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';

const EnvelopeBase = TearableMixin(
  SealableMixin(CombustibleMixin(ThermalMixin(ReservedMixin(ContainerMixin(Good))))),
);

export default class Envelope extends EnvelopeBase {
  /** ⭐ `seal` is the envelope's own verb — and `open`/`close` ride the boundary views. */
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['platform/cmd/inventory/seal.yaml'],
    environment: ['platform/cmd/inventory/seal.yaml'],
    peers: ['platform/cmd/inventory/seal.yaml'],
  };

  /** Shut, it keeps its letter. */
  public canAddContainable(_thing: Stuff & Containable): VetoResult {
    return this.isOpen() ? { ok: true } : { ok: false, reason: 'The envelope is closed.' };
  }

  public canRemoveContainable(_thing: Stuff & Containable): VetoResult {
    return this.isOpen() ? { ok: true } : { ok: false, reason: 'The envelope is closed.' };
  }

  /** Torn open: the letter falls out where it is, and the envelope is gone. */
  public override async tear(_by: Stuff, _page?: number): Promise<TearOutcome> {
    const self = this as unknown as Stuff;
    const where = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (this.getSeal() !== '') this.sealBroken = true;
    this.setOpen(true);
    const spilled: Stuff[] = [];
    for (const c of [...this.getContents()]) {
      if (where !== null && MixinApi.isContainer(where) && MixinApi.isContainable(c)) {
        ContainmentApi.move(c, where);
        spilled.push(c);
      }
    }
    const line = spilled.length > 0
      ? `You tear ${self.getPresentation()} open; ${spilled.map((s) => s.getPresentation()).join(', ')} falls out.`
      : `You tear ${self.getPresentation()} open; it is empty.`;
    StuffApi.destruct(self);
    return { ok: true, line, made: spilled };
  }
}
