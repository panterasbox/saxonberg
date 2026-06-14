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
 *      unknown being renders a generated salient-features string.
 *   4. **Identification** (type axis) applies to everything else.
 *   5. Status decoration weaves in last.
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
import { SecurityApi } from './security';
import { RecognitionLogic } from '../obj/api/RecognitionLogic';
import { fileURLToPath } from 'url';

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
    return logic().describe(viewer, target);
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
   * Generate a salient-feature description for a being the viewer
   * doesn't recognize. Viewer-independent (features are objective; only
   * the *name* is unknown). Reused by the viewer-relative targeting
   * layer so naming and targeting can't diverge.
   */
  public static salientFeatures(
    target: Stuff,
    covered?: ReadonlySet<string>
  ): string {
    return covered === undefined
      ? logic().salientFeatures(target)
      : logic().salientFeatures(target, covered);
  }

  /**
   * The viewer-relative keyword set for targeting `target` — the tokens
   * `look <word>` may resolve it by. Derived from the SAME perceived
   * string `describe` renders, so the true name never leaks as a
   * keyword. This is the Wave-5 name-leak gate.
   */
  public static perceivedKeywords(viewer: Stuff, target: Stuff): string[] {
    return logic().perceivedKeywords(viewer, target);
  }
}

SecurityApi.decorateApiClass(RecognitionApi);
