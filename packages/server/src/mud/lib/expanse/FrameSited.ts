/**
 * FrameSitedMixin — ⭐ **a fixed place that stands at a position on a
 * frame** (river review, W13): the static twin of `MovingMixin`. A quay or
 * a towpath on a river's line, one day a beach or a sea-cliff landing on
 * the sea's chart.
 *
 * Named for the model it belongs to — the frames (`Frame`: the sea's chart,
 * a river's line) — and claiming nothing beyond it: a place with no frame
 * has no `frameSite`, and a shore is beside its water whether or not it
 * has one.
 *
 * - **The record** is `{ frame, cite, span?, name? }`: the frame's row path,
 *   and a citation in that frame's OWN grammar, which only the frame reads
 *   (`Frame.siteOf`) — `confluence+0.1,left` on a river's line, where left
 *   and right are the line's words; a node path or a lat/lon on a chart.
 * - **Standing there means something to the frame** — a river gives a
 *   bank its way into the water, which only the river can work out — and
 *   the frame is told the first time the place is USED
 *   (`Frame.onSiteStood`): somebody arrives on it, or is put down on it,
 *   or swims from it. Load on use, never at creation: installed from a
 *   room's `onCreate` it ran inside the clone tree that was loading the
 *   room, and two banks loading in one boot cascade collided on the exit
 *   row (the drive found the estuary reach with no way into the water).
 *
 * - **Ships lie at it** (harbors P4): the first use also asks the frame's
 *   craft whether any lies made fast here (her way aboard goes back on the
 *   place), and stands up the ships the frame names that are not loaded —
 *   each puts her own way back when she loads. Its `look` reads who is
 *   alongside from those ways: *Alongside: the Hesper.* — never a thing in
 *   the room.
 *
 * Composed on the waterside classes (`platform/location/Shore`, `Quay`).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { FramePos, FrameStuff } from './Frame';
import { Expanse } from './Expanse';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { NavigationApi } from '../../api/navigation';
import type { MarkupAugmenter } from '../../api/mml';
import BerthExit from '../../platform/idea/BerthExit';

/** Where a fixed place stands on a frame. */
export interface FrameSiteRecord {
  /** The frame's row path (a watercourse, an expanse). */
  frame: string;
  /** Where on it, in the frame's own citation grammar. */
  cite: string;
  /** How much of the frame it covers, in the frame's unit (a line's km; 0 = a point). */
  span?: number;
  /** The word a way to it is called from the frame's moving places (`quay`). */
  name?: string;
  /**
   * `false` for a place sited by the water that no craft comes alongside —
   * the harbor office above its quays (harbors P8): the frame knows where
   * it stands (a hail reaches it) and offers no landing there. Default: a landing.
   */
  landing?: boolean;
}

export interface FrameSited {
  getFrameSite(): FrameSiteRecord | null;
  setFrameSite(value: FrameSiteRecord | null): void;
  /** Its frame, loaded, or `null`. */
  liveSiteFrame(): Promise<FrameStuff | null>;
  /** ⭐ Where it stands, as its frame reads the citation, or `null`. */
  sitePosition(): Promise<FramePos | null>;
  /** ⭐ Tell its frame it stands there, once — the first time it is used. */
  frameSiteStood(): Promise<void>;
}

export function FrameSitedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class FrameSitedMixin extends Base implements FrameSited {
    static _mixinName: string = 'FrameSitedMixin';

    static fieldMeta: FieldMeta = {
      frameSite: { persistent: true, authorable: true },
    };

    /** ⭐ Who lies alongside, read off the ways aboard them (harbors P4). */
    static markupAugmenters: MarkupAugmenter[] = [alongsideAugmenter];

    /** `null` for a place on no frame — honest, not missing. */
    public frameSite: FrameSiteRecord | null = null;

    /** The frame told, once (runtime). */
    private _siteStood: Promise<void> | null = null;

    public getFrameSite(): FrameSiteRecord | null {
      return this.frameSite === null ? null : { ...this.frameSite };
    }

    public setFrameSite(value: FrameSiteRecord | null): void {
      this.frameSite =
        value && typeof value === 'object' && typeof value.frame === 'string' && typeof value.cite === 'string'
          ? { ...value }
          : null;
    }

    public async liveSiteFrame(): Promise<FrameStuff | null> {
      const path = this.frameSite?.frame;
      if (!path) return null;
      const s = await StuffApi.singleton<Stuff>(path).catch(() => null);
      if (!s) return null;
      return s instanceof Expanse || MixinApi.isLineFrame(s) ? (s as unknown as FrameStuff) : null;
    }

    public async sitePosition(): Promise<FramePos | null> {
      const site = this.frameSite;
      if (site === null) return null;
      const frame = await this.liveSiteFrame();
      return frame ? frame.siteOf(site.cite) : null;
    }

    public frameSiteStood(): Promise<void> {
      if (this.frameSite === null) return Promise.resolve();
      if (this._siteStood === null) {
        const site = this.frameSite;
        this._siteStood = this.liveSiteFrame()
          .then(async (frame) => {
            if (!frame) return;
            await frame.onSiteStood(this as unknown as Stuff);
            // The frame HAS been told; a ship that cannot make fast again is
            // said, and never makes the frame be told twice.
            await this.shipsLyingHere(frame).catch((err) =>
              console.warn(`FrameSitedMixin: the ships lying at ${site.cite} on ${site.frame} were not re-wired:`, err),
            );
          })
          .catch((err) => {
            this._siteStood = null;
            console.warn(`FrameSitedMixin: ${site.frame} at '${site.cite}' was not told it stands there:`, err);
          });
      }
      return this._siteStood;
    }

    /**
     * ⭐ The ships that lie made fast here get their ways back (harbors P4):
     * the frame's loaded craft are asked; the ships attached to the frame
     * that are not standing are stood up, and each re-wires itself as it loads.
     */
    private async shipsLyingHere(frame: FrameStuff): Promise<void> {
      for (const c of frame.craft()) {
        if (!c.isDestroyed() && MixinApi.isVoyaging(c)) await c.wireBerthAt(this as unknown as Stuff);
      }
      const path = frame.getTemplatePath();
      if (!path) return;
      for (const p of await NavigationApi.attachedTo(path, 'craft')) {
        void StuffApi.singleton<Stuff>(p).catch(() => null);
      }
    }

    /** A player put down on it (a login, a spawn) is using it. */
    public onContainableAdded(thing: unknown): void {
      (Base.prototype as { onContainableAdded?: (t: unknown) => void }).onContainableAdded?.call(this, thing);
      if (this.frameSite !== null && MixinApi.isHasInteractive(thing as Stuff)) void this.frameSiteStood();
    }

    /** Arriving on it is using it. */
    public onEntered(mover: Stuff, via: unknown): void {
      (Base.prototype as { onEntered?: (m: unknown, v: unknown) => void }).onEntered?.call(this, mover, via);
      if (this.frameSite !== null && mover.isAgent()) void this.frameSiteStood();
    }
  };
}

/**
 * ⭐ *Alongside: the Hesper, the Kittiwake.* — derived from the ways aboard
 * the ships made fast here (harbors P5), so it is true the moment one casts
 * off. A place with none passes its text through.
 */
function alongsideAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isExitable(host)) return text;
  const names: string[] = [];
  for (const exit of host.getExits().values()) {
    if (exit instanceof BerthExit) {
      const name = exit.alongsideName();
      if (name) names.push(name);
    }
  }
  if (names.length === 0) return text;
  const line = `Alongside: ${names.join(', ')}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
