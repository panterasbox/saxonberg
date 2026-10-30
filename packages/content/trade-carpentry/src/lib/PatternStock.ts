/**
 * PatternStockMixin — ⭐ wood a founder's pattern can be carved from
 * (ceramics D23). `carve pattern of <thing> from <board> [for <metal>]`:
 * the STOCK plans the carving — the controller is dumb — and what comes out
 * is a {@link Pattern} carrying the thing's impression cut OVERSIZE by the
 * metal's own shrinkage, so a cast from it shrinks back to true.
 *
 * ⭐ The shrink is DERIVED (`Material.castShrinkage` — its thermal expansion
 * over the fall from its melting point to a room), never a table of
 * pattern-maker's rules: bronze's comes out about a sixtieth.
 *
 * Substrate only this pack composes (a board and a riven blank), so it is
 * the pack's own `lib/` — the kernel's rule applied to a pack. A mixin and
 * not a base class: the next pattern stocks (wax, plaster) are not wood.
 *
 * ⭐ It answers only a PATTERN (`null` for any other word), so the joiner's
 * own `carve peg on board` still reaches the recipe path. Green stock is
 * refused — it moves as it dries, and the cast would come out undersize.
 * The pattern is graded like every carving: weakest link, so a checked
 * board makes a pattern no better than fair.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { CarvableMixin } from '@saxonberg/server/mud/lib/craft/Carvable';
import type { CarveRequest } from '@saxonberg/server/mud/lib/craft/Carvable';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MaterialApi } from '@saxonberg/server/mud/api/material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import Pattern from '../thing/Pattern';

/** The pattern row a carving mints. */
const PATTERN_ROW = '/trade/carpentry/thing/pattern';
/** Any edge carves a pattern. */
const CUTTING = 'cutting';
/** A pattern is a careful afternoon's work — an hour of game time. */
const PATTERN_MS = 60 * 60 * 1000;

export function PatternStockMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  // ⭐ Pattern stock is CARVED (`CarvableMixin`) — it plans the carving.
  return class PatternStockMixin extends CarvableMixin(Base) {
    static _mixinName = 'PatternStockMixin';

    /** The metal a word names, among the metals — or `null`. */
    protected metalNamed(word: string): Material | null {
      const w = word.trim().toLowerCase();
      if (w === '') return null;
      for (const m of MaterialApi.findByTag('metal')) {
        if (m.getName().toLowerCase() === w || m.hasKeyword(w)) return m;
      }
      return null;
    }

    /**
     * ⭐ Plan a pattern: the thing's shape, cut a shade oversize for the
     * metal named (or the thing's own metal), from this piece of wood.
     * `null` for any word but a pattern: that carving is not this stock's
     * to plan (the recipe path's).
     */
    public async carvePlanFor(req: CarveRequest): Promise<ActPlan | ActRefusal | null> {
      const self = this as unknown as Stuff;
      if (!/^pattern/.test(req.word.trim().toLowerCase())) return null;
      const of = req.of ?? null;
      if (of === null) {
        return {
          ok: false,
          reason: 'not-carvable',
          line: Mml.compose`From ${Mml.thing(self)} you can carve a pattern of something — say \`carve pattern of <thing>\`.`,
        };
      }
      if (of === self) {
        return { ok: false, reason: 'self-target', line: Mml.compose`You cannot carve a pattern of the wood you are carving it from.` };
      }
      // ⭐ Green wood moves as it dries: a pattern cut from it shrinks after
      // it is cut, and the cast comes out short by exactly what it lost.
      if (MixinApi.isSeasoning(self) && self.isGreen()) {
        return {
          ok: false,
          reason: 'green-stock',
          line: Mml.compose`${Mml.thing(self)} is still green. Wood moves as it dries; a pattern cut from it won't hold its size. Let it season first.`,
        };
      }
      const knife = req.knife;
      if (knife === null || !MixinApi.isTool(knife) || !knife.hasCapability(CUTTING)) {
        return {
          ok: false,
          reason: 'no-edge',
          line: Mml.compose`You have no edge to carve with. Anything that offers a cutting edge will do.`,
        };
      }
      const shape = MixinApi.isTangible(of) ? of.leaveImpression(WorldClockApi.getNow().rawValue()) : null;
      if (shape === null) {
        return { ok: false, reason: 'no-shape', line: Mml.compose`${Mml.thing(of)} has no shape a pattern could copy.` };
      }
      const own = MixinApi.isTangible(of) ? of.getMaterial() : null;
      const metal =
        this.metalNamed(req.forWord ?? '') ?? (own !== null && own.hasTag('metal') ? own : null);
      if (metal === null) {
        return {
          ok: false,
          reason: 'no-metal',
          line: Mml.compose`Cut for which metal? A pattern is cut oversize by what the metal shrinks — say \`carve pattern of ${Mml.thing(of)} for bronze\`.`,
        };
      }
      const allowance = metal.castShrinkage();
      const grow = Math.pow(1 + allowance, 3);
      const wood = MixinApi.isTangible(self) ? self.getMaterial() : null;
      const woodDensity = wood?.getDensity().rawValue() ?? 0;
      const patternKg = (shape.volumeL / 1000) * grow * woodDensity;
      const stockKg = MixinApi.isTangible(self)
        ? self.getMass().rawValue()
        : 0;
      if (!(woodDensity > 0) || patternKg > stockKg) {
        return {
          ok: false,
          reason: 'too-small',
          line: Mml.compose`${Mml.thing(self)} is too small to carve a pattern of ${Mml.thing(of)} from.`,
        };
      }
      const actor = req.actor;
      const metalName = metal.getName();
      return {
        ok: true,
        durationMs: PATTERN_MS,
        effortW: 150,
        beginSelf: Mml.compose`You lay ${Mml.thing(of)} on ${Mml.thing(self)}, scribe round it with a shrink rule for ${metalName}, and begin to carve.`,
        beginPeers: Mml.compose`${Mml.actor(actor)} measures and carves at ${Mml.thing(self)}.`,
        // ⭐ Returned, not launched: a throw here reaches the engagement's
        // guarded root and is reported, never an unhandled rejection.
        onComplete: async () => {
          if (self.isDestroyed() || actor.isDestroyed()) return;
          // Where it lands, checked before anything is minted or spent.
          if (!MixinApi.isContainer(actor)) {
            throw new TypeError('PatternStock: the carver cannot hold the pattern');
          }
          // ⚠ The row is this pack's own: a pattern that is not a `Pattern`
          // is an authoring error, and it is said, not skipped.
          const pattern = await StuffApi.clone<Stuff>(PATTERN_ROW, undefined, { madeFrom: [self] });
          if (!(pattern instanceof Pattern)) {
            throw new TypeError(`PatternStock: '${PATTERN_ROW}' did not mint a Pattern`);
          }
          pattern.setHeldImpression({
            ...shape,
            volumeL: shape.volumeL * grow,
            allowance,
          });
          const form = shape.formDescription.replace(/^(a|an)\s+/i, '');
          pattern.setShortDescription(`pattern of ${shape.formDescription}`);
          const kw = new Set(pattern.getKeywords());
          for (const w of form.split(/\s+/)) if (w) kw.add(w);
          pattern.setKeywords([...kw]);
          if (wood !== null) {
            pattern.setMaterial(wood);
            pattern.setMass(Quantity.of(patternKg, 'kg'));
          }
          // ⭐ Weakest link, as every carving is graded: the stock's grade
          // (its making faults already in it — a checked board is fair).
          const stockGrade = MixinApi.isGraded(self) ? [self.getGrade()] : [];
          pattern.stamp({
            maker: actor.getIdentityPath() ?? '',
            grade: Grade.deriveAtFixedControl(stockGrade),
            recipe: '',
            craftedAt: WorldClockApi.getNow().rawValue(),
          });
          // To hand first; then the stock is spent — one piece of it.
          ContainmentApi.move(pattern as Stuff & Containable, actor as Stuff & Container);
          if (MixinApi.isStackable(self) && self.getQuantity() > 1) {
            self.setQuantity(self.getQuantity() - 1);
          } else {
            await StuffApi.destruct(self);
          }
          await PersistableApi.captureHostOf(pattern);
          if (MixinApi.isAdvancing(actor)) {
            await actor.creditDeed({ discipline: 'carpentry', difficulty: 'standard', outcome: 'success' });
          }
          if (!MixinApi.isSensor(actor)) return;
          MessageApi.scene(actor)
            .topic('act.deed')
            .toSelf(
              Mml.compose`You blow the last shavings off ${Mml.thing(pattern)}: the shape of ${shape.formDescription}, a shade fat all over — by what ${metalName} will shrink as it cools.`,
            )
            .send();
        },
      };
    }
  };
}
