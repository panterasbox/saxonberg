/**
 * ReadingCatalogue — the self-warming home of the authored channel
 * roster (the `MaterialCatalogue` shape).
 *
 * Every `Reading` row under any root's `idea/reading/` subtree is stood
 * up as a live singleton and indexed by the token a player types. That
 * is the whole registration story for a channel: **install the pack,
 * get the channel**. No kernel list, no stanza in a platform view, no
 * boot sequencer line.
 *
 * ⚠⚠ **It warms lazily as well as at `postRegister`.** The
 * reference-Idea-inert-at-boot trap has bitten this repo three times —
 * a roster nothing stands up reads null forever on a fresh process and
 * every consumer silently answers "no such thing". The verbs resolve a
 * channel on *every* dispatch, so the dispatch path must not depend on
 * boot order: {@link warmed} warms on the first miss and the second call
 * is an index read.
 *
 * ⭐ Idempotent by construction — `StuffApi.singleton` no-ops a row that
 * is already live — so a pack go-live re-warms and picks up new channels
 * without a restart.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import Reading from '../../lib/instrument/Reading';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

/** Where this singleton lives. */
export const READING_CATALOGUE_PATH = '/platform/idea/ReadingCatalogue';

const ReadingCatalogueBase = PostRegistrationMixin(Idea);

export default class ReadingCatalogue extends ReadingCatalogueBase {
  /** channel token → the live Reading. Rebuilt by {@link warm}. */
  private byChannel = new Map<string, Reading>();

  /** Whether {@link warm} has completed at least once. */
  private warmedOnce = false;

  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'ReadingCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * The channel a player typed, warming the roster if nothing has yet.
   * `null` when no installed pack ships that channel — which is the
   * honest answer, and what the verbs turn into *"there is no reading
   * called 'x'"*.
   *
   * ⚠ It takes RAW player text and normalizes it here, because every
   * caller has raw player text and there is exactly one right answer to
   * what `  Light ` means. This lived one tier up until the tier was
   * collapsed; a lookup key rule belongs to the index that is keyed by
   * it, or the next caller invents a second one.
   */
  public async warmed(channel: string): Promise<Reading | null> {
    const key = ReadingCatalogue.key(channel);
    if (key === '') return null;
    if (!this.warmedOnce) await this.warm();
    return this.byChannel.get(key) ?? null;
  }

  /** Every channel installed, warming first. Alphabetical by token. */
  public async allWarmed(): Promise<Reading[]> {
    if (!this.warmedOnce) await this.warm();
    return [...this.byChannel.values()].sort((a, b) =>
      a.getChannel().localeCompare(b.getChannel()),
    );
  }

  /** The index as it stands, with no warm. Cold reads empty, honestly. */
  public peek(channel: string): Reading | null {
    return this.byChannel.get(ReadingCatalogue.key(channel)) ?? null;
  }

  /** The one normalization of a channel token. */
  private static key(channel: string): string {
    return channel.trim().toLowerCase();
  }

  /**
   * Stand up every authored `Reading` row as a live singleton and index
   * it by channel. Public so a pack go-live can re-warm. Returns the
   * count indexed.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix(Reading.PATH_INFIX);
    const index = new Map<string, Reading>();
    const isReading = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isReading.has(tpl.class)) {
        isReading.set(tpl.class, await isReadingClass(tpl.class));
      }
      if (!isReading.get(tpl.class)) continue;
      try {
        const reading = await StuffApi.singleton<Reading>(tpl.path);
        const channel = reading.getChannel();
        if (channel === '') {
          console.warn(`ReadingCatalogue: '${tpl.path}' names no channel`);
          continue;
        }
        // ⚠ Two packs claiming one channel token is an authoring
        // collision, not a merge. First warmed wins and the second is
        // named, because a silent overwrite is how a trade's reading
        // disappears without anybody typing anything different.
        const prior = index.get(channel);
        if (prior && prior !== reading) {
          console.warn(
            `ReadingCatalogue: channel '${channel}' claimed twice — ` +
              `'${prior.getTemplatePath()}' keeps it, '${tpl.path}' ignored`,
          );
          continue;
        }
        index.set(channel, reading);
      } catch (err) {
        console.warn(`ReadingCatalogue: '${tpl.path}' failed to stand up:`, err);
      }
    }
    this.byChannel = index;
    this.warmedOnce = true;
    console.info(`ReadingCatalogue: ${index.size} reading channel(s) live`);
    return index.size;
  }

  /** Drop the index so the next read re-warms (a pack install / go-live). */
  public invalidateCache(): void {
    this.byChannel = new Map();
    this.warmedOnce = false;
  }
}

/** Does `classPath` resolve to a class extending `Reading`? */
async function isReadingClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return typeof cls === 'function' && cls.prototype instanceof Reading;
  } catch {
    return false;
  }
}
