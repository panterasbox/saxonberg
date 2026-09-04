/**
 * DraftController — `draft <n> [from <herd>]`, and ⭐⭐ **the act that
 * turns a number in a book into an animal.**
 *
 * D21's boundary act. The head exists as a deterministic function of the
 * herd's identity and its index, so it was always there; what drafting
 * does is give it a body to be looked at in.
 *
 * > **Identity is earned by being measured.** Head 17 drafted twice is
 * > the same animal, and the answer was true before anyone asked.
 *
 * ⚠ **The stockman's own word is what moves it.** There is no automatic
 * promotion, no "this one has become interesting" heuristic — you draft
 * a head because you decided to look at it, which is what makes the
 * management game about the tail rather than about the mean.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import HerdRegistry, { type HerdRecord } from '../../HerdRegistry';
import { HeadSeed } from '../../../lib/HeadSeed';
import type Livestock from '../../../agent/Livestock';

export const RANCHING_TOPIC = 'act.deed';

/** The row a drafted head is minted from. */
const LIVESTOCK_ROW = '/trade/ranching/agent/livestock';

/** The registry singleton's identity path. */
export const HERD_REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

interface DraftModel extends CommandModel {
  head?: string;
  herd?: string;
}

export default class DraftController extends CommandController<DraftModel> {
  async execute(model: DraftModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const registry = await this.registry();
    const herds = await registry.all();
    const picked = this.pickHerd(herds, model.herd, this.bookHerdId(giver));
    const herd = picked === null ? null : await this.reapStrays(registry, picked);
    if (!herd) {
      this.decline(
        context,
        herds.length === 0
          ? Mml.compose`There is no herd filed that you could draft one out of.`
          : Mml.compose`You have no herd by that name.`,
        'no-herd',
      );
      return;
    }
    const index = Number.parseInt(model.head ?? '', 10);
    if (!Number.isInteger(index) || index < 0 || index >= herd.tally) {
      this.decline(
        context,
        Mml.compose`${herd.name} runs to ${herd.tally} head. There is no number ${model.head ?? '?'} in it.`,
        'no-such-head',
      );
      return;
    }
    if (herd.drafted.some((d) => d.index === index)) {
      this.decline(
        context,
        Mml.compose`Number ${index} is already out.`,
        'already-drafted',
      );
      return;
    }

    const animal = await this.mint(herd, index, giver);
    if (!animal) {
      this.decline(context, Mml.compose`You cannot get a rope on it.`, 'mint-failed');
      return;
    }
    await registry.draft(herd.herdId, index);

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`You cut number ${index} out of ${herd.name} and look it over. ${animal.stockmanRead()}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} cuts one out of the bunch and stands looking at it.`,
      )
      .send();
  }

  /**
   * Materialise the head. ⭐ **Seeded, never drawn** — the sample is a
   * pure function of `(herdId, index)`, folded over whatever the
   * register remembers about this head from the last time it was out.
   */
  private async mint(
    herd: HerdRecord,
    index: number,
    giver: Stuff,
  ): Promise<Livestock | null> {
    let animal: Livestock;
    try {
      animal = await StuffApi.clone<Livestock>(LIVESTOCK_ROW);
    } catch {
      return null;
    }
    const sample = HeadSeed.sample(
      {
        herdId: herd.herdId,
        // The herd's mean age moves with the world clock through each
        // head's own reconcile; what is seeded is the SPREAD around it.
        meanAgeDays: 400,
        femaleFraction: 0.85,
      },
      index,
      herd.overlay[String(index)],
    );

    animal.bindToHerd(herd.herdId, index);
    const species = await this.speciesOf(herd.speciesPath);
    animal.setSpecies(species);
    this.nameAfterSpecies(animal, species);
    animal.setLifecycleState('alive');
    animal.setAge(sample.ageDays);
    animal.handling = sample.handling;
    const flesh = animal.getReserve('flesh');
    if (flesh) {
      animal.adjustReserve(
        'flesh',
        Quantity.of(sample.flesh - flesh.current.rawValue(), '%'),
      );
    }

    const where = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (where && MixinApi.isContainer(where)) {
      ContainmentApi.move(
        animal as unknown as Stuff & Containable,
        where as Stuff & Container,
      );
    }
    return animal;
  }

  /**
   * The herd's species — resident, else stood up.
   *
   * ⚠⚠ **`findByTemplatePath` alone was not enough, and the failure was
   * silent and total.** A `Species` is a reference Idea and nothing warms
   * a roster of them, so on a fresh process the lookup answered `null`,
   * every drafted head was minted with **no species at all** — no body
   * plan, no vital profile, no lifespan — and the act still reported
   * success. The recurring bug (`reference Ideas inert at boot`), and the
   * shipped answer is this get-or-create, the same one
   * `SurveyChannelController.depositAt` uses.
   */
  private async speciesOf(path: string): Promise<Species | null> {
    if (!path) return null;
    const resident = StuffApi.findByTemplatePath<Species>(path);
    if (resident) return resident;
    try {
      return await StuffApi.singleton<Species>(path);
    } catch {
      return null;
    }
  }

  /**
   * Let the head answer to what it IS.
   *
   * ⚠ The row is deliberately generic — *"a head of stock"*, keyed on
   * `head`/`stock`/`animal`/`beast` — because ONE row serves every
   * species a herd can be founded on. But a player who has just cut a
   * cow out of the college herd types `handle cow`, and until the
   * species' own names are folded in the game answers *"that is not an
   * animal you can work with"* about the animal standing in front of
   * them. Found by driving it.
   *
   * ⭐ The species' `commonNames` are already authored (`cow`, `heifer`,
   * `bull`, `calf`, `ox`, `beast`), so nothing new is written down: the
   * generic keywords stay, the specific ones join them, and the head
   * presents as what it is rather than as what the row had to be.
   */
  private nameAfterSpecies(animal: Livestock, species: Species | null): void {
    if (!species) return;
    const names = species.getCommonNames().map((n) => n.toLowerCase());
    if (names.length === 0) return;
    const self = animal as unknown as Stuff;
    if (!MixinApi.isPerceptible(self)) return;
    const existing = self.getKeywords().map((k) => k.toLowerCase());
    self.setKeywords([...new Set([...existing, ...names])]);
    // ⭐ And it LOOKS like one too. "a head of stock" in a byre full of
    // cattle is the room telling you less than it knows.
    const primary = names[0];
    if (primary && MixinApi.isVisible(self)) self.setShortDescription(`a ${primary}`);
  }

  /**
   * The named herd; else the one the BOOK IN THE ROOM records; else the
   * only one there is.
   *
   * ⭐ The middle rung is the `stake` shape — the fixture that affords
   * the act also says what the act is about — and it is what lets a
   * second farm exist. Without it `draft 3` is unambiguous only while
   * exactly one herd is filed in the entire world, which is not a rule
   * anybody could have discovered from the inside.
   */
  private pickHerd(
    herds: readonly HerdRecord[],
    named?: string,
    bookHerdId?: string | null,
  ): HerdRecord | null {
    if (named) {
      const want = named.toLowerCase();
      return (
        herds.find(
          (h) => h.herdId.toLowerCase() === want || h.name.toLowerCase() === want,
        ) ?? null
      );
    }
    if (bookHerdId) {
      const here = herds.find((h) => h.herdId === bookHerdId);
      if (here) return here;
    }
    return herds.length === 1 ? (herds[0] as HerdRecord) : null;
  }

  /**
   * ⚠⚠ **Heal drafted entries whose animal no longer exists.**
   *
   * `drafted` means *there is an object for this head somewhere*, and
   * that is a claim about the live world which the world can falsify:
   * the object is destroyed on a purge, an eviction, or a restart before
   * anybody returned it. When it does, the register goes on insisting
   * *"number 3 is already out"* forever and **the herd has silently lost
   * a head** — found by drafting the same index twice across two runs of
   * the live drive.
   *
   * ⭐ Reconcile-on-read, and the direction is the honest one: the
   * DOCUMENT is the herd's identity, the OBJECT is a temporary body, so
   * a missing body means the record is stale — never that the head is
   * gone. Nothing is written down about what happened to it, because
   * nothing happened to it: it was never out.
   *
   * ⚠ This is not straying (D95). Straying is a live animal in the wrong
   * PLACE, which is a disagreement between two things that both exist.
   */
  private async reapStrays(
    registry: HerdRegistry,
    herd: HerdRecord,
  ): Promise<HerdRecord> {
    if (herd.drafted.length === 0) return herd;
    const live = new Set<number>();
    for (const beast of StuffApi.findAllByTemplatePath<Livestock>(LIVESTOCK_ROW)) {
      if (beast.getHerdId() === herd.herdId) live.add(beast.getHeadIndex());
    }
    const kept = herd.drafted.filter((d) => live.has(d.index));
    if (kept.length === herd.drafted.length) return herd;
    const healed = { ...herd, drafted: kept };
    await registry.update(healed);
    return healed;
  }

  /**
   * The herd the herdbook in this room records, if there is one.
   *
   * ⚠ Duck-typed by SHAPE rather than by class or path — the same seam
   * `stake` uses to find the claims register. A second ranching venue
   * ships its own book and neither pack learns about the other.
   */
  private bookHerdId(giver: Stuff): string | null {
    const where = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (!where || !MixinApi.isContainer(where)) return null;
    for (const item of where.getContents()) {
      // ⚠ `getHerdId` alone is NOT enough to identify a book: a drafted
      // head carries one too (it knows which herd it came out of), so a
      // cow standing in the yard would answer for the register. The book
      // is the thing that also knows the TALLY.
      const shape = item as unknown as {
        getHerdId?(): string;
        getTally?(): number;
      };
      if (typeof shape.getTally !== 'function') continue;
      const id = shape.getHerdId?.();
      if (typeof id === 'string' && id.length > 0) return id;
    }
    return null;
  }

  protected async registry(): Promise<HerdRegistry> {
    const resident = StuffApi.findByTemplatePath<HerdRegistry>(HERD_REGISTRY_PATH);
    if (resident) return resident;
    return StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
