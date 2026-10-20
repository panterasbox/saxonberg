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
 * ## The stack
 *
 * The kernel's `PermanentBed` — `PersistableMixin(SingletonMixin(GardenBed))`,
 * a bed that is a fixture of its place and remembers what grows in it
 * (see that file for why each layer). It was this class's own stack until
 * the silk build promoted it; a panel is that bed plus what follows.
 *
 * ## The ready line
 *
 * A panel says when it will be ready to cut again — in words, never a
 * number a player could optimise against: *"cut to the stool and
 * regrowing; at this rate they will be ready to cut again in about three
 * hundred and sixty days — a year, near enough."* The polycarp fill is
 * linear at full satisfaction, so the estimate is the honest one.
 *
 * ## The deed — written by the ground, told to its room
 *
 * `PlantController` is kernel and must not learn forestry. When a
 * STANDARD (a plant that yields no crop and says its keeping is
 * silviculture) arrives in the plant slot inside somebody's command
 * frame, the panel asks its container: if the room is a Wood, the room
 * records the planting (who, what, which game day — idempotent on the
 * tree's key, because a persistence restore inside a `go` frame re-seats
 * the same tree), and the planter's chronicle takes one deed keyed on
 * the tree. In the fuel yard the container is not a Wood and no planting
 * is recorded; the deed still is. Why the ground writes it and not the
 * verb: the deed is a fact about THIS panel in THIS clearing — which
 * stand it joined — and only the panel knows its room. The verb knows a
 * seed and a bed.
 *
 * ⚠ A class's own `commandContributions` SHADOWS the composed mixin's
 * list (ranching.md records the silent failure), so `Cultivable`'s four
 * views are copied in beside the trade's own.
 */

import PermanentBed from '@saxonberg/server/mud/platform/thing/PermanentBed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Growing } from '@saxonberg/server/mud/lib/husbandry/Growing';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { Slottable } from '@saxonberg/server/mud/lib/slot/Slottable';
import { PLANT_SLOT } from '@saxonberg/server/mud/lib/husbandry/Cultivable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { STAND_MIXIN, type Stand } from '../lib/Stand';

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * ⭐ The persistable bed is the kernel's `PermanentBed` now (promoted in
 * the silk build: the silk house's mulberry walk wanted the same bed). What
 * stays here is forestry's own — the ready line, `fell`, the deed.
 */
const PanelBase = PermanentBed;

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

  /** See the class header § The deed. */
  public override occupy(candidate: Stuff & Slottable, slot: string): void {
    super.occupy(candidate, slot);
    if (slot !== PLANT_SLOT) return;
    if (!MixinApi.isGrowing(candidate)) return;
    // A standard, not a stool: no crop, and its keeping is silviculture.
    if (candidate.getHarvestTemplatePath() !== null) return;
    if (candidate.getDiscipline() !== 'silviculture') return;
    // Somebody planted it — a restore at boot has no acting author.
    const author = ExecutionContextApi.getActingAuthor() as Stuff | null;
    if (!author) return;
    const plantKey = MixinApi.isPersistable(candidate) ? candidate.getPersistenceKey() : null;
    if (!plantKey) return;
    const name = candidate.getPresentation();
    const speciesPath = MixinApi.isOrganism(candidate)
      ? candidate.getSpecies()?.getTemplatePath() ?? ''
      : '';
    const gameDay = Math.floor(WorldClockApi.getNow().rawValue() / SECONDS_PER_GAME_DAY);

    const room = this.getContainer();
    const wood = room && MixinApi.isActive(room, STAND_MIXIN) ? (room as unknown as Stuff & Stand) : null;
    if (wood) {
      wood.recordPlanting({
        plantKey,
        name,
        planter: author.getIdentityPath() ?? '',
        planterName: author.getPresentation(),
        speciesPath,
        gameDay,
      });
      PersistableApi.captureHostOf(wood).catch((err) =>
        console.warn('Panel: capturing the room after a planting failed:', err),
      );
    }
    if (MixinApi.isPersona(author)) {
      author
        .recordChronicleOnce(`forestry:planting:${plantKey}`, {
          template: 'Planted {{name}} in {{where}}.',
          vars: {
            name,
            where: wood ? wood.getPresentation() : this.getPresentation(),
          },
          tags: ['forestry', 'planting'],
          where: room?.getTemplatePath() ?? null,
        })
        .catch((err) => console.warn('Panel: recording the planting deed failed:', err));
    }
  }
}
