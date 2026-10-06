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
import type { Difficulty } from '@saxonberg/server/mud/lib/advancement/ActSignature';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Corpse from '@saxonberg/server/mud/platform/thing/Corpse';

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

export interface ButcherModel extends CommandModel {
  body: MqlOneResult;
  blade?: MqlManyResult;
  block?: MqlManyResult;
  /** A WORD — which cut to take (`butcher ewe for loin`). */
  cut?: string;
  /** The saw / cleaver that decide how deep the breakdown can go. */
  tools?: MqlManyResult;
  /** What to catch the blood in. ⚠ Absent means it spills. */
  vessel?: MqlManyResult;
}

/**
 * ⭐ Trim — what a poor hand produces where a joint should have been, and
 * what a good hand's offcuts are. It was `stew-meat` and pretending to be
 * the whole animal.
 */
const TRIM_ROW = '/stuff/thing/items/stew-meat';

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
    // ⭐⭐⭐ **Read what each line CLAIMS off one exemplar per line.** A
    // cut row states its muscles, its depth and its difficulty; the
    // species states what share of the body each muscle is. Cloning one
    // of each is how the controller learns the first without the
    // arithmetic having to resolve templates — `dressOut` stays sync and
    // pure over its arguments, which is what lets a test call it with
    // numbers and no world.
    const claims = new Map<string, readonly string[]>();
    const spec = new Map<string, { cutting: string; difficulty: Difficulty }>();
    const exemplars: Stuff[] = [];
    const exemplarFor = new Map<string, Stuff>();
    /** Lines whose exemplar was kept as unit 1 rather than destructed. */
    const spent = new Set<string>();
    for (const line of species.getButcheryYield()) {
      const exemplar = await StuffApi.clone<Stuff>(line.cut);
      exemplars.push(exemplar);
      exemplarFor.set(line.cut, exemplar);
      if (MixinApi.isCut(exemplar)) {
        claims.set(line.cut, exemplar.getTissues());
        spec.set(line.cut, {
          cutting: exemplar.getCutting(),
          difficulty: exemplar.getDifficulty(),
        });
      }
    }

    const dressed = species.dressOut({ liveKg, fleshPct, claims });

    // ⭐ What the tools in hand can reach. A knife is the floor (the verb
    // already gated on an edge); a saw opens the bone-in joints; a
    // cleaver AND a block together make chops.
    const tools = model.tools?.stuff ?? [];
    const hasSaw = tools.some(
      (t) => MixinApi.isTool(t) && t.hasCapability('saw'),
    );
    const hasCleaver = tools.some(
      (t) => MixinApi.isTool(t) && t.hasCapability('cleaver'),
    );
    const blockForChops = this.findBlock(model.block);
    const depthAllowed = (cutting: string): boolean =>
      cutting === 'boneless' ||
      (cutting === 'bone-in' && hasSaw) ||
      (cutting === 'chop' && hasCleaver && !!blockForChops);

    // ⭐⭐ `for <cut>`: one line, named by a WORD matched against the cut
    // row's own keywords — a cut is something you ask for, not a thing in
    // reach.
    const asked = (model.cut ?? '').trim().toLowerCase();
    let wanted: typeof dressed | null = null;
    if (asked) {
      wanted = dressed.filter((line, i) => {
        const ex = exemplars[i];
        if (!ex || !MixinApi.isPerceptible(ex)) return false;
        return ex.getKeywords().some((k) => k.toLowerCase() === asked);
      });
      if (wanted.length === 0) {
        for (const ex of exemplars) await StuffApi.destruct(ex);
        return this.decline(
          context,
          Mml.compose`There is no such cut on ${Mml.thing(body)}.`,
          'no-such-cut',
        );
      }
    }

    const carcass = body instanceof Corpse ? body : null;
    const lines = wanted ?? dressed;
    const cuts: Stuff[] = [];
    const wantedTool: string[] = [];
    const alreadyGone: string[] = [];
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;

    for (const line of lines) {
      const stem = this.stemOf(exemplars[dressed.indexOf(line)]);
      const depth = spec.get(line.cut)?.cutting ?? 'boneless';

      // ⚠ Already off this body — a carcass reduces, so a second
      // butchering cannot take the same muscle twice.
      const taken = line.tissues.length
        ? line.tissues.some((t) => carcass && !carcass.hasTissue(t))
        : !!carcass && !carcass.hasLine(line.cut);
      if (taken) {
        alreadyGone.push(stem);
        continue;
      }

      // ⭐ The tool is the depth. A line the tools cannot reach stays ON
      // the carcass and is named in the refusal, rather than silently
      // vanishing.
      if (!depthAllowed(depth)) {
        wantedTool.push(
          `${stem} (${depth === 'chop' ? 'a cleaver and a block' : 'a saw'})`,
        );
        continue;
      }

      // ⭐⭐⭐ **The hand decides JOINT or TRIM.** A good butcher lifts a
      // whole loin where a poor one leaves trim — which is the
      // Discipline's own sentence ("which cut is which") made true, and
      // it puts skill in the OUTPUT where a player can see it rather
      // than in a mass multiplier nobody can read.
      const difficulty = spec.get(line.cut)?.difficulty ?? 'standard';
      const clean =
        !line.tissues.length ||
        CompetenceBand.rank(band) >= this.handFor(difficulty);
      const rowPath = clean ? line.cut : TRIM_ROW;

      const units = Math.max(1, Math.round(line.units * (0.5 + 0.5 * skill)));
      const kgEach =
        line.kgEach === null
          ? null
          : ((line.kgEach * line.units) / units) * (0.5 + 0.5 * skill);
      // ⭐ The exemplar IS unit 1 when the line is taken as-authored, so
      // nothing is cloned twice; a trimmed line cannot reuse it (it is
      // the wrong row) and a skipped line's exemplar is destructed below.
      const reuse = clean ? exemplarFor.get(line.cut) : undefined;
      if (reuse) spent.add(line.cut);
      for (let i = 0; i < units; i++) {
        const cut =
          i === 0 && reuse ? reuse : await StuffApi.clone<Stuff>(rowPath);
        if (kgEach !== null && MixinApi.isTangible(cut)) {
          cut.setMass(Quantity.of(Math.round(kgEach * 100) / 100, 'kg'));
        }
        // ⭐ What animal it is OF, so the cut can weight its own texture
        // by how much of THIS species each muscle is.
        if (MixinApi.isCut(cut)) {
          (cut as unknown as { _speciesPath: string | null })._speciesPath =
            species.getTemplatePath();
          // ⭐⭐ A wound where this cut came from damages the cut — off
          // the Trauma slice the corpse already adopted, with no new
          // plumbing anywhere.
          if (this.woundedAt(body, line.tissues, species)) {
            (cut as unknown as { damaged: boolean }).damaged = true;
          }
        }
        this.ageAtKill(cut, agedS, carcassK);
        if (MixinApi.isContaminable(body)) body.transferContaminationTo(cut);
        // ⚠⚠ Gut is contaminated at FULL severity whatever the hand: the
        // gut is where the contamination lives, and a spotless butcher
        // still hands you a gut full of what a gut is full of.
        this.spillGut(cut, rowPath.endsWith('/gut') ? 1 : mess);
        if (here && MixinApi.isContainer(here) && MixinApi.isContainable(cut)) {
          ContainmentApi.move(cut, here);
        }
        cuts.push(cut);
      }

      if (carcass) {
        if (line.tissues.length) carcass.markTissuesTaken(line.tissues);
        else carcass.markLineTaken(line.cut);
      }
    }

    // ⚠ Only the exemplars NOT kept as a unit — a line that was taken
    // reused its own, so nothing is cloned and thrown away.
    for (const [path, ex] of exemplarFor) {
      if (!spent.has(path)) await StuffApi.destruct(ex);
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

    // ⭐⭐ What is left, in words. A line the tools could not reach is
    // still ON the carcass and says which tool it wants; a line already
    // taken says so. Both are the refusal doing the teaching.
    const notes: string[] = [];
    if (wantedTool.length) {
      notes.push(`Still on it, for want of a tool: ${wantedTool.join(', ')}.`);
    }
    if (alreadyGone.length) {
      notes.push(`Already off it: ${alreadyGone.join(', ')}.`);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You open ${Mml.thing(body)} with ${Mml.thing(blade)} and work it down to ${String(cuts.length)} piece(s). ${notes.join(' ')}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} butchers ${Mml.thing(body)}.`)
      .send();

    // ⭐⭐⭐ **The body stays until every line is off it.** That is what
    // makes a side something you work to order — lift the loin to sell and
    // come back for the rest — and it gives partial breakdown with no
    // second verb.
    if (!carcass || this.isSpent(carcass, species, claims)) {
      await StuffApi.destruct(body);
    }
  }

  /** The competence rank a difficulty needs for the joint rather than trim. */
  private handFor(difficulty: Difficulty): number {
    if (difficulty === 'easy' || difficulty === 'trivial') return 0;
    if (difficulty === 'hard' || difficulty === 'formidable') {
      return CompetenceBand.rank('proficient');
    }
    return CompetenceBand.rank('competent');
  }

  /** Every line of the species' yield is off this body. */
  private isSpent(
    carcass: Corpse,
    species: Species,
    claims: ReadonlyMap<string, readonly string[]>,
  ): boolean {
    for (const line of species.getButcheryYield()) {
      const tissues = claims.get(line.cut) ?? [];
      if (tissues.length) {
        if (tissues.some((t) => carcass.hasTissue(t))) return false;
      } else if (carcass.hasLine(line.cut)) {
        return false;
      }
    }
    return true;
  }

  /**
   * ⭐⭐ Was this body wounded where this cut came from?
   *
   * Off the **Trauma slice the corpse already adopted** — wounds site on
   * anatomy parts, and a muscle names the part it sits in, so the join is
   * a lookup rather than new plumbing. A spear through the shoulder
   * damages the shoulder and nothing else.
   */
  private woundedAt(
    body: Stuff,
    tissues: readonly string[],
    species: Species,
  ): boolean {
    if (!tissues.length || !MixinApi.isVitals(body)) return false;
    const parts = new Set<string>();
    for (const t of tissues) for (const k of species.partsCarrying(t)) parts.add(k);
    if (!parts.size) return false;
    // ⚠ Wounds are CONDITIONS carrying a `site` — the same shape the
    // dying check reads. No new surface: the Trauma slice the corpse
    // adopted brought them across.
    for (const condition of body.getConditions()) {
      const site = (condition as unknown as { site?: string }).site ?? '';
      if (site && parts.has(site)) return true;
    }
    return false;
  }

  /** The cut row's own first keyword — what to call it in a sentence. */
  private stemOf(exemplar: Stuff | undefined): string {
    if (!exemplar) return 'a cut';
    if (MixinApi.isPerceptible(exemplar)) {
      const kw = exemplar.getKeywords();
      if (kw.length) return kw[0]!;
    }
    return 'a cut';
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
