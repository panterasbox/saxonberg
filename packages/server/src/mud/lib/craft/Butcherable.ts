/**
 * Butcherable — ⭐ **a dead body that keeps a ledger of what is still on
 * it** (controller-liquidity D14).
 *
 * `butcher` is the cooking trade's verb. The species says what a body
 * yields (`Species.dressOut`); the BODY says the condition it died in and
 * which lines are still on it, and marks a line taken. A side is worked to
 * order — lift the loin to sell, come back for the rest — because the body
 * keeps the ledger, and it goes when every line is off it.
 *
 * The ledger plan (`butcherPlanFor`, the hook a body overrides) answers the
 * facts (its {@link ButcherCarcass}) and its `onComplete` says whether the
 * yield the knife asked about is now all off. ⭐ The breakdown itself is
 * `butcherPlan` (controller-liquidity W10): instant, and its completion
 * lays the cuts down — the verb only words it.
 *
 * ⭐ **The default is the body with no ledger**: every line counts as on
 * it, taking one marks nothing, and it is spent when the knife is done — so
 * a body that carries no record still breaks down once, whole. `Corpse`
 * overrides it with its tissue record.
 *
 * It was the `butcher` key of `Cuttable`'s ten-verb answer map; that map is
 * gone (D14 — cutting is several acts, each its own small protocol).
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActAnswer, ActDone, ActPlan, ActRefusal } from './ActPlan';
import type { SoilSpec } from '../cleanliness/SoilSpec';
import type { Difficulty } from '../advancement/ActSignature';
import type { CompetenceBandName } from '../advancement/CompetenceBand';
import { CompetenceBand } from '../advancement/CompetenceBand';
import { Freshness } from '../material/Freshness';
import { Contamination } from '../material/Contaminable';
import { Quantity } from '../quantity';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { SpeciesApi } from '../../api/species';
import { ContainmentApi } from '../../api/containment';
import { MaterialApi } from '../../api/material';
import type Species from '../../platform/idea/species/Species';
import type { DressLine } from '../../platform/idea/species/Species';
import type { Body, YieldLine } from '../species/Body';
import type { Organism } from '../species/Organism';
import type { FlawKind } from '../material/Flawed';

/** One line of a species' yield, as the butcher asks the carcass about it. */
export interface CarcassLine {
  /** The cut row's path. */
  cut: string;
  /** The muscles it claims (empty = a whole line, kept by its path). */
  tissues: readonly string[];
}

/**
 * ⭐ The carcass ledger a body answers `butcher` with: the condition it
 * died in, and which lines are still on it. A line taken is marked here.
 */
export interface ButcherCarcass {
  /** The condition frozen at the kill, or `null` when none was stamped. */
  fleshPct: number | null;
  /** Is this line still on the body? */
  stillOn(line: CarcassLine): boolean;
  /** Mark this line taken off the body. */
  take(line: CarcassLine): void;
}

/** Every line of the species' yield is off the body — it goes. */
export interface ButcherDone {
  spent: boolean;
}

/** A butchering's plan — it never refuses; the verb's gates come first. */
export type ButcherPlan = ActPlan<ButcherCarcass, ButcherDone, never>;

/** The Discipline a butchering credits and reads its hand from. */
const BUTCHERY = 'butchery';

/**
 * The condition a body with no stamp is assumed to have died in — the
 * middle of the range (a person's corpse, a fixture, anything that died
 * without a `flesh` reserve). Not a livestock default: `ConditionLogic`
 * stamps every kill.
 */
const UNREMARKABLE_FLESH = 55;

/**
 * ⭐ Trim — what a poor hand produces where a joint should have been, and
 * what a good hand's offcuts are.
 */
const TRIM_ROW = '/stuff/thing/items/stew-meat';

/**
 * What breaking a carcass puts on the butcher (cleanliness D6): blood and
 * fat on the hands and the trunk's outer layer, a little on the floor.
 */
const BUTCHER_SOILS: readonly SoilSpec[] = [
  { kind: '/platform/dirt/blood', amount: 0.5, where: 'hands' },
  { kind: '/platform/dirt/grease', amount: 0.2, where: 'hands' },
  { kind: '/platform/dirt/blood', amount: 0.4, where: 'apron' },
  { kind: '/platform/dirt/grease', amount: 0.1, where: 'apron' },
  { kind: '/platform/dirt/blood', amount: 0.1, where: 'floor' },
];

/**
 * What a carcass carries into the meat when the gut is opened badly — and
 * the mix is the lesson: `salmonella` dies in a proper cook, `perfringens`
 * has spores that survive it, `staph-aureus` poisons the food so cooking
 * does not help at all.
 */
const GUT_FLORA: readonly string[] = ['salmonella', 'perfringens', 'staph-aureus'];

/**
 * ⭐ What the knife brings (controller-liquidity W10): the edge the view
 * bound, the saw/cleaver that decide how deep the breakdown goes, the
 * block (if one is being worked at) and the cut asked for by WORD.
 */
export interface ButcherKit {
  /** A `bladed` construction, or `null` — the plan refuses `no-blade`. */
  blade: Stuff | null;
  /** The tools in reach: a `saw` opens bone-in joints, a `cleaver` + block chops. */
  tools: readonly Stuff[];
  /** The block worked at, or `null`: nothing left behind to contaminate. */
  block: Stuff | null;
  /** `butcher ewe for loin` — matched against the cut rows' keywords; `''` = all. */
  cut: string;
}

/**
 * Why a butchering is refused — closed, most specific first: everything
 * permanently true of the animal before *it is alive*, the one thing the
 * player can change.
 */
export type ButcherRefusalReason =
  | 'unidentified-species'
  | 'sentient-corpse'
  | 'named-animal'
  | 'no-blade'
  | 'no-yield'
  | 'still-alive'
  | 'no-such-cut';

export type ButcherRefusal = ActRefusal<ButcherRefusalReason, { body: Stuff }>;

/** A line the tools could not reach — still on the carcass. */
export interface ButcherWant {
  /** The cut row's first keyword. */
  stem: string;
  /** What it wants: a saw, or a cleaver and a block. */
  needs: 'saw' | 'cleaver-and-block';
}

/** What the done words need. */
export interface ButcherDressed {
  body: Stuff;
  blade: Stuff;
  /** Every piece laid down. */
  cuts: readonly Stuff[];
  /** Lines still on the carcass for want of a tool. */
  wanting: readonly ButcherWant[];
  /** Lines already off it (their stems). */
  alreadyGone: readonly string[];
}

export type ButcherAnswer = ActAnswer<undefined, ButcherDressed, ButcherRefusal>;

/** A body the butcher's knife asks for its ledger. */
export interface Butcherable {
  /** `lines` — every line of the species' yield, for the spent check. */
  butcherPlanFor(actor: Stuff, lines: readonly CarcassLine[]): Promise<ButcherPlan>;
  /**
   * ⭐⭐ The whole breakdown (controller-liquidity W10, D16): the refusal
   * ladder (D14's sentient gate first), the yield dressed off the body
   * (`Species.dressOut` at the mass it had and the condition it died in),
   * the tool as the depth, the hand deciding joint or trim, the clock
   * started at the kill (D15), the gut on the meat, the block and the
   * blade, the soil, the deed — and the body goes when every line is off
   * it. Instant: the plan's `onComplete` lays the cuts down.
   */
  butcherPlan(actor: Stuff, kit: ButcherKit): Promise<ButcherAnswer>;
}

/**
 * ⭐ **`ButcherableMixin` — the carcass ledger, as a mixin.**
 *
 * IS: a dead body that can be broken down (`Corpse`). IS NOT: a live
 * animal — that is slaughtered first, and then it is butchered; so the
 * mixin is never on `Creature`.
 */
export function ButcherableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ButcherableMixin extends Base implements Butcherable {
    static _mixinName: string = 'ButcherableMixin';
    static _mixinKind = 'protocol' as const;

    public async butcherPlan(actor: Stuff, kit: ButcherKit): Promise<ButcherAnswer> {
      const body = this as unknown as Stuff;
      const refuse = (reason: ButcherRefusalReason): ButcherRefusal => ({
        ok: false,
        reason,
        facts: { body },
      });
      if (!MixinApi.isOrganism(body)) return refuse('unidentified-species');
      // ⚠⚠⚠ Warm the species before asking it anything, and FAIL CLOSED
      // if it will not resolve: `isSentient` answers false for a species
      // that is not resident, so D14 failed OPEN once.
      await SpeciesApi.preloadAnatomy(body);
      const species = body.getSpecies();
      if (!species) return refuse('unidentified-species');
      // ⚠⚠ D14 — not a clade walk: `sentient` is the line this game draws
      // for lawful killing.
      if (SpeciesApi.isSentient(body)) return refuse('sentient-corpse');
      if (body.isAlive() && MixinApi.isNamed(body) && (body.getName() ?? '') !== '') {
        return refuse('named-animal');
      }
      const blade = kit.blade;
      if (blade === null) return refuse('no-blade');
      // ⭐ *Nothing came off*: a body whose materials name no row (D5).
      const anatomy = body.getBody();
      if (!anatomy || anatomy.yieldLines(presentOn(body)).length === 0) return refuse('no-yield');
      // ⚠⚠ LAST — the one thing the player can change.
      if (body.isAlive()) return refuse('still-alive');

      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts: undefined,
        onComplete: () => this.dress(actor, species, blade, kit),
      };
    }

    /** The breakdown itself — the plan's completion. */
    private async dress(
      actor: Stuff,
      species: Species,
      blade: Stuff,
      kit: ButcherKit,
    ): Promise<ActDone<ButcherDressed, ButcherRefusal>> {
      const body = this as unknown as Stuff & Butcherable;
      // ⭐ ONE band read, TWO consequences: how much you get, and how much
      // gut goes on the meat.
      const band: CompetenceBandName = MixinApi.isAdvancing(actor)
        ? await actor.competenceBandFor(BUTCHERY)
        : CompetenceBand.FLOOR;
      const skill = CompetenceBand.rank(band) / Math.max(1, CompetenceBand.rank('expert'));
      const mess = 1 - skill;
      // ⭐⭐ D15 — the clock started at the kill.
      const agedS = MixinApi.isPostmortem(body) ? (body.sinceDeath() ?? 0) : 0;
      const carcassK = Contamination.hostTemperatureK(body);
      const liveKg = MixinApi.isTangible(body) ? body.getMass().rawValue() : 0;

      // ⭐⭐⭐ What comes off DERIVES from the body (organism-biology D5):
      // its present parts' materials, each naming the rows it leaves a
      // carcass as, the outside first. What each line CLAIMS is read off
      // one exemplar per row — a cut its muscles; any other row the
      // materials that named it.
      const anatomy = (body as unknown as Organism).getBody();
      const present = presentOn(body);
      const bodyLines = anatomy?.yieldLines(present) ?? [];
      const claims = new Map<string, readonly string[]>();
      const spec = new Map<string, { cutting: string; difficulty: Difficulty }>();
      const exemplarFor = new Map<string, Stuff>();
      const spent = new Set<string>();
      const dressLines: DressLine[] = [];
      for (const line of bodyLines) {
        const exemplar = await StuffApi.clone<Stuff>(line.row, undefined, { madeFrom: body });
        exemplarFor.set(line.row, exemplar);
        const cut = MixinApi.isCut(exemplar) ? exemplar : null;
        const claimed = cut && cut.getTissues().length ? [...cut.getTissues()] : line.tissues;
        claims.set(line.row, claimed);
        if (cut) spec.set(line.row, { cutting: cut.getCutting(), difficulty: cut.getDifficulty() });
        dressLines.push({
          row: line.row,
          claims: claimed,
          // ⭐ A cut comes off each part that carries it (two shoulders);
          // anything else — a hide, the offal, the bones — is ONE lot.
          parts: cut ? line.parts.length : 1,
          portionKg: cut?.getPortionKg() ?? null,
          // ⭐ A hide and a skeleton are the size the animal IS, not the
          // shape it is in: the outside and bone do not scale by condition.
          conditioned: !line.integument && !claimed.every((t) => MaterialApi.materials().peek(t)?.hasTag('bone')),
          coatKg: line.integument && anatomy
            ? line.tissues.reduce((a, m) => a + anatomy.coatMassKg(m, liveKg, densityOf, present), 0)
            : 0,
        });
      }
      const discard = async (): Promise<void> => {
        for (const [path, ex] of exemplarFor) if (!spent.has(path)) await StuffApi.destruct(ex);
      };

      // ⭐⭐ The carcass's own ledger: the condition it died in, which lines
      // are still on it, the take.
      const ledger = await body.butcherPlanFor(
        actor,
        bodyLines.map((l) => ({ cut: l.row, tissues: claims.get(l.row) ?? [] })),
      );
      const carcass = ledger.facts;
      const fleshPct = carcass.fleshPct ?? UNREMARKABLE_FLESH;
      const dressed = anatomy
        ? species.dressOut({ liveKg, fleshPct, lines: dressLines, body: anatomy, present })
        : [];

      // ⭐ The tool is the depth: a knife the floor, a saw the bone-in
      // joints, a cleaver AND a block the chops.
      const hasSaw = kit.tools.some((t) => MixinApi.isTool(t) && t.hasCapability('saw'));
      const hasCleaver = kit.tools.some((t) => MixinApi.isTool(t) && t.hasCapability('cleaver'));
      const depthAllowed = (cutting: string): boolean =>
        cutting === 'boneless' ||
        (cutting === 'bone-in' && hasSaw) ||
        (cutting === 'chop' && hasCleaver && kit.block !== null);

      // ⭐⭐ `for <cut>`: one line, named by a WORD against the row's keywords.
      const asked = kit.cut.trim().toLowerCase();
      let lines = dressed;
      if (asked) {
        lines = dressed.filter((line) => {
          const ex = exemplarFor.get(line.cut);
          return !!ex && MixinApi.isPerceptible(ex) && ex.getKeywords().some((k) => k.toLowerCase() === asked);
        });
        if (lines.length === 0) {
          await discard();
          return { ok: false, reason: 'no-such-cut', facts: { body } };
        }
      }

      const cuts: Stuff[] = [];
      const wanting: ButcherWant[] = [];
      const alreadyGone: string[] = [];
      const here = MixinApi.isContainable(actor) ? actor.getContainer() : null;
      for (const line of lines) {
        const stem = stemOf(exemplarFor.get(line.cut));
        const depth = spec.get(line.cut)?.cutting ?? 'boneless';
        // ⚠ Already off this body — a carcass reduces.
        if (!carcass.stillOn({ cut: line.cut, tissues: line.tissues })) {
          alreadyGone.push(stem);
          continue;
        }
        // ⭐ A line the tools cannot reach stays ON and is named.
        if (!depthAllowed(depth)) {
          wanting.push({ stem, needs: depth === 'chop' ? 'cleaver-and-block' : 'saw' });
          continue;
        }
        // ⭐⭐⭐ The hand decides JOINT or TRIM.
        const difficulty = spec.get(line.cut)?.difficulty ?? 'standard';
        // ⚠ Joint-or-trim is a CUT's question: a hide, the offal, the bones
        // come off as themselves (a poor hand NICKS a hide instead, D5).
        const clean = !spec.has(line.cut) || !line.tissues.length || CompetenceBand.rank(band) >= handFor(difficulty);
        const rowPath = clean ? line.cut : TRIM_ROW;
        const units = Math.max(1, Math.round(line.units * (0.5 + 0.5 * skill)));
        const kgEach =
          line.kgEach === null ? null : ((line.kgEach * line.units) / units) * (0.5 + 0.5 * skill);
        // ⭐ The exemplar IS unit 1 when the line is taken as authored.
        const reuse = clean ? exemplarFor.get(line.cut) : undefined;
        if (reuse) spent.add(line.cut);
        for (let i = 0; i < units; i++) {
          const cut =
            i === 0 && reuse ? reuse : await StuffApi.clone<Stuff>(rowPath, undefined, { madeFrom: body });
          if (kgEach !== null && MixinApi.isTangible(cut)) {
            cut.setMass(Quantity.of(Math.round(kgEach * 100) / 100, 'kg'));
          }
          if (MixinApi.isCut(cut)) {
            cut.setSpeciesPath(species.getTemplatePath());
            // ⭐⭐ A wound where this cut came from damages the cut.
            if (woundedAt(body, line.tissues, anatomy)) cut.setDamaged(true);
          }
          // ⭐⭐ The skin comes off with what happened to it (D5).
          if (i === 0) {
            const bl = bodyLines.find((l) => l.row === line.cut);
            if (bl && anatomy) flawThePelt(cut, body, anatomy, bl, bodyLines, carcass, band);
          }
          ageAtKill(cut, agedS, carcassK);
          if (MixinApi.isContaminable(body)) body.transferContaminationTo(cut);
          // ⚠⚠ Gut is contaminated at FULL severity whatever the hand.
          spillGut(cut, rowPath.endsWith('/gut') ? 1 : mess);
          if (here && MixinApi.isContainer(here) && MixinApi.isContainable(cut)) {
            await ContainmentApi.move(cut, here);
          }
          cuts.push(cut);
        }
        carcass.take({ cut: line.cut, tissues: line.tissues });
      }
      await discard();

      // ⚠⚠ The BLOCK carries it away — the canonical cross-contamination
      // vector; ⭐ and the blade, if it is a blade that can hold it.
      if (kit.block) spillGut(kit.block, mess);
      spillGut(blade, mess);
      // ⭐ (cleanliness D6) The bloodiest work there is.
      if (MixinApi.isHygienic(actor)) actor.soilFrom(BUTCHER_SOILS, body);
      if (kit.block && MixinApi.isSoilable(kit.block)) {
        kit.block.soil('/platform/dirt/blood', 0.3, body);
        kit.block.soil('/platform/dirt/grease', 0.2);
      }
      if (MixinApi.isAdvancing(actor)) {
        await actor.creditDeed({ discipline: BUTCHERY, difficulty: 'standard', outcome: 'success' });
      }
      // ⭐⭐⭐ The body stays until every line is off it.
      const left = await ledger.onComplete();
      if (left.ok && left.facts.spent) await StuffApi.destruct(body);
      return { ok: true, facts: { body, blade, cuts, wanting, alreadyGone } };
    }

    /** @hook The body's ledger; the default keeps none and is spent at once. */
    public async butcherPlanFor(_actor: Stuff, _lines: readonly CarcassLine[]): Promise<ButcherPlan> {
      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts: { fleshPct: null, stillOn: () => true, take: () => undefined },
        onComplete: () => ({ ok: true, facts: { spent: true } }),
      };
    }
  };
}

/** The competence rank a difficulty needs for the joint rather than trim. */
function handFor(difficulty: Difficulty): number {
  if (difficulty === 'easy' || difficulty === 'trivial') return 0;
  if (difficulty === 'hard' || difficulty === 'formidable') return CompetenceBand.rank('proficient');
  return CompetenceBand.rank('competent');
}

/**
 * ⭐⭐ Was this body wounded where this cut came from? Off the Trauma slice
 * the corpse adopted: a muscle names the part it sits in, a wound sites on
 * a part.
 */
function woundedAt(body: Stuff, tissues: readonly string[], anatomy: Body | null): boolean {
  if (!tissues.length || !MixinApi.isVitals(body)) return false;
  const parts = new Set<string>();
  for (const t of tissues) for (const k of anatomy?.partsCarrying(t) ?? []) parts.add(k);
  if (!parts.size) return false;
  for (const condition of body.getConditions()) {
    if (condition.kind === 'trauma' && parts.has(condition.site)) return true;
  }
  return false;
}

/** A material's density, kg/m³, or 0 when it is not resident. */
function densityOf(path: string): number {
  return MaterialApi.materials().peek(path)?.getDensity().rawValue() ?? 0;
}

/** The parts still on a body (not lost) — the butcher's filter (D5). */
function presentOn(body: Stuff): (partKey: string) => boolean {
  if (!MixinApi.isVitals(body)) return () => true;
  const missing = new Set(body.getMissingParts().map((p) => p.key));
  return (k) => !missing.has(k);
}

/** A wound's mechanism → what it leaves on a pelt (D5); blunt leaves nothing. */
const PELT_FLAW: Readonly<Record<string, FlawKind>> = {
  point: 'holed',
  edge: 'slashed',
  heat: 'burned',
  corrosion: 'burned',
};

/**
 * ⭐⭐ The skin comes off with its history (organism-biology D5): a flaw per
 * wound on a part it covered, sited there (a puncture is the one shipped
 * `holed`, so a holed skin makes a leaking waterskin for free); a slash
 * where a cut was taken before the skin; and the skinner's hand — a nick
 * per band short of the job, on the largest parts first. Derived, never
 * rolled. Only the SKIN's line: feathers and down carry no wounds.
 */
function flawThePelt(
  pelt: Stuff,
  body: Stuff,
  anatomy: Body,
  line: YieldLine,
  all: readonly YieldLine[],
  carcass: ButcherCarcass,
  band: CompetenceBandName,
): void {
  if (!MixinApi.isFlawed(pelt)) return;
  const skinned = line.parts.filter((k) => {
    const skin = anatomy.integumentAt(k)?.skin;
    return !!skin && line.tissues.includes(skin.material);
  });
  if (skinned.length === 0) return;
  if (MixinApi.isVitals(body)) {
    for (const c of body.getConditions()) {
      if (c.kind !== 'trauma' || !skinned.includes(c.site)) continue;
      const kind = PELT_FLAW[c.mechanism ?? ''];
      if (kind) pelt.addFlaw(kind, true, undefined, c.site);
    }
  }
  for (const other of all) {
    if (other.integument || carcass.stillOn({ cut: other.row, tissues: other.tissues })) continue;
    for (const k of other.parts) if (skinned.includes(k)) pelt.addFlaw('slashed', true, undefined, k);
  }
  const short = handFor('standard') - CompetenceBand.rank(band);
  const largest = [...skinned].sort((a, b) => anatomy.partArea(b) - anatomy.partArea(a));
  for (let i = 0; i < short && i < largest.length; i++) pelt.addFlaw('nicked', true, undefined, largest[i]);
}

/** The cut row's own first keyword — what to call it in a sentence. */
function stemOf(exemplar: Stuff | undefined): string {
  if (exemplar && MixinApi.isPerceptible(exemplar)) {
    const kw = exemplar.getKeywords();
    if (kw.length) return kw[0]!;
  }
  return 'a cut';
}

/**
 * ⭐⭐ Stamp the cut with the state the meat has ALREADY earned lying where
 * it fell — a knife must not reset a clock running since the death.
 */
function ageAtKill(cut: Stuff, agedS: number, carcassK: number): void {
  if (!MixinApi.isFresh(cut) || agedS <= 0) return;
  const material = MixinApi.isTangible(cut) ? cut.getMaterial() : null;
  cut.setMicrobialLoad(Freshness.advance(Freshness.inoculum(), agedS, material, carcassK));
}

/**
 * Open the gut, more or less badly — `mess` is `1 − skill`. ⚠ Almost none
 * is not none: the answer to this hazard is cooking and cold, never a good
 * enough butcher.
 */
function spillGut(onto: Stuff, mess: number): void {
  if (!MixinApi.isContaminable(onto)) return;
  const severity = Math.max(0.15, mess);
  for (const key of GUT_FLORA) onto.contaminate(key, severity);
}
