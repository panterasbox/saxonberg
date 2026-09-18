/**
 * Panel — **a coppice panel: a bed of stools that remembers being cut.**
 *
 * The shipped coppice was a plain `GardenBed` propped in a transient
 * room, and a transient room rebuilds its props every boot — so the
 * panel came back full after every restart, and the game-year rotation
 * the stool row states was a faucet through `restart`. A panel is
 * standing capital: what it remembers across a bounce is the whole of
 * what makes charcoal a crop rather than a prop.
 *
 * ## The stack, and why each layer
 *
 * `PersistableMixin(SingletonMixin(PostRegistrationMixin(GardenBed)))`:
 *
 * - **`GardenBed`** — the same ground as every bed: soil with its own two
 *   checkpoints, N plant slots, the four cultivation verbs. A panel is a
 *   bed with a bigger number, and nothing here changes how a stool grows.
 * - **`SingletonMixin`** — one row is one panel. A room's `props:` mints a
 *   singleton through `StuffApi.singleton`, which is the one path that
 *   restores-or-seeds a keyless persistable: restore when a record
 *   exists under the scope, else seed the born-with stools and capture
 *   the first record. A second cant is a second row.
 * - **`PersistableMixin`** OUTERMOST — the host rule (its cleanup runs
 *   before the inner container evacuates; its `applyProps` wraps the
 *   bed's so the stools are seeded exactly once, through the gate). The
 *   stools are keyed nested hosts in the panel's container slice, so a
 *   harvested stool comes back cut, with its game-year fill running.
 *
 * ## The ready line
 *
 * A panel says when it will be ready to cut again — in words, never a
 * number a player could optimise against: *"cut to the stool and
 * regrowing; at this rate they will be ready to cut again in about three
 * hundred and sixty days — a year, near enough."* The polycarp fill is
 * linear at full satisfaction, so the estimate is the honest one.
 *
 * ⚠ A class's own `commandContributions` SHADOWS the composed mixin's
 * list (ranching.md records the silent failure), so `Cultivable`'s four
 * views are copied in beside the trade's own.
 */

import GardenBed from '@saxonberg/server/mud/platform/thing/GardenBed';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Growing } from '@saxonberg/server/mud/lib/husbandry/Growing';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';

const PanelBase = PersistableMixin(
  SingletonMixin(PostRegistrationMixin(GardenBed)),
);

/**
 * The panel's own reading — one line for the whole panel, derived from
 * its stools. Cut stools say how long until the next cut; a panel whose
 * every stool is ripe says so. Numbers are words: a rotation is a fact a
 * player reads, not a gauge.
 */
function readyAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isCultivable(host)) return text;
  const stools = (host.getPlants() as Stuff[]).filter(
    (p): p is Stuff & Growing => MixinApi.isGrowing(p) && p.isPolycarp(),
  );
  if (stools.length === 0) return text;
  const line = readyLine(stools);
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

function readyLine(stools: Array<Stuff & Growing>): string {
  const waiting = stools.filter((p) => !p.isHarvestable());
  if (waiting.length === 0) return 'The stools are ready to cut.';
  // The longest wait among the cut stools is when the PANEL is ready.
  let daysLeft = 0;
  for (const p of waiting) {
    const fillDays = p.getProfile()?.fruitFillDays ?? 0;
    const left = Math.ceil((1 - Math.min(1, p.getFruitFill())) * fillDays);
    if (left > daysLeft) daysLeft = left;
  }
  const some = waiting.length < stools.length ? 'Some of the stools' : 'The stools';
  if (daysLeft <= 0) {
    return `${some} are cut to the stool and regrowing.`;
  }
  const near =
    daysLeft >= 330 && daysLeft <= 390
      ? ' — a year, near enough'
      : daysLeft >= 150 && daysLeft <= 210
        ? ' — half a year'
        : '';
  return `${some} are cut to the stool and regrowing; at this rate they will be ready to cut again in about ${GrammarApi.inWords(daysLeft)} days${near}.`;
}

export default class Panel extends PanelBase {
  static fieldMeta: FieldMeta = {};

  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      'platform/cmd/inventory/plant.yaml',
      'platform/cmd/inventory/repot.yaml',
      'platform/cmd/inventory/harvest.yaml',
      'platform/cmd/bulk/feed.yaml',
      // …plus the trade's own: a mature standard in a panel is felled
      // where it stands.
      'trade/forestry/cmd/forestry/fell.yaml',
    ],
    environment: [],
  };

  /** The ready line, appended to the panel's long description on `look`. */
  static markupAugmenters: MarkupAugmenter[] = [readyAugmenter];
}
