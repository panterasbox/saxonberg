/**
 * WorksFace — ⭐ **the part of a works you go and look at** (underwater
 * D17): the intake's screen under the river, a weir's sill. It is not the
 * works — the `Conduit` on the bank is — but it is where their state can
 * be SEEN, and an inspector who looks at it has inspected them. It reads
 * its works' own state (cut, dry, frozen, fouled, overdrawn, off) and
 * says it in words, never a figure.
 *
 * Speaks the kernel's `Inspectable` shape, so `inspect screen` works and
 * an `inspection` job on the works is satisfied by having looked.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import type { Inspectable } from '@saxonberg/server/mud/lib/employment/Inspectable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { SupplyState } from '@saxonberg/server/mud/lib/supply/SupplyState';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Conduit from './Conduit';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '../idea/WatercourseCatalogue';

/** What each state looks like, seen from under the water. */
const SEEN: Readonly<Record<SupplyState, string>> = {
  dry: 'Almost nothing is going through it — the pull you expect at the mouth is not there.',
  cut: 'Beyond the bars the pipe is broken through; the water goes in and comes out again in a cloud of silt.',
  frozen: 'Ice furs the bars and the throat behind them; nothing is going through.',
  fouled: 'The bars are matted solid with weed, rag and filth, and the water comes through them brown and slow.',
  overdrawn: 'The water is going in hard enough to pull at you — more than the screen was built to pass.',
  off: 'The water at the mouth is still. Whatever drives it is not running.',
};

export default class WorksFace extends Thing implements Inspectable {
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/work/inspect.yaml'],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    works: { persistent: true, authorable: true },
  };

  /** The row of the works this is the face of. */
  public works = '';

  public inspectedWorks(): Stuff {
    const w = this.works ? StuffApi.findByTemplatePath<Stuff>(this.works) : undefined;
    return w && !w.isDestroyed() ? w : (this as unknown as Stuff);
  }

  public async inspectionReport(inspector: Stuff): Promise<Mml> {
    void inspector;
    const works = this.inspectedWorks();
    if (!(works instanceof Conduit)) {
      return Mml.compose`You go over ${Mml.thing(this as unknown as Stuff)} closely. Nothing is wrong with it that you can see.`;
    }
    let state: SupplyState | null = null;
    try {
      const catalogue = await StuffApi.singleton<WatercourseCatalogue>(WATERCOURSE_CATALOGUE_PATH);
      state = (await works.readingFor(catalogue, WorldClockApi.getNow().rawValue(), 0)).state;
    } catch {
      state = null;
    }
    const seen = state === null
      ? 'The bars are clean enough, and the water goes through them steady and strong.'
      : SEEN[state];
    return Mml.compose`You go over ${Mml.thing(this as unknown as Stuff)} bar by bar. ${seen}`;
  }
}
