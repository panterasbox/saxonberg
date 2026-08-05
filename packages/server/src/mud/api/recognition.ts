/**
 * RecognitionApi — the **viewer-aware naming step**: turn a `(viewer,
 * target)` pair into the name-string that viewer would render for that
 * target, composing the per-viewer identity memory held in the belief
 * store (`lib/belief/BeliefStore.ts`) over the viewer-blind baseline
 * (`Stuff.getPresentation()`).
 *
 * This is the "(B) routine" of the recognition / identification
 * substrate (`docs/subsystems/belief.md`). It is the
 * consumer-intelligence layer over the dumb belief-store spine: the
 * spine holds records, this Api decides how a name bends around them.
 *
 * ## Why here, not on `PerceptionApi`
 *
 * The naming step *consults* perception for its visibility gate ("can V
 * see T?") but is its own concern — instance/type identity memory, not
 * sensory channels. The requirements fix that it is **not** homed on
 * `PerceptionApi`; this Api is the natural home, and it also hosts the
 * `learnIdentity` write-sink that the `introduce` verb and future
 * ambient triggers share.
 *
 * ## The algorithm (per target)
 *
 *   1. Baseline = `target.getPresentation()` (viewer-blind).
 *   2. If the viewer can't perceive-query (not a `Sensor & Perception`)
 *      or can't *see* the target → baseline.
 *   3. **Recognition** (instance axis) applies to living beings
 *      (`OrganismMixin`). A masked target withholds any known name; an
 *      unknown being renders the **bare stem** — its `shortDescription`
 *      ("a crossing guard"), else a species fallback.
 *   4. **Identification** (type axis) applies to everything else.
 *
 * `describe` returns the concise identity — the recognized name or the
 * bare stem, with **no** worn-feature and **no** status affix — so ambient
 * act lines stay terse ("a crossing guard says …"). The two escalations
 * are separate surfaces:
 *   - the distinguishing worn-feature form ("… wearing a faded hi-vis
 *     vest") lives on {@link RecognitionApi.salientFeatures} and rides
 *     {@link RecognitionApi.perceivedKeywords} for targeting;
 *   - the activity-status affix ("…, watching the empty road") is a
 *     **presence decoration** that weaves in only through
 *     {@link RecognitionApi.describeWithStatus}, used by the `look here`
 *     occupant roll-call — never act-subject naming.
 *
 * **Pure — no record mutation.** `describe` runs for every perceived
 * target × viewer on every look / listing / MQL projection.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link RecognitionLogic} singleton at
 * `/obj/api/recognition`, reached synchronously via
 * `StuffApi.singletonSync`. Like the logic file, this face makes **zero
 * static perception imports** — `RecognitionApi` is reachable from the
 * root `Stuff`/`Idea` eval graph (via `Mml` / the MQL projection), so a
 * static perception import would force `Modality` to evaluate before
 * `Idea` is ready and crash boot. `dest /obj/api/recognition` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { RecognitionLogic } from '../obj/api/RecognitionLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/obj/api/recognition';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/RecognitionLogic', import.meta.url)
);

/** Resolve the HMR-able RecognitionLogic singleton (sync). */
function logic(): RecognitionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'RecognitionLogic'
      ) as typeof RecognitionLogic | null) ?? RecognitionLogic)()
  );
}

export class RecognitionApi {
  /**
   * The viewer-aware name for `target` as `viewer` would render it. See
   * the class docstring for the algorithm. Always returns a string —
   * the viewer-blind baseline is the universal fallback.
   *
   * `viewer` is typed `Stuff` (not the narrower `Sensor & Perception`)
   * so every call site — including the no-narrowing `Mml` render path —
   * can pass whatever it has; the perceiver-ness is checked internally.
   */
  public static describe(viewer: Stuff, target: Stuff): string {
    return SecurityApi.projectAcross(viewer, target, () => logic().describe(viewer, target),
      RecognitionApi
    );
  }

  /**
   * Like {@link RecognitionApi.describe}, but weaves the activity-status
   * affix (`StatusMixin`) onto the resolved identity — "the crossing
   * guard, watching the empty road". For the **presence-scan** surfaces
   * only (room-occupant listing, look-at a being, the inspection pane),
   * where the viewer is taking stock of who's present and what they're
   * doing. Act-subject naming ("X says …", "X arrives") uses `describe`
   * so the idle status never contradicts the act in flight.
   */
  public static describeWithStatus(viewer: Stuff, target: Stuff): string {
    return SecurityApi.projectAcross(viewer, target, () =>
      logic().describeWithStatus(viewer, target),
      RecognitionApi
    );
  }

  /**
   * The single identity-learning write-sink. Records that `viewer` now
   * knows `subject` as `name` (a non-null name from an introduction; a
   * `null` name from a bare repeat-perception). Every recognition
   * trigger funnels through here so they share one coalescing write.
   *
   * No-ops when `viewer` can't hold beliefs or `subject` has no durable
   * `templatePath` to key on.
   */
  public static learnIdentity(
    viewer: Stuff,
    subject: Stuff,
    name: string | null
  ): void {
    logic().learnIdentity(viewer, subject, name);
  }

  /**
   * Whether `viewer` already recognizes `subject` by a learned name. The
   * gate the ambient auto-introduce triggers use so an NPC/player doesn't
   * re-introduce to someone who already knows them. False when the viewer
   * can't hold beliefs or has no name on record for the subject.
   */
  public static recognizes(viewer: Stuff, subject: Stuff): boolean {
    return logic().recognizes(viewer, subject);
  }

  /**
   * **Does `viewer` truly know what `target` is?** — the type axis, and
   * the gate on showing an item's authored long description.
   *
   * Narrower than "renders a type name": a **believed** name (planted by
   * a cursed identify) reads as knowledge and is not knowledge, and a
   * record learned in a prior appearance generation hedges rather than
   * asserts. Both answer `false` here, so the reader keeps seeing the
   * class's generic prose and nothing contradicts the name they hold.
   *
   * False whenever the target isn't identifiable or the viewer can't
   * hold beliefs.
   */
  public static knowsTrueType(viewer: Stuff, target: Stuff): boolean {
    return logic().knowsTrueType(viewer, target);
  }

  /**
   * Generate a salient-feature description for a being the viewer
   * doesn't recognize. Viewer-independent (features are objective; only
   * the *name* is unknown). Reused by the viewer-relative targeting
   * layer so naming and targeting can't diverge.
   */
  public static salientFeatures(
    target: Stuff,
    covered?: ReadonlySet<string>
  ): string {
    // Single-subject form of the same aperture as `describe`: this is
    // the worn-feature half of naming a person, and it walks the
    // target's slot occupants to find the notable item. Enumerating
    // exempt METHODS does not work here — the walk is a chain
    // (`getPresentation` → `getDisguise` → `getAllOccupants` → the
    // occupant's own `getPresentation` …), so exempting one hop just
    // moves the denial to the next. The projection is the unit, not
    // the call.
    return SecurityApi.projectAcross(
      target,
      undefined,
      () =>
        covered === undefined
          ? logic().salientFeatures(target)
          : logic().salientFeatures(target, covered),
      RecognitionApi
    );
  }

  /**
   * The viewer-relative keyword set for targeting `target` — the tokens
   * `look <word>` may resolve it by. Derived from the SAME perceived
   * string `describe` renders, so the true name never leaks as a
   * keyword. This is the Wave-5 name-leak gate.
   */
  public static perceivedKeywords(viewer: Stuff, target: Stuff): string[] {
    // Same aperture: keywords are the targeting face of the same
    // projection, and `who`-style listings ask for both.
    return SecurityApi.projectAcross(viewer, target, () =>
      logic().perceivedKeywords(viewer, target),
      RecognitionApi
    );
  }
}

SecurityApi.decorateApiClass(RecognitionApi);
