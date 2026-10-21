/**
 * GreenwareMixin — ⭐⭐ **an unfired clay body, and the water in it**
 * (ceramics M4, D13, R2).
 *
 * A shaped piece of clay is GREEN until it is fired, and while it is green
 * its water decides everything: whether it can be trimmed, joined or
 * stamped (leather-hard), whether it can go in a kiln (bone-dry), and
 * whether the weather ruins it — rain SLUMPS a soft piece, frost BURSTS a
 * wet one, drying too fast CRACKS a fat clay. Green ware re-wets the way
 * turf does: `WaterActivityMixin` is the water, and every composer composes
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
import type { MarkupAugmenter } from '../../api/mml';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';
import { Quantity } from '../quantity';
import { DefaultCalendar } from '../time/DefaultCalendar';
import type { Carvable, CarvePlan, CarveRefusal, CarveRequest } from '../craft/Carvable';
import type { Impressible, ImpressOutcome } from '../craft/Impressible';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { AppSettingKeys } from '../config/AppSettings';
import { WaterActivity } from './WaterActivity';
import type Material from './Material';

/** How wet a green piece is. */
export type GreenState = 'plastic' | 'leather-hard' | 'bone-dry';

/** What the weather did to it. */
export type GreenRuin = 'slumped' | 'shattered' | null;

/** What a carve word does to a green piece. */
const CARVINGS: Readonly<Record<string, { line: string; keep: number }>> = {
  foot: { line: 'a turned foot', keep: 0.95 },
  trim: { line: 'a trimmed wall', keep: 0.95 },
  pattern: { line: 'a pattern cut into it', keep: 0.98 },
};

export interface Greenware extends Carvable, Impressible {
  /** Still unfired clay? (R2 — false from the first rung on.) */
  isGreen(): boolean;
  /** `plastic` · `leather-hard` · `bone-dry`, or `null` once fired. */
  greenState(): GreenState | null;
  /** `0` just thrown … `1` as dry as the air allows. */
  dryness(): number;
  /** What the weather did to it, if anything. */
  getRuin(): GreenRuin;
  /** Trim, join and stamp ask for leather-hard. */
  canTrim(): boolean;
  canJoin(): boolean;
  canStamp(): boolean;
  /** Only a bone-dry piece survives the kiln — a wet one bursts as steam. */
  isFireable(): boolean;
  /** Bring the weather's effects current (called on every read above). */
  reconcileGreen(): void;
  /** What has been worked on it at leather-hard (a turned foot …). */
  getGreenWork(): readonly string[];
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
  else if (ruin === 'shattered') line = 'It froze wet, and the frost has burst it apart.';
  else if (state === 'plastic') line = 'It is green — soft, wet clay that takes a thumbprint.';
  else if (state === 'leather-hard') line = 'It is green and leather-hard: firm enough to trim, still cool and damp.';
  else if (state === 'bone-dry') line = 'It is green and bone-dry: pale, light, and ready for the kiln.';
  const extra: string[] = [];
  const work = host.getGreenWork();
  if (work.length > 0) extra.push(`It has ${work.join(' and ')}.`);
  // ⭐ The base (ceramics S5): whose mark, and — once fired — when.
  const mark = MixinApi.isCrafted(host) ? host.getMark() : '';
  const who = markName(mark);
  const rec = MixinApi.isThermal(host) ? host.getHeatWork() : null;
  const firedAt = state === null && rec !== null && rec.lastTransitionAtS !== null ? rec.lastTransitionAtS : null;
  if (who !== null) {
    extra.push(
      firedAt !== null
        ? `Its base bears ${who}'s mark, and it was fired ${DefaultCalendar.singleton().formatDate(Quantity.of(firedAt, 's'))}.`
        : `Its base bears ${who}'s mark.`,
    );
  } else if (firedAt !== null) {
    extra.push(`It was fired ${DefaultCalendar.singleton().formatDate(Quantity.of(firedAt, 's'))}.`);
  }
  const all = [line, ...extra].filter((l) => l !== '').join(' ');
  if (all === '') return text;
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export function GreenwareMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class GreenwareMixin extends Base implements Greenware {
    static _mixinName = 'GreenwareMixin';

    static markupAugmenters: MarkupAugmenter[] = [greenAugmenter];

    static fieldMeta: FieldMeta = {
      greenRuin: { persistent: true, runtimeState: true },
      greenCheckedS: { persistent: true, runtimeState: true },
      greenLastDryness: { persistent: true, runtimeState: true },
      greenLastWetness: { persistent: true, runtimeState: true },
      greenWork: { persistent: true, runtimeState: true },
    };

    /** What was worked on it at leather-hard, in words (survives firing). */
    public greenWork: string[] = [];

    public getGreenWork(): readonly string[] {
      return this.greenWork;
    }

    /**
     * ⭐ The kernel's carve for a green piece (ceramics W4): trim the wall,
     * turn a foot, cut a pattern — at LEATHER-HARD only. Too soft, it
     * smears; too dry, it cracks. Credits pottery.
     */
    public async carvePlan(req: CarveRequest): Promise<CarvePlan | CarveRefusal> {
      const self = this as unknown as Stuff;
      const word = req.word.trim().toLowerCase();
      const cut = CARVINGS[word];
      if (cut === undefined) {
        return {
          ok: false,
          reason: 'not-carvable',
          line: Mml.compose`You can trim ${Mml.thing(self)}, turn a foot on it, or cut a pattern into it.`,
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
          if (!this.greenWork.includes(cut.line)) this.greenWork = [...this.greenWork, cut.line];
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
     * identity — whose mark it is — pressed into the base. A pattern that
     * answers `markIdentity()` (the potter's stamp) names it; otherwise its
     * maker does.
     */
    public async takeImpression(pattern: Stuff, _actor: Stuff): Promise<ImpressOutcome> {
      const self = this as unknown as Stuff;
      const refused = this.leatherHardRefusal('stamp');
      if (refused !== null) return refused;
      if (!MixinApi.isCrafted(self)) {
        return { ok: false, reason: 'not-markable', line: Mml.compose`There is nowhere on ${Mml.thing(self)} a mark would mean anything.` };
      }
      const probe = pattern as unknown as { markIdentity?(): string };
      const identity =
        typeof probe.markIdentity === 'function'
          ? probe.markIdentity()
          : MixinApi.isCrafted(pattern)
            ? pattern.getMaker()
            : '';
      if (identity === '') {
        return {
          ok: false,
          reason: 'no-mark',
          line: Mml.compose`${Mml.thing(pattern)} leaves a dent, and no mark anybody would know.`,
        };
      }
      self.setMark(identity);
      const who = markName(identity) ?? 'its maker';
      return {
        ok: true,
        line: Mml.compose`You press ${Mml.thing(pattern)} into the base of ${Mml.thing(self)}. It takes ${who}'s mark, sharp and clean.`,
      };
    }

    /** `null` when the piece is leather-hard and sound; a refusal otherwise. */
    private leatherHardRefusal(act: 'trim' | 'stamp'): CarveRefusal | null {
      const self = this as unknown as Stuff;
      if (this.greenRuin !== null) {
        return { ok: false, reason: 'ruined', line: Mml.compose`${Mml.thing(self)} is ruined — knead it back and start again.` };
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
    public greenCheckedS = 0;
    public greenLastDryness = 0;
    public greenLastWetness = 0;

    /** Reentry guard: a reconcile reads the body, which may reconcile. */
    private _greenReconciling = false;

    public isGreen(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return false;
      const mat = self.getMaterial();
      if (mat === null || !mat.hasTag('plastic')) return false;
      if (MixinApi.isThermal(self)) {
        const rec = self.getHeatWork();
        if (rec !== null && Object.values(rec.conversions).some((c) => c.degree > 0)) return false;
      }
      return true;
    }

    public dryness(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isWaterActive(self)) return 1;
      const m = self.getMoisture();
      const eq = WaterActivity.equilibriumMoisture(WaterActivity.ambientHumidityOf(self));
      if (!(eq < 1)) return 0;
      return Math.max(0, Math.min(1, (1 - m) / (1 - eq)));
    }

    public greenState(): GreenState | null {
      this.reconcileGreen();
      if (!this.isGreen()) return null;
      const d = this.dryness();
      if (d >= greenDial(AppSettingKeys.greenBoneDryAt, 0.85)) return 'bone-dry';
      if (d >= greenDial(AppSettingKeys.greenLeatherAt, 0.3)) return 'leather-hard';
      return 'plastic';
    }

    public getRuin(): GreenRuin {
      this.reconcileGreen();
      return this.greenRuin;
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
     *  - **cracked** — it dried faster than its clay stands: the drying rate
     *    × its crack risk (fat clay high, sand and grog low) past
     *    `green.crackRate` leaves a check (a drying crack).
     */
    public reconcileGreen(): void {
      if (this._greenReconciling || this.greenRuin !== null) return;
      const self = this as unknown as Stuff;
      if (!this.isGreen()) return;
      const nowS = greenNowS();
      if (nowS === null) return;
      this._greenReconciling = true;
      try {
        const dry = this.dryness();
        const wet = MixinApi.isWet(self) ? self.getWetness() : 0;
        if (this.greenCheckedS === 0) {
          this.greenCheckedS = nowS;
          this.greenLastDryness = dry;
          this.greenLastWetness = wet;
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
        if (wet > this.greenLastWetness + greenDial(AppSettingKeys.greenSlumpWetting, 0.15)) {
          this.greenRuin = 'slumped';
        } else if (wetPiece && (minK < 273.15 || maxK > 373.15)) {
          this.greenRuin = 'shattered';
          if (MixinApi.isTangible(self)) self.addFlaw('crack', true, nowS);
        } else if (dry > this.greenLastDryness) {
          const rate = (dry - this.greenLastDryness) / dtH;
          if (rate * this.greenCrackRisk() > greenDial(AppSettingKeys.greenCrackRate, 0.05)) {
            if (MixinApi.isTangible(self) && !self.getFlaws().some((f) => f.kind === 'check')) {
              self.addFlaw('check', true, nowS);
            }
          }
        }
        this.greenCheckedS = nowS;
        this.greenLastDryness = dry;
        this.greenLastWetness = wet;
      } finally {
        this._greenReconciling = false;
      }
    }

    /**
     * How readily this clay cracks as it dries, `0..1`: a FAT clay (much
     * clay mineral) high, opened with sand, grog or breeze low. Read off the
     * piece's own composition when it carries one, else a middling clay.
     */
    private greenCrackRisk(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isComposition(self)) return 0.5;
      let fat = 0;
      let open = 0;
      for (const e of self.getEffectiveComposition()) {
        const m = StuffApi.findByTemplatePath<Material>(e.materialPath);
        if (m === null || m === undefined) continue;
        if (m.hasTag('clay-mineral')) fat += e.fraction;
        if (m.hasTag('sand') || m.hasTag('grog') || m.hasTag('breeze') || m.hasTag('silica')) {
          open += e.fraction;
        }
      }
      return Math.max(0, Math.min(1, 1.6 * fat - 1.2 * open));
    }
  }
  return GreenwareMixin;
}
