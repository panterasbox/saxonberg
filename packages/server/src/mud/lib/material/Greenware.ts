/**
 * GreenwareMixin — ⭐⭐ **an unfired clay body, and the water in it**
 * (ceramics M4, D13, R2).
 *
 * A shaped piece of clay is GREEN until it is fired, and while it is green
 * its water decides everything: whether it can be trimmed, joined or
 * stamped (leather-hard), whether it can go in a kiln (bone-dry), and
 * whether the weather ruins it — rain SLUMPS a soft piece, frost BURSTS a
 * wet one, drying too fast CRACKS a fat clay. Green ware re-wets the way
 * turf does: `MoistureMixin` is the water, and every composer composes
 * it itself (Turf's dries-but-does-not-rot shape — nothing here tabulates a
 * spoil activation energy, so `lint:perishable` has nothing to ask).
 *
 * ⭐ **The state is DRYNESS, read against the air**: `d = (1 − moisture) ÷
 * (1 − the air's equilibrium moisture)` — plastic below
 * `green.leatherAt` (0.3), leather-hard to `green.boneDryAt` (0.85), bone-dry past it. So *bone-dry* means *as dry as this air will let
 * it get*: a piece in a damp shed takes longer to reach it, and it reaches it.
 *
 * ⭐⭐ **Green ends at firing (R2).** Every read answers only while the body
 * is still its plastic clay (its material carries `plastic`) and its heat
 * history has converted nothing. After the first rung the mixin is inert:
 * a fired piece's relation to water is its porosity, its weep and its
 * seep (`Faced`), never this.
 *
 * Composed by the kernel (two packs with no common ancestor need it:
 * ceramics' ware, bricks and pots, and dairying's setting pan).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Wet } from '../wetness/Wet';
import type { MarkupAugmenter } from '../../api/mml';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';
import { Quantity } from '../quantity';
import { DefaultCalendar } from '../time/DefaultCalendar';
import { CarvableMixin } from '../craft/Carvable';
import type { Carvable, CarveRequest } from '../craft/Carvable';
import { ImpressibleMixin } from '../craft/Impressible';
import type { Impressible } from '../craft/Impressible';
import type { ActOutcome, ActPlan, ActRefusal } from '../craft/ActPlan';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { AppSettingKeys } from '../config/AppSettings';
import type { Moist } from './Moisture';
import type Material from './Material';

/** How wet a green piece is. */
export type GreenState = 'plastic' | 'leather-hard' | 'bone-dry';

/** What the weather did to it. */
export type GreenRuin = 'slumped' | 'shattered' | null;

/** What a carve word does to a green piece. */
const CARVINGS: Readonly<Record<string, { line: string; keep: number }>> = {
  foot: { line: 'a turned foot', keep: 0.95 },
  trim: { line: 'a trimmed wall', keep: 0.95 },
  // ⭐ `design`, not `pattern`: a pattern is the founder's shape to cast from
  // (`carve pattern of <thing> from <board>`) — one word, one thing.
  design: { line: 'a design cut into it', keep: 0.98 },
};

export interface Greenware extends Carvable, Impressible {
  /** Still unfired clay? (R2 — false from the first rung on.) */
  isGreen(): boolean;
  /** `plastic` · `leather-hard` · `bone-dry`, or `null` once fired. */
  greenState(): GreenState | null;
  /** What the weather did to it, if anything. */
  getRuin(): GreenRuin;
  /** What burst a shattered piece — ice in a frost, or steam in a kiln. */
  getBurstBy(): 'frost' | 'steam' | null;
  /** Trim, join and stamp ask for leather-hard. */
  canTrim(): boolean;
  canJoin(): boolean;
  canStamp(): boolean;
  /** Only a bone-dry piece survives the kiln — a wet one bursts as steam. */
  isFireable(): boolean;
  /** Bring the weather's effects current (called on every read above). */
  reconcileGreen(): void;
  /** What has been worked on it at leather-hard (a turned foot …). */
  getWorkedFeatures(): readonly string[];
}

/** A person's (or anything's) name for a mark, from an identity path. */
function markName(identity: string): string | null {
  if (!identity) return null;
  const who = StuffApi.findByTemplatePath<Stuff>(identity);
  return who ? who.getPresentation() : null;
}

function greenDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function greenNowS(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

/** The words a look adds — the state, or the ruin. */
const greenAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isGreenware(host)) return text;
  const ruin = host.getRuin();
  const state = host.greenState();
  let line = '';
  if (ruin === 'slumped') line = 'Rain has got at it: it has slumped out of its shape.';
  else if (ruin === 'shattered') {
    // ⭐ By its cause: a damp piece put in a kiln bursts on its steam, and
    // reading "the frost" off a crock that never saw one is the fiction
    // contradicting itself (ceramics drive C, run 36).
    line =
      host.getBurstBy() === 'steam'
        ? 'It went into the fire still damp, and the steam has burst it apart.'
        : 'It froze wet, and the frost has burst it apart.';
  }
  else if (state === 'plastic') line = 'It is green — soft, wet clay that takes a thumbprint.';
  else if (state === 'leather-hard') line = 'It is green and leather-hard: firm enough to trim, still cool and damp.';
  else if (state === 'bone-dry') line = 'It is green and bone-dry: pale, light, and ready for the kiln.';
  const extra: string[] = [];
  const work = host.getWorkedFeatures();
  if (work.length > 0) extra.push(`It has ${work.join(' and ')}.`);
  // ⭐ Once fired — when (ceramics S5). Whose mark it bears is the
  // `MarkedMixin` device's own line, not this one.
  const rec = MixinApi.isThermal(host) ? host.getKineticRecord() : null;
  const firedAt = state === null && rec !== null && rec.lastTransitionAtS !== null ? rec.lastTransitionAtS : null;
  if (firedAt !== null) {
    extra.push(`It was fired ${DefaultCalendar.singleton().formatDate(Quantity.of(firedAt, 's'))}.`);
  }
  // ⭐ Fired somewhere else — an import off the general store's shelf has no
  // firing here to describe, and read as nothing at all (drive C, run 37).
  // Its body is still plain to see.
  if (state === null && (rec === null || rec.lastTransitionAtS === null) && MixinApi.isTangible(host)) {
    const mat = host.getMaterial();
    const body = mat?.getName();
    // A piece the fire reached but never turned is still its clay: say that,
    // not "fired alluvial clay" (drive C, run 39).
    if (body) {
      extra.unshift(
        mat?.hasTag('plastic')
          ? `It has been in the fire, but not long or hot enough to turn: it is still ${body}.`
          : `It is fired ${body}.`,
      );
    }
  }
  const all = [line, ...extra].filter((l) => l !== '').join(' ');
  if (all === '') return text;
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export function GreenwareMixin<TBase extends MixinConstructor<Stuff & Wet & Moist>>(Base: TBase) {
  // ⭐ A green piece is CARVED (`CarvableMixin`) — trim, turn a foot, cut a
  // design — and takes an IMPRESSION (`ImpressibleMixin`) — a maker's mark —
  // and so affords `carve` and `impress` to whoever is holding it or beside
  // it. Its own plan asks for the edge. Without the affordance `carve foot
  // on mug` was "I don't understand" (the ceramics drive).
  class GreenwareMixin extends CarvableMixin(ImpressibleMixin(Base)) implements Greenware {
    static _mixinName = 'GreenwareMixin';

    static markupAugmenters: MarkupAugmenter[] = [greenAugmenter];

    static fieldMeta: FieldMeta = {
      greenRuin: { persistent: true, runtimeState: true },
      greenBurstBy: { persistent: true, runtimeState: true },
      greenCheckedS: { persistent: true, runtimeState: true },
      greenLastDryness: { persistent: true, runtimeState: true },
      greenLastWetness: { persistent: true, runtimeState: true },
      greenWetted: { persistent: true, runtimeState: true },
      workedFeatures: { persistent: true, runtimeState: true },
    };

    /**
     * What was worked on it at leather-hard, in words — a turned foot, a
     * trimmed wall, a design. ⭐ Not green STATE: the piece's worked features,
     * which is why they survive firing (a fired mug still has its foot).
     */
    public workedFeatures: string[] = [];

    public getWorkedFeatures(): readonly string[] {
      return this.workedFeatures;
    }

    /**
     * ⭐ The kernel's carve for a green piece (ceramics W4): trim the wall,
     * turn a foot, cut a design — at LEATHER-HARD only. Too soft, it
     * smears; too dry, it cracks. Credits pottery.
     */
    public async carvePlanFor(req: CarveRequest): Promise<ActPlan | ActRefusal> {
      // ⭐ Once it is not green, the act is the HOST's own, if it has one (a
      // clay mould carves a riser like any mould) — green ware must never
      // shadow it for life (B99).
      if (!this.isGreen()) {
        const host = (Base.prototype as { carvePlanFor?: (r: CarveRequest) => Promise<ActPlan | ActRefusal> })
          .carvePlanFor;
        if (host) return host.call(this, req);
      }
      const self = this as unknown as Stuff;
      const word = req.word.trim().toLowerCase();
      const cut = CARVINGS[word];
      if (cut === undefined) {
        return {
          ok: false,
          reason: 'not-carvable',
          line: Mml.compose`You can trim ${Mml.thing(self)}, turn a foot on it, or cut a design into it.`,
        };
      }
      const refused = this.leatherHardRefusal('trim');
      if (refused !== null) return refused;
      if (req.knife === null) {
        return {
          ok: false,
          reason: 'no-edge',
          line: Mml.compose`You need an edge to trim with — any knife will do.`,
        };
      }
      const actor = req.actor;
      return {
        ok: true,
        durationMs: 3 * 60 * 1000,
        effortW: 120,
        beginSelf: Mml.compose`You set ${Mml.thing(self)} upside down and pare at it with ${Mml.thing(req.knife)}.`,
        beginPeers: Mml.compose`${Mml.actor(actor)} pares at ${Mml.thing(self)}.`,
        onComplete: () => {
          if (self.isDestroyed()) return;
          if (MixinApi.isTangible(self)) {
            self.setMass(Quantity.of(self.getMass().rawValue() * cut.keep, 'kg'));
          }
          if (!this.workedFeatures.includes(cut.line)) this.workedFeatures = [...this.workedFeatures, cut.line];
          if (!actor.isDestroyed()) {
            MessageApi.scene(actor)
              .topic('act.deed')
              .toSelf(Mml.compose`The shavings curl away. ${Mml.thing(self)} has ${cut.line} now.`)
              .send();
            if (MixinApi.isAdvancing(actor)) {
              void actor.creditDeed({ discipline: 'pottery', difficulty: 'standard', outcome: 'success' });
            }
          }
        },
      };
    }

    /**
     * ⭐ A leather-hard piece takes a MARK (ceramics S5): the stamp's own
     * identity — whose mark it is — pressed into the base. The stamp's face
     * bears a device (`MarkedMixin`) and the piece takes it; a tool that
     * bears none leaves only a dent.
     */
    public async takeImpression(pattern: Stuff, actor: Stuff): Promise<ActOutcome | ActRefusal> {
      // ⭐ The host's own impression once it is not green (a clay mould takes
      // a pattern like any mould) — B99.
      if (!this.isGreen()) {
        const host = (Base.prototype as {
          takeImpression?: (p: Stuff, a: Stuff) => Promise<ActOutcome | ActRefusal>;
        }).takeImpression;
        if (host) return host.call(this, pattern, actor);
      }
      const self = this as unknown as Stuff;
      const refused = this.leatherHardRefusal('stamp');
      if (refused !== null) return refused;
      if (!MixinApi.isMarked(self)) {
        return { ok: false, reason: 'not-markable', line: Mml.compose`There is nowhere on ${Mml.thing(self)} a mark would mean anything.` };
      }
      // ⭐ The tool's face bears a device; pressing it copies the device into
      // the clay (`MarkedMixin`). Anything else leaves only a dent.
      const identity = MixinApi.isMarked(pattern) ? self.takeDeviceFrom(pattern) : '';
      if (identity === '') {
        return {
          ok: false,
          reason: 'no-mark',
          line: Mml.compose`${Mml.thing(pattern)} leaves a dent, and no mark anybody would know.`,
        };
      }
      const who = markName(identity) ?? 'its maker';
      return {
        ok: true,
        line: Mml.compose`You press ${Mml.thing(pattern)} into the base of ${Mml.thing(self)}. It takes ${who}'s mark, sharp and clean.`,
      };
    }

    /** `null` when the piece is leather-hard and sound; a refusal otherwise. */
    private leatherHardRefusal(act: 'trim' | 'stamp'): ActRefusal | null {
      const self = this as unknown as Stuff;
      if (this.greenRuin !== null) {
        // ⭐ The way out exists (B99): it is still clay, and a temper pit takes
        // it back — put it in with water and tread it.
        return {
          ok: false,
          reason: 'ruined',
          line: Mml.compose`${Mml.thing(self)} is ruined. It is still clay, though — put it back in a temper pit and tread it in again.`,
        };
      }
      const state = this.greenState();
      if (state === null) {
        return { ok: false, reason: 'fired', line: Mml.compose`${Mml.thing(self)} has been fired hard. Nothing will ${act} it now.` };
      }
      if (state === 'plastic') {
        return {
          ok: false,
          reason: 'too-soft',
          line: Mml.compose`${Mml.thing(self)} is too soft to ${act} — it would smear. Let it firm up to leather-hard.`,
        };
      }
      if (state === 'bone-dry') {
        return {
          ok: false,
          reason: 'too-dry',
          line: Mml.compose`${Mml.thing(self)} is bone-dry — it would crack. That is done at leather-hard.`,
        };
      }
      return null;
    }

    public greenRuin: GreenRuin = null;
    public greenBurstBy: 'frost' | 'steam' | null = null;
    public greenCheckedS = 0;
    public greenLastDryness = 0;
    public greenLastWetness = 0;
    /** Water that reached it (rain, a pour) since the last look, in saturation. */
    public greenWetted = 0;

    /**
     * ⭐ The rain is an EVENT on the piece, not a difference of two reads: a
     * storm that soaks a green brick and passes, and the brick drying back
     * before anyone looks, still slumped it. Comparing wetness at the two
     * reads missed exactly that (the ceramics drive, run 16: a storm on the
     * open yard, the brick read two hours later, unslumped).
     */
    public wet(delta: number): void {
      super.wet(delta);
      if (delta > 0 && this.greenRuin === null) this.greenWetted += delta;
    }

    /** Reentry guard: a reconcile reads the body, which may reconcile. */
    private _greenReconciling = false;

    public isGreen(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return false;
      const mat = self.getMaterial();
      if (mat === null || !mat.hasTag('plastic')) return false;
      if (MixinApi.isThermal(self)) {
        const rec = self.getKineticRecord();
        if (rec !== null && Object.values(rec.changes).some((c) => c.extent > 0)) return false;
      }
      return true;
    }

    public greenState(): GreenState | null {
      this.reconcileGreen();
      if (!this.isGreen()) return null;
      const d = (this as unknown as Moist).dryness();
      if (d >= greenDial(AppSettingKeys.greenBoneDryAt, 0.85)) return 'bone-dry';
      if (d >= greenDial(AppSettingKeys.greenLeatherAt, 0.3)) return 'leather-hard';
      return 'plastic';
    }

    public getRuin(): GreenRuin {
      this.reconcileGreen();
      return this.greenRuin;
    }

    public getBurstBy(): 'frost' | 'steam' | null {
      this.reconcileGreen();
      return this.greenBurstBy;
    }

    public canTrim(): boolean {
      return this.greenRuin === null && this.greenState() === 'leather-hard';
    }

    public canJoin(): boolean {
      return this.canTrim();
    }

    public canStamp(): boolean {
      return this.canTrim();
    }

    public isFireable(): boolean {
      return this.greenRuin === null && this.greenState() === 'bone-dry';
    }

    /**
     * ⭐ The weather since the last look, read off the piece's own record:
     *
     *  - **slumped** — its wetness rose (rain on an open yard) while it was
     *    green: a soft piece loses its shape;
     *  - **shattered** — its temperature went below freezing while it still
     *    held water (dryness under bone-dry), or above boiling (a wet piece
     *    in a kiln — the steam burst, no special case);
     *
     * ⭐ Drying too fast is not here: it is the water model's rule for every
     * drying solid (`Moist.dryingCrackRisk`, `cure.crackRate`), and a
     * green piece's risk is its clay's (below) — a pot and a board check by
     * one rule.
     */
    public reconcileGreen(): void {
      if (this._greenReconciling || this.greenRuin !== null) return;
      const self = this as unknown as Stuff;
      if (!this.isGreen()) return;
      const nowS = greenNowS();
      if (nowS === null) return;
      this._greenReconciling = true;
      try {
        const dry = (this as unknown as Moist).dryness();
        const wet = MixinApi.isWet(self) ? self.getWetness() : 0;
        if (this.greenCheckedS === 0) {
          this.greenCheckedS = nowS;
          this.greenLastDryness = dry;
          this.greenLastWetness = wet;
          this.greenWetted = 0;
          return;
        }
        const fromS = this.greenCheckedS;
        const dtH = (nowS - fromS) / 3600;
        if (!(dtH > 0)) return;
        // The temperature it went through, off its own curve.
        let minK = Number.POSITIVE_INFINITY;
        let maxK = Number.NEGATIVE_INFINITY;
        if (MixinApi.isThermal(self)) {
          for (const smp of self.temperatureTrajectory(fromS, nowS).samples(8)) {
            if (smp.value < minK) minK = smp.value;
            if (smp.value > maxK) maxK = smp.value;
          }
        }
        const wetPiece = Math.min(dry, this.greenLastDryness) < greenDial(AppSettingKeys.greenBoneDryAt, 0.85);
        const wetting = Math.max(wet - this.greenLastWetness, this.greenWetted);
        if (wetting > greenDial(AppSettingKeys.greenSlumpWetting, 0.15)) {
          this.greenRuin = 'slumped';
        } else if (wetPiece && (minK < 273.15 || maxK > 373.15)) {
          this.greenRuin = 'shattered';
          this.greenBurstBy = minK < 273.15 ? 'frost' : 'steam';
          // ⚠ No crack flaw as well: the ruin IS the fact (B99) — it read
          // twice in `look` and lowered the condition of a ruined thing.
        }
        this.greenCheckedS = nowS;
        this.greenLastDryness = dry;
        this.greenLastWetness = wet;
        this.greenWetted = 0;
      } finally {
        this._greenReconciling = false;
      }
    }

    /**
     * How readily this piece cracks as it dries — the ONE rule over its
     * makeup (`MaterialApi.dryingCrackRiskOf`, the rule `analyze clay`
     * reads). A piece that carries no makeup is a middling clay.
     */
    public dryingCrackRisk(): number {
      if (!this.isGreen()) return 0;
      const self = this as unknown as Stuff;
      if (!MixinApi.isComposition(self)) return 0.5;
      return MaterialApi.dryingCrackRiskOf(self.effectiveMakeup());
    }
  }
  return GreenwareMixin;
}
