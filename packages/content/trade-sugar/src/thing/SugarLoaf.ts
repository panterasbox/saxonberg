/**
 * A sugar loaf — ⭐ what a cone of strike sets into once its molasses has
 * drained (sugar W2). One loaf, three grades: the head, the middle and the
 * foot are read separately, because a loaf is never one quality — the
 * foot is where the last of the molasses sat. (Claying, W4, is what lifts
 * the head toward white.)
 *
 * `cut loaf with nips` breaks it into its three pieces, each stamped with
 * its own band (sugar D6: nipping is `cut`); `mill` a piece at a quern
 * and it is loose sugar of that grade.
 */

import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import { PercolatingMixin } from '@saxonberg/server/mud/lib/material/Percolating';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Cuttable, CutRequest } from '@saxonberg/server/mud/lib/craft/Cuttable';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { Grade, type GradeBand } from '@saxonberg/server/mud/lib/craft/Grade';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';

const PIECE = '/trade/sugar/thing/sugar-piece';
const NIP_MS = 20_000;
/** The three parts of a loaf, head first. */
const PARTS = ['head', 'middle', 'foot'] as const;

/** What sugar of a band looks like. */
function colourOf(band: string): string {
  if (band === 'masterful' || band === 'exceptional') return 'white';
  if (band === 'fine') return 'pale';
  if (band === 'fair') return 'brown';
  return 'muscovado';
}

/** `look` reads the loaf's colour, head to foot. */
function loafAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter || !(host instanceof SugarLoaf)) return text;
  const line = `It is ${host.colourLine()}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

const MOLASSES = '/trade/sugar/idea/material/molasses';
/** The share of a loaf's mass the claying water carries out as molasses. */
const CLAY_WASHES = 0.12;

export default class SugarLoaf extends PercolatingMixin(Provision) implements Cuttable {
  static markupAugmenters: MarkupAugmenter[] = [loafAugmenter];

  /**
   * `clay` and `cut` are afforded by the LOAF: nothing else in a curing
   * house confers `cut`, and nips are a plain Tool (the drive found
   * "I don't understand 'cut'" beside a loaf and a pair of nips).
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/sugar/cmd/sugar/clay.yaml', 'platform/cmd/crafting/cut.yaml'],
    peers: ['trade/sugar/cmd/sugar/clay.yaml', 'platform/cmd/crafting/cut.yaml'],
  };

  /** Game-days the claying water takes to reach the foot (W4). */
  public clayDays = 10;
  /** Litres of water a lump of wet clay gives up into the loaf. */
  public clayWaterL = 2;

  static fieldMeta: FieldMeta = {
    clayDays: { persistent: true, authorable: true },
    clayWaterL: { persistent: true, authorable: true },
  };

  public override percolationDays(): number {
    return this.clayDays;
  }

  /**
   * ⭐ Head, middle and foot, each a grade band — read off how far the
   * claying water has got (sugar W4). Unclayed, the crystals are filmed in
   * their own molasses: muscovado throughout, two bands under the loaf's
   * grade. As the water passes a third of the way the head washes white
   * (a band above), past two-thirds the middle comes clean (the loaf's
   * own), and when it is through the foot reads brown (a band under).
   */
  public getBands(): GradeBand[] {
    const base = MixinApi.isGraded(this) ? this.getGrade().getOrdinal() : 1;
    const reach = this.getReach();
    const at = (n: number): GradeBand => Grade.fromOrdinal(n).getBand();
    return [
      at(reach >= 1 / 3 - 1e-9 ? base + 1 : base - 2),
      at(reach >= 2 / 3 - 1e-9 ? base : base - 2),
      at(reach >= 1 - 1e-9 ? base - 1 : base - 2),
    ];
  }

  /** The loaf in words: its colour, head to foot. */
  public colourLine(): string {
    const [head, middle, foot] = this.getBands().map(colourOf);
    if (head === foot && head === middle) return `${head} from head to foot`;
    return `${head} at the head, ${middle} through the middle and ${foot} at the foot`;
  }

  /**
   * Clay the loaf: a lump of wet clay on its base, whose water works down
   * through it over `clayDays` (sugar W4, the kernel's percolation).
   */
  public clay(lump: Stuff): { ok: boolean; line: string } {
    if (!MixinApi.isTangible(lump) || !(lump.getMaterial()?.getName() ?? '').includes('clay')) {
      return { ok: false, line: 'That is not clay.' };
    }
    if (this.getPercolantL() > 0 || this.getReach() > 0) {
      return { ok: false, line: 'It has been clayed already.' };
    }
    if (MixinApi.isStackable(lump) && lump.getQuantity() > 1) {
      lump.setQuantity(lump.getQuantity() - 1);
    } else {
      void StuffApi.destruct(lump);
    }
    this.receivePercolant(this.clayWaterL);
    return {
      ok: true,
      line: 'You pack wet clay on the base of the loaf. Its water will work down through it over the days to come.',
    };
  }

  /** ⭐ The water carries molasses out as it goes, into the pot below. */
  public override onPercolated(from: number, to: number): void {
    const self = this as unknown as Stuff;
    if (!MixinApi.isTangible(self) || !(to > from)) return;
    const kg = self.getMass().rawValue() * CLAY_WASHES * (to - from);
    self.setMass(Quantity.of(Math.max(0, self.getMass().rawValue() - kg), 'kg'));
    const into = this.percolatesInto();
    const molasses = StuffApi.findByTemplatePath<Material>(MOLASSES);
    if (!into || !molasses) return;
    const held = into.getBulkMaterial('interior');
    if (held !== null && held.getTemplatePath() !== MOLASSES) return;
    if (held === null) into.setBulkMaterial('interior', molasses);
    const litres = (kg / molasses.getDensity().rawValue()) * 1000;
    into.setBulkAmount('interior', Quantity.of(into.getBulkAmount('interior').rawValue() + litres, 'L'));
  }

  public async cutPlan(req: CutRequest): Promise<ActPlan | ActRefusal> {
    const nips = req.tools.find((t) => MixinApi.isTool(t) && t.hasCapability('nipping'));
    if (!nips) {
      return {
        ok: false,
        reason: 'no-nips',
        line: Mml.compose`A sugar loaf is too hard to cut with that — it wants sugar nips.`,
      };
    }
    const loaf = this as unknown as Stuff;
    const actor = req.actor;
    return {
      ok: true,
      durationMs: NIP_MS,
      effortW: 300,
      beginSelf: Mml.compose`You set the nips to ${Mml.thing(loaf)} and start breaking it down.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} nips at a sugar loaf.`,
      onComplete: () => {
        void nipLoaf(loaf as Stuff & SugarLoaf, actor);
      },
    };
  }
}

/**
 * ⚠ The completion is a module function over the loaf, never `this` on a
 * controller: a cut runs for game-seconds after the verb returned.
 */
async function nipLoaf(loaf: Stuff & SugarLoaf, actor: Stuff): Promise<void> {
  if (loaf.isDestroyed()) return;
  const bands = loaf.getBands();
  const mass = MixinApi.isTangible(loaf) ? loaf.getMass().rawValue() : 0;
  const material = MixinApi.isTangible(loaf) ? loaf.getMaterial() : null;
  const into = MixinApi.isContainer(actor)
    ? actor
    : MixinApi.isContainable(loaf)
      ? (loaf.getContainer() as Stuff | null)
      : null;
  const pieces: string[] = [];
  for (let i = 0; i < PARTS.length; i++) {
    const piece = await StuffApi.clone(PIECE).catch(() => null);
    if (!piece) continue;
    if (MixinApi.isTangible(piece)) {
      if (material) piece.setMaterial(material);
      piece.setMass(Quantity.of(mass / PARTS.length, 'kg'));
    }
    if (MixinApi.isGraded(piece)) piece.setGrade(Grade.of(bands[i]!));
    if (into && MixinApi.isContainer(into) && MixinApi.isContainable(piece)) {
      ContainmentApi.move(piece, into);
    }
    pieces.push(`the ${PARTS[i]} (${colourOf(bands[i]!)})`);
  }
  StuffApi.destruct(loaf);
  MessageApi.scene(actor)
    .topic('act.deed')
    .toSelf(Mml.compose`The loaf breaks into three: ${pieces.join(', ')}.`)
    .toPeers(Mml.compose`${Mml.actor(actor)} breaks a sugar loaf into pieces.`)
    .send();
}
