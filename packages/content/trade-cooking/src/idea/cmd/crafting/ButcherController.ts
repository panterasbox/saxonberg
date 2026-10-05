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
 * ## ⭐⭐ The carcass chain — ONE butcher, and it reads the animal
 *
 * This used to be one of **two** `butcher` verbs. The stockyard had its
 * own: it killed the animal and took it apart in one act, out of a module
 * table of five hardcoded fractions that was the same for a hen and a
 * bullock, crediting `stockmanship`, with no contamination anywhere. So
 * an animal gave different things depending on which word you typed at
 * it, and neither answer was the animal's own.
 *
 * Killing and dressing are two acts. `slaughter` kills — and so does a
 * fight, a fox, a fall and old age — and every one of them leaves the
 * same `Corpse`. This act takes that body apart, wherever and however it
 * died, which is what makes the hedgerow and the stockyard the same job.
 *
 * ⭐ And the yield is **dressed off the body**: `Species.dressOut` turns
 * the species' declared shares into kilograms using the mass the animal
 * actually had and the condition it died in (`Corpse.conditionAtDeath`,
 * stamped at the kill and frozen — a dead animal's condition cannot
 * change). A bullock therefore gives eight times a ewe for one reason:
 * it is eight times the animal. Nothing here knows a species' name.
 *
 * ⚠ **A live animal is refused, and it is told which act it wants.**
 * The order matters: a live target used to be refused *"is not a
 * carcass"* before anything about it was read, so the person who typed
 * `butcher ewe` at a live ewe learned nothing. Sentient → named →
 * no-yield → alive, so each no is the most specific true one.
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
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
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
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Corpse from '@saxonberg/server/mud/platform/agent/Corpse';

const TOPIC = 'act.deed';
const DISCIPLINE = 'butchery';

/**
 * The condition a body with no stamp is assumed to have died in — the
 * middle of the range, which is where an unremarkable animal sits.
 *
 * ⚠ It is the fallback for a body that carries no `conditionAtDeath`: a
 * person's corpse, a fixture, or anything that died without a `flesh`
 * reserve to read. Not a default for livestock — those always carry one,
 * because `ConditionLogic` stamps it at the kill.
 */
const UNREMARKABLE_FLESH = 55;

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
  blade?: MqlManyResult;
  block?: MqlManyResult;
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

    // ⚠ Not an organism at all — a chair, a sack. Nothing further to say.
    if (!MixinApi.isOrganism(body)) {
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

    // ⭐⭐ **A named animal is refused for being named**, and it is a
    // different no from every other one here. `Livestock` is not `Named`;
    // a kept animal is, and a name arrives only when a player gives one
    // to an animal that chose to follow them. ⚠ It is checked on a LIVE
    // target only: the mint deliberately carries no name stamp, so a dead
    // pet's body is not refused — recorded as a deferred seam rather than
    // pretended away.
    if (
      body.isAlive() &&
      MixinApi.isNamed(body) &&
      (body.getName() ?? '') !== ''
    ) {
      return this.decline(
        context,
        Mml.compose`That is ${Mml.thing(body)}. You named it, and it is not meat.`,
        'named-animal',
      );
    }

    const blade = this.findBlade(model.blade);
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

    // ⚠⚠ **LAST, so it is the most specific true refusal.** This used to
    // be first, phrased *"is not a carcass"*, and it fired before the
    // species was read — so a player who typed `butcher ewe` at a live ewe
    // was told the ewe was not a carcass, which is both unhelpful and the
    // wrong thing to be surprised by. Everything that is permanently true
    // of this animal is said first; *it is still alive* is said last,
    // because it is the one thing the player can change.
    if (body.isAlive()) {
      return this.decline(
        context,
        Mml.compose`${Mml.thing(body)} is alive. If you mean to kill it, say so — a beast is slaughtered, and then it is butchered.`,
        'still-alive',
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

    // ⭐⭐ **Dress the carcass out: the animal's own answer, at the weight
    // it had and the condition it died in.** `liveKg` is the body's
    // stamped mass — which is the COMPOSED figure, so a finished ewe
    // really did weigh more than a thin one — and `fleshPct` is the
    // condition frozen at the kill. Condition therefore pays twice, once
    // in what the beast weighed and once in what share of it is meat.
    // Both are true of real carcasses, and it is the arithmetic the
    // retired stockyard verb already did.
    const liveKg = MixinApi.isTangible(body) ? body.getMass().rawValue() : 0;
    const fleshPct =
      body instanceof Corpse
        ? (body.getConditionAtDeath() ?? UNREMARKABLE_FLESH)
        : UNREMARKABLE_FLESH;
    const dressed = species.dressOut({ liveKg, fleshPct });

    const cuts: Stuff[] = [];
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    for (const line of dressed) {
      // A clean hand gets every unit; a poor one wastes the carcass. The
      // floor is one — you always get *something* off an animal worth
      // cutting, you just get less of it.
      const units = Math.max(
        1,
        Math.round(line.units * (0.5 + 0.5 * skill)),
      );
      // ⭐ And the pieces are SMALLER from a poor hand as well as fewer,
      // because the mass is divided by the units the species declared
      // rather than by the units this hand got: a clumsy butchering wastes
      // the carcass rather than producing the same meat in bigger lumps.
      // `kgEach` is `null` on a counted line (a hen), where the row's own
      // authored mass stands.
      const kgEach =
        line.kgEach === null
          ? null
          : (line.kgEach * line.units) / units * (0.5 + 0.5 * skill);
      for (let i = 0; i < units; i++) {
        const cut = await StuffApi.clone<Stuff>(line.cut);
        if (kgEach !== null && MixinApi.isTangible(cut)) {
          cut.setMass(Quantity.of(Math.round(kgEach * 100) / 100, 'kg'));
        }
        this.ageAtKill(cut, agedS, carcassK);
        // ⭐ The body's OWN load rides onto every cut (fishing D20): a
        // fish landed below the outfall carries the city's water onto
        // its fillet, whatever the hand that cut it. ⭐⭐ **Every corpse
        // is `Contaminable` now** — a carcass in the sun grows a
        // population nothing reports — so this is no longer the fish's
        // special case but the ordinary one, and the fish's load survives
        // the crossing because the mint transfers it.
        if (MixinApi.isContaminable(body)) body.transferContaminationTo(cut);
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
    const block = this.findBlock(model.block);
    if (block) this.spillGut(block, mess);
    // ⭐ …and the blade, **if it is a blade that can hold it.** A cook's
    // boning knife remembers what it cut; a clasp knife out of a pocket
    // does not, because it is a general tool and not food kit. Both open
    // the carcass — the verb gates on an edge, not on a class.
    this.spillGut(blade, mess);

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
   * The blade — a NARROWING over what the binder bound, not a search.
   * `butcher.yaml` declares `blade` with a `[mixin.ConstructedMixin]`
   * default; the gate is then the CONSTRUCTION, not the class: a clasp
   * knife off the general store's shelf opens a carcass exactly as the
   * kitchen's boning knife does, because both are an edge — and no
   * predicate reads a form (`lint:instrument-args`).
   */
  private findBlade(bound: MqlManyResult | undefined): Stuff | null {
    for (const candidate of bound?.stuff ?? []) {
      if (!MixinApi.isConstructed(candidate)) continue;
      if (candidate.getConstructionForm() !== 'bladed') continue;
      return candidate;
    }
    return null;
  }

  /**
   * The work surface that can hold what the gut spills — the butcher's
   * block. ⚠ Bound by what it CAN DO (`butcher.yaml`: surfaced AND
   * contaminable), never by class name: a second venue's slab or a
   * shambles bench answers the same way without this file learning its
   * name. The binder's query already says both; the check here is the
   * type narrowing, not a second search.
   */
  private findBlock(bound: MqlManyResult | undefined): Stuff | null {
    for (const candidate of bound?.stuff ?? []) {
      if (!MixinApi.isContaminable(candidate)) continue;
      if (!MixinApi.isPlacing(candidate)) continue;
      return candidate;
    }
    return null;
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
