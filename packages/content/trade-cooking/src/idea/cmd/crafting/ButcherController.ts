/**
 * ButcherController — `butcher <body>`: **take a dead animal apart.**
 *
 * The act the whole build turns on, because it is the one that creates
 * both halves of the pressure at once: it hands you far more meat than you
 * can eat before it turns (so preservation becomes a decision rather than
 * a curiosity), and it is where contamination *comes from* (so the
 * invisible hazard has a source you can point at).
 *
 * ## ⚠⚠ D14 — you cannot butcher a person
 *
 * The gate is `SpeciesApi.isSentient`, which already ships and is already
 * the line combat draws between a cull and a coup. **Not a clade walk:**
 * `species/constructa/metallica/tutor-bot` is sentient and sits nowhere
 * near `hominidae`, so a walk up the tree would cheerfully let a player
 * butcher the tutor-bot. `sentient` is the line this game already draws
 * for lawful killing, which is exactly the consistency the requirement
 * claims for itself. The refusal reads as the world having a view, never
 * as a validator saying no.
 *
 * ## ⭐⭐ D15 — the clock started at the KILL, not at the knife
 *
 * A corpse already runs a decay clock, and it is a *forensic* one on its
 * own cadence. If the cuts' spoilage clock started when you cut them, a
 * player could kill a boar, leave it three days, come back, and get
 * **fresh meat** — a free lunch of exactly the shape the cooking build
 * closed when it made a kill step deposit the dose the population had
 * already earned.
 *
 * So the cuts derive their state from `sinceDeath()`: a microbial load
 * advanced over that elapsed time at the carcass's own temperature. Field
 * dressing is time-critical, and the cellar earns its keep from the first
 * kill.
 *
 * ## The skill, and where it actually bites
 *
 * `butchery` answers two questions and neither is a damage number:
 * **how much** you get, and **how much gut** ends up on the meat. Gut
 * spillage is the dominant real contamination route and it is precisely
 * what an unskilled hand does — so an unskilled butcher yields less AND
 * contaminates more, from one band read.
 *
 * ## What confers it
 *
 * The **edge**, not the class: a `bladed` construction. That keeps the two
 * facts apart — *carrying* contamination is a property of any surface that
 * touches food (`ContaminableMixin`, composed broadly), while *butchering*
 * is an affordance of an edge. Collapse them and you get either a sieve
 * that can butcher or a knife that cannot chop.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Freshness } from '@saxonberg/server/mud/lib/material/Freshness';
import { Contamination } from '@saxonberg/server/mud/lib/material/Contaminable';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

const TOPIC = 'act.deed';
const DISCIPLINE = 'butchery';

/**
 * What a carcass carries into the meat when the gut is opened badly.
 *
 * ⚠ Three organisms, and the mix is the lesson rather than a list:
 * `salmonella` is removed entirely by a proper cook, `perfringens` has
 * spores that survive it and wake as the dish cools, and `staph-aureus`
 * poisons the food rather than infecting you so cooking does not help at
 * all. One careless kill and all three answers are on the table.
 */
const GUT_FLORA: readonly string[] = [
  'salmonella',
  'perfringens',
  'staph-aureus',
];

interface ButcherModel extends CommandModel {
  body: MqlOneResult;
}

export default class ButcherController extends CraftController<ButcherModel> {
  async execute(model: ButcherModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const body = model.body?.stuff ?? null;

    if (!body) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You don't see any '${model.body?.raw ?? ''}' to butcher.`,
        )
        .send();
      context.note({
        kind: 'empty-result',
        field: 'body',
        query: model.body?.raw ?? '',
      });
      return;
    }

    if (!MixinApi.isOrganism(body) || !body.isDead()) {
      return this.decline(
        context,
        Mml.compose`${Mml.thing(body)} is not a carcass.`,
        'not-a-carcass',
      );
    }

    // ⚠⚠⚠ **Warm the species before asking it anything, and FAIL CLOSED
    // if it will not resolve.** The live drive found this, and it is the
    // worst defect in the build: a `Species` Idea is not warmed at boot
    // (the reference-Ideas-inert-at-boot trap, third recurrence), and
    // `SpeciesApi.isSentient` answers **false** for a species that is not
    // resident — so D14 failed OPEN. A person's corpse whose species
    // nobody had touched yet was butcherable, and nothing anywhere said
    // so.
    //
    // `preloadAnatomy` is the shipped ensure — the same one combat calls —
    // and the null branch below is the belt: you cannot butcher what you
    // cannot identify, which is also just true.
    await SpeciesApi.preloadAnatomy(body);
    const species = body.getSpecies();
    if (!species) {
      return this.decline(
        context,
        Mml.compose`You look at ${Mml.thing(body)} and cannot make out what it was. You are not putting a knife into that.`,
        'unidentified-species',
      );
    }

    // ⚠⚠ D14. The world's own position, said in the world's voice.
    if (SpeciesApi.isSentient(body)) {
      return this.decline(
        context,
        Mml.compose`You put the knife away. Whatever else ${Mml.thing(body)} is now, it was somebody — and there is no cut of meat on this earth worth the road that starts here.`,
        'sentient-corpse',
      );
    }

    const blade = this.findBlade(giver);
    if (!blade) {
      return this.decline(
        context,
        Mml.compose`You would need an edge for that — a knife, something bladed.`,
        'no-blade',
      );
    }

    const yields = species.getButcheryYield();
    if (yields.length === 0) {
      // ⭐ Not an error and not a TODO. An empty yield is authored, and it
      // says *there is nothing here worth cutting* — the right answer for
      // a rat, a canary and a beetle.
      return this.decline(
        context,
        Mml.compose`There is nothing on ${Mml.thing(body)} worth the cutting.`,
        'no-yield',
      );
    }

    // ⭐ ONE band read, TWO consequences: how much you get, and how much
    // gut goes on the meat.
    const band: CompetenceBandName = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(DISCIPLINE)
      : CompetenceBand.FLOOR;
    const skill =
      CompetenceBand.rank(band) / Math.max(1, CompetenceBand.rank('expert'));
    const mess = 1 - skill;

    // ⭐⭐ D15 — the clock started at the kill.
    const agedS = MixinApi.isPostmortem(body) ? (body.sinceDeath() ?? 0) : 0;
    const carcassK = Contamination.hostTemperatureK(body);

    const cuts: Stuff[] = [];
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    for (const line of yields) {
      // A clean hand gets every unit; a poor one wastes the carcass. The
      // floor is one — you always get *something* off an animal worth
      // cutting, you just get less of it.
      const units = Math.max(
        1,
        Math.round(line.units * (0.5 + 0.5 * skill)),
      );
      for (let i = 0; i < units; i++) {
        const cut = await StuffApi.clone<Stuff>(line.cut);
        this.ageAtKill(cut, agedS, carcassK);
        this.spillGut(cut, mess);
        if (here && MixinApi.isContainer(here) && MixinApi.isContainable(cut)) {
          ContainmentApi.move(cut, here);
        }
        cuts.push(cut);
      }
    }

    // ⚠⚠ **The BLOCK carries it away, not the blade.** A board is the
    // canonical cross-contamination vector — *do not prep vegetables on
    // the board you cut raw meat on* — and it is food equipment, where a
    // mace and a whip are not. That is the route criterion 17 is about,
    // and it is the reason `wash` matters.
    //
    // ⭐ `null` when nobody is working at a block: the verb is afforded by
    // one, but the controller stays more permissive than its affordance
    // (the `wash` rule), so a butchering done somewhere else still yields
    // meat — it just leaves nothing behind to contaminate the next job.
    const block = this.findBlock(giver);
    if (block) this.spillGut(block, mess);

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: DISCIPLINE,
        difficulty: 'standard',
        outcome: 'success',
      });
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You open ${Mml.thing(body)} with ${Mml.thing(blade)} and work it down to ${String(cuts.length)} cuts.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} butchers ${Mml.thing(body)}.`,
      )
      .send();

    await StuffApi.destruct(body);
  }

  /**
   * ⭐⭐ Stamp the cut with the state the meat has ALREADY earned, lying
   * where it fell. A knife must not reset a clock that has been running
   * since the animal died.
   */
  private ageAtKill(cut: Stuff, agedS: number, carcassK: number): void {
    if (!MixinApi.isFresh(cut) || agedS <= 0) return;
    const material = MixinApi.isTangible(cut) ? cut.getMaterial() : null;
    cut.setMicrobialLoad(
      Freshness.advance(Freshness.inoculum(), agedS, material, carcassK),
    );
  }

  /**
   * Open the gut, more or less badly. `mess` is `1 − skill`, so an
   * untrained hand deposits a full inoculum of everything the animal was
   * carrying and an expert deposits almost none.
   *
   * ⚠ Almost none is not none, and that is deliberate: the answer to this
   * hazard is cooking and cold, never a good enough butcher.
   */
  private spillGut(onto: Stuff, mess: number): void {
    if (!MixinApi.isContaminable(onto)) return;
    const severity = Math.max(0.15, mess);
    for (const key of GUT_FLORA) onto.contaminate(key, severity);
  }

  /**
   * The first bladed thing in reach — held first, then the room. ⭐ The
   * gate is the CONSTRUCTION, not the class: a clasp knife off the general
   * store's shelf opens a carcass exactly as the kitchen's boning knife
   * does, because both are an edge.
   */
  private findBlade(giver: Stuff): Stuff | null {
    for (const candidate of this.reachOf(giver)) {
      if (!MixinApi.isConstructed(candidate)) continue;
      if (candidate.getConstructionForm() !== 'bladed') continue;
      return candidate;
    }
    return null;
  }

  /**
   * The work surface in reach that can hold what the gut spills — the
   * butcher's block. ⚠ Found by what it CAN DO (`Contaminable` + a
   * surface), never by class name: a second venue's slab or a shambles
   * bench answers the same way without this file learning its name.
   */
  private findBlock(giver: Stuff): Stuff | null {
    for (const candidate of this.reachOf(giver)) {
      if (!MixinApi.isContaminable(candidate)) continue;
      if (!MixinApi.isSurfaced(candidate)) continue;
      return candidate;
    }
    return null;
  }

  /** Held kit first, then the room — the two-leg reach the trade uses. */
  private reachOf(giver: Stuff): Stuff[] {
    const reach: Stuff[] = [];
    if (MixinApi.isContainer(giver)) reach.push(...giver.getContents());
    if (MixinApi.isContainable(giver)) {
      const here = giver.getContainer();
      if (here && MixinApi.isContainer(here)) reach.push(...here.getContents());
    }
    return reach;
  }

  private decline(
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
