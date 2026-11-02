/**
 * BerthRoll — ⭐ **the ships a landing has lying at it** (harbors Risk 6,
 * review 1): a landing's own short list of who is made fast there, by
 * durable handle, so the landing's first use after a restart can stand
 * them up and their ways aboard come back.
 *
 * ⭐ The reference points the right way. The register used to be asked
 * *"which ships lie at this landing?"* — a reverse question answered by
 * walking every entry of every register. A landing knows who lies at it
 * because each ship TELLS it as she makes fast and casts off
 * (`Ship.tellLanding` → `FrameSited.noteAlongside`/`noteGone`), and the
 * landing reads its own list (`FrameSited.frameSiteStood`).
 *
 * ## Why a record of its own, keyed by the landing
 *
 * The list is the landing's state, but a landing is not a persistence
 * host and must not become one for this: a persistable room records its
 * CONTENTS, and a quay's contents include the runtime ends of the lines
 * round its bollards (re-tied from the ship's own `moored`/`berth` after
 * a restart — restored ends would double) and its authored props (which
 * would stop following the row). So the landing keeps the list in this
 * record — `(row, key = the landing's path)` on the self-persistence
 * spine, resolved by that key on use (never searched) — exactly as a
 * harbor keeps its quays' book in a persistable `Harbor`.
 *
 * Nothing is written until a ship first lies at a landing: a landing
 * nobody ever made fast at has no record.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { PersistableApi } from '../../api/persistable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

/** The row every landing's roll is minted from (keyed by the landing's path). */
export const BERTH_ROLL_ROW = '/platform/idea/BerthRoll';

export default class BerthRoll extends PersistableMixin(Idea) {
  static fieldMeta: FieldMeta = {
    lying: { persistent: true },
  };

  /** ⭐ The durable handles of the ships made fast at this roll's landing, in the order they came. */
  protected lying: string[] = [];

  /** Whose roll this is — the landing's path (the record's key). */
  public landingPath(): string | null {
    return this.getPersistenceKey();
  }

  /** The handles lying here now. */
  public getLying(): string[] {
    return [...this.lying];
  }

  /** Persistence hydration — a list of handles, nothing else. */
  public setLying(value: unknown): void {
    this.lying = Array.isArray(value) ? value.filter((h): h is string => typeof h === 'string' && h !== '') : [];
  }

  /** ⭐ A ship has made fast here. Written through to the record at once. */
  public async add(handle: string): Promise<void> {
    if (!handle || this.lying.includes(handle)) return;
    this.lying.push(handle);
    await this.keep();
  }

  /** ⭐ A ship has gone (cast off, gone adrift, could not make fast again). */
  public async remove(handle: string): Promise<void> {
    if (!this.lying.includes(handle)) return;
    this.lying = this.lying.filter((h) => h !== handle);
    await this.keep();
  }

  /** Write the roll through — it is read after a restart, so it is kept the moment it changes. */
  private async keep(): Promise<void> {
    await PersistableApi.capture(this as unknown as Stuff);
  }
}
