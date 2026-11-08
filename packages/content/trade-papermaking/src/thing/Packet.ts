/**
 * Packet — a container made of paper: a grocer's bag, a carton
 * of board. Light, cheap, and it fails like paper: soaked through it gives
 * way (the material's rule on `Integrity` — paper and board are weak wet)
 * and whatever it held falls out where it stood; torn open it spills the
 * same way. A crate is the wooden answer, and weighs it.
 *
 * ⭐ The spill is the shipped one: a destroyed container's contents go to
 * its own container (`Container.cleanupOnDestruct`). This class only says
 * what TEARING it does.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve/Reserved';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { CombustibleMixin } from '@saxonberg/server/mud/lib/fire/Combustible';
import { TearableMixin, type TearOutcome } from '@saxonberg/server/mud/lib/material/Tearable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';

export default class Packet extends TearableMixin(
  CombustibleMixin(ThermalMixin(ReservedMixin(ContainerMixin(Good)))),
) {
  private spilledInto(): string {
    const n = this.getContents().length;
    return n === 0 ? '' : ` — ${this.getContents().map((c) => c.getPresentation()).join(', ')} ${n === 1 ? 'falls' : 'fall'} out`;
  }

  public override async tear(_by: Stuff, _page?: number): Promise<TearOutcome> {
    const self = this as unknown as Stuff;
    const spilled = [...this.getContents()] as Stuff[];
    const line = `You tear ${self.getPresentation()} open${this.spilledInto()}.`;
    StuffApi.destruct(self);
    return { ok: true, line, made: spilled };
  }
}
