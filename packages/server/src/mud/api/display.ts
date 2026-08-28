/**
 * DisplayApi — screens: what a display shows and who sees it (D12).
 *
 * A `DisplayMixin` Thing (a tablet, a wall TV, the terminal's board) shows
 * one `DisplaySource` — a **stream** (the focal embed) or a **card** — to
 * everyone who can see it. This Api owns the two halves the mixin cannot:
 *
 *  - **who drives** — `resolveFor(actor)` walks the ladder *held →
 *    paired-and-in-sight → paired-anywhere-by-mind*; `mayDrive` is the
 *    pairing policy (`held` / `remote` / `staff` / `open`). The modem is a
 *    predicate on the driver (`MixinApi.isActive(actor, 'AetherMixin')`),
 *    never a mixin on the screen.
 *  - **who sees** — `show` projects to every viewer in the display's room
 *    who perceives it: a stream writes their `cockpit.watch` (with a
 *    `display` marker), a card is `CardApi.push`ed. `refreshViewer` is the
 *    arrival/departure hook: walking into the booth shows what the TV
 *    shows; walking out clears it.
 *
 * ⚠ A display confers no money authority — see `DisplayMixin`.
 *
 * Thin forwarding shell over the hot-reloadable {@link DisplayLogic}
 * singleton at `/platform/idea/api/display`.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { DisplayLogic } from '../platform/idea/api/DisplayLogic';
import type { DisplayStuff, ResolvedDisplay, DriveMode } from '../platform/idea/api/DisplayLogic';
import type { Stuff } from '../lib/stuff/Stuff';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import type { DisplaySource } from '../lib/display/Display';
import { fileURLToPath } from 'url';

export type { DisplayStuff, ResolvedDisplay, DriveMode };
export type {
  Display,
  DisplaySource,
  DisplayPairing,
  DisplaySourcePolicy,
} from '../lib/display/Display';
export { DISPLAY_PAIRINGS, DISPLAY_SOURCE_POLICIES } from '../lib/display/Display';

const LOGIC_PATH = '/platform/idea/api/display';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/DisplayLogic', import.meta.url),
);

function logic(): DisplayLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, 'DisplayLogic') as
        | typeof DisplayLogic
        | null) ?? DisplayLogic)(),
  );
}

export class DisplayApi {
  private constructor() {}

  /** The pairing policy: may `actor` drive `display`? */
  public static mayDrive(actor: Stuff, display: DisplayStuff): Promise<boolean> {
    return logic().mayDrive(actor, display);
  }

  /**
   * The display `actor` drives right now, or null: held → paired and in
   * sight → paired anywhere by mind (`staff`/`held`/`remote` only, and only
   * with an active `AetherMixin`). `mode` says which — a driver by mind
   * sees nothing of what they show.
   */
  public static resolveFor(actor: Stuff): Promise<ResolvedDisplay | null> {
    return logic().resolveFor(actor);
  }

  /** Set what the display shows and project it to every viewer who sees it. */
  public static show(display: DisplayStuff, source: DisplaySource): void {
    logic().show(display, source);
  }

  /** Darken the display; every projected viewer's embed clears. */
  public static clear(display: DisplayStuff): void {
    logic().clear(display);
  }

  /** Re-project what the display shows to everyone who sees it now. */
  public static refresh(display: DisplayStuff): void {
    logic().refresh(display);
  }

  /**
   * The arrival/departure hook: project every display the viewer now
   * sees, and clear a shared embed they walked away from.
   */
  public static refreshViewer(viewer: Stuff): void {
    logic().refreshViewer(viewer);
  }

  /** The connected viewers who see the display (same room, perceives). */
  public static viewersOf(display: DisplayStuff): (Stuff & HasInteractive)[] {
    return logic().viewersOf(display);
  }
}

SecurityApi.decorateApiClass(DisplayApi);
