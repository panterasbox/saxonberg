/**
 * ChronicleApi — the gated mint/read surface for the chronicle: a
 * character's accumulating, append-only record of identity-shaping
 * narrative events, the **dumb ledger** every future identity readout
 * (recognition, reputation, alignment, traits, achievements) will
 * project from.
 *
 * **Dumb store, smart consumers** (the belief-store precedent). The
 * substrate stores {@link ChronicleEntry} rows and fetches them
 * owner-scoped. No per-tag meaning, no readout logic, no MQL provider
 * lives here — `tags` / `who` are persisted and owner-fetchable but
 * otherwise inert in v1, designed in for the deferred readouts. Each
 * entry is its own document, indexed on `owner` (the `ContactsMixin`
 * 16MB / whole-array-rewrite anti-precedent the belief store also
 * avoided).
 *
 * **No mixin.** Unlike the belief store, the chronicle has no hot path
 * (mint is a rare identity moment; the `chronicle` verb reads on demand
 * and may read Mongo) and no owner-side runtime state — so the owner key
 * is read directly off `owner.getTemplatePath()` in the logic, exactly
 * as `RecognitionApi.learnIdentity` reads `subject.getTemplatePath()`.
 *
 * **Singularity comes from the trigger, not universal dedup** — three
 * patterns the mint surface supports:
 *   - *event-singular* — `record` / `recordDeed` riding a naturally-once
 *     trigger (e.g. enroll), no `key`;
 *   - *category-first* — `recordOnce(owner, key, …)`, the first under
 *     `key` wins;
 *   - *repeatable* — plain `record`, always appends.
 *
 * No engine auto-subscription to the event bus: the identity-impact gate
 * (what is chronicle-worthy) is an *authoring doc principle*, not
 * engine-enforced. The substrate offers only the mint seams below.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link ChronicleLogic} singleton at `/obj/api/chronicle`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/chronicle` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type ChronicleEntry from '../lib/chronicle/ChronicleEntry';
import type {
  ChronicleEntryFields,
  ChronicleClaimSeed,
} from '../lib/chronicle/ChronicleEntry';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ChronicleLogic } from '../obj/api/ChronicleLogic';
import { fileURLToPath } from 'url';

export type { ChronicleEntryFields, ChronicleClaimSeed };

const LOGIC_PATH = '/obj/api/chronicle';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ChronicleLogic', import.meta.url)
);

/** Resolve the HMR-able ChronicleLogic singleton (sync). */
function logic(): ChronicleLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ChronicleLogic'
      ) as typeof ChronicleLogic | null) ?? ChronicleLogic)()
  );
}

export class ChronicleApi {
  /**
   * The always-append primitive. Builds a {@link ChronicleEntry} from
   * `fields` and saves it. Renders `text` via `ProseApi` when a
   * `template` is given; otherwise stores `fields.text` verbatim.
   * No-op without a durable owner key or an active connection.
   */
  public static async record(
    owner: Stuff,
    fields: ChronicleEntryFields
  ): Promise<void> {
    return logic().record(owner, fields);
  }

  /**
   * Convenience over {@link record} for deeds: forces `kind: 'deed'`, so
   * `when` defaults to the game-time witness (`WorldClockApi.getNow()`)
   * when omitted and `text` renders from `template` via `ProseApi`. Keeps
   * the "deed text via ProseApi" + "timestamp is the witness" contract at
   * one seam.
   */
  public static async recordDeed(
    owner: Stuff,
    fields: ChronicleEntryFields
  ): Promise<void> {
    return logic().recordDeed(owner, fields);
  }

  /**
   * Category-first idempotent mint: the first entry under `key` (for this
   * owner) wins; later calls no-op. The find-then-save-on-write-path
   * mirror of the belief upsert (a read on the write path only).
   */
  public static async recordOnce(
    owner: Stuff,
    key: string,
    fields: ChronicleEntryFields
  ): Promise<void> {
    return logic().recordOnce(owner, key, fields);
  }

  /**
   * The owner-scoped reader — the only reader v1 ships (no MQL provider).
   * Returns `[]` without a durable owner key or when disconnected.
   */
  public static async entriesFor(owner: Stuff): Promise<ChronicleEntry[]> {
    return logic().entriesFor(owner);
  }

  /**
   * Char-gen helper: mint `kind: 'claim'` prologue entries (each with its
   * `order`, `when: null`, and authored `text`) from the chosen
   * aspiration. A named seam, kept distinct from the `bio` seed.
   */
  public static async seedClaims(
    owner: Stuff,
    seeds: ChronicleClaimSeed[]
  ): Promise<void> {
    return logic().seedClaims(owner, seeds);
  }
}
