/**
 * DormThemes — the residence **shell personalization** mechanism: apply an
 * authored theme's prose overlay across a room + its come-with fixtures and
 * seal it into the room's D1 record. The reusable core the two diegetic
 * triggers share — Katie's move-in commit (`provision --theme`) and the local
 * `remodel` prompt — so neither is a typed `decorate <theme>` verb.
 *
 * A *theme* is a prose bundle keyed by role (`room` + `bed`/`desk`/
 * `footlocker`), authored in `dorm-themes.yaml` alongside this class (Duncan
 * Hall content, not global config). **Function is fixed by
 * the backing class**: {@link applyTo} writes only `PROSE_SETTERS` fields
 * (short/long description) through the gated setters; a bundle naming any other
 * field is refused **whole** (nothing is written) — the function-fixed /
 * code-trust boundary. The overlay is the room's persisted prose state, so the
 * spine carries it: on a later wake each fixture respawns from its current
 * template (function always current) and the captured prose overlays it.
 *
 * A named value-object/registry (the `EmoteGrammar`/`RecipeCatalogue`
 * precedent), NOT a subsystem or Api. The model generalizes: crafted goods
 * personalize at the craft moment; rooms/shell — not crafted — personalize at
 * the move-in commit. Apartments reuse this same core one rung up.
 */

import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import Bed from './thing/Bed';
import Desk from './thing/Desk';
import Footlocker from './thing/Footlocker';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Visible } from '@saxonberg/server/mud/lib/description/Visible';
import { SourceTreeApi } from '@saxonberg/server/mud/api/source-tree';

/** Prose fields a theme may write, mapped to their gated setter. Anything
 *  else is refused — the function-fixed boundary. */
const PROSE_SETTERS: Record<string, keyof Visible> = {
  shortDescription: 'setShortDescription',
  longDescription: 'setLongDescription',
};

/** One role's prose bundle within a theme. */
type ProseBundle = Record<string, string>;
interface Theme {
  label?: string;
  room?: ProseBundle;
  bed?: ProseBundle;
  desk?: ProseBundle;
  footlocker?: ProseBundle;
}

/** Thrown by {@link DormThemes.applyTo} — an unknown theme or a non-prose
 *  field (the whole commit is refused; nothing is written). */
export class DormThemeError extends Error {}

export default class DormThemes {
  /** Test seam: raw catalogue YAML standing in for the shipped
   *  `dorm-themes.yaml`. `null` (the default) reads the real file. Source
   *  text rather than a path, so a fixture needs no temp file — and so the
   *  read stays inside the source tree (the import boundary). */
  static themesSource: string | null = null;

  /** The authored theme ids (the move-in / remodel menu). */
  static ids(): string[] {
    return Object.keys(DormThemes.load());
  }

  /** The display label for a theme id (falls back to the id). */
  static labelOf(themeId: string): string {
    return DormThemes.load()[themeId]?.label ?? themeId;
  }

  /**
   * Apply theme `themeId`'s prose overlay to `room` + its fixtures and **seal**
   * it into the room's D1 record (keyed on the room's stashed persistence key
   * = its unit parcel). Throws {@link DormThemeError} on an unknown theme or a
   * non-prose field — refused whole, nothing written (function-fixed).
   */
  static async applyTo(room: Stuff & Container, themeId: string): Promise<void> {
    const theme = DormThemes.load()[themeId];
    if (!theme) {
      throw new DormThemeError(
        `There's no "${themeId}" style. Try: ${DormThemes.ids().join(', ')}.`,
      );
    }
    // Validate the WHOLE theme before writing anything — a non-prose field
    // refuses the commit atomically.
    const offending = DormThemes.firstNonProseField(theme);
    if (offending) {
      throw new DormThemeError(
        `The "${themeId}" style can't set "${offending}" — only room ` +
          `descriptions are yours to change.`,
      );
    }

    if (theme.room) DormThemes.applyBundle(room, theme.room);
    for (const item of room.getContents()) {
      const role = DormThemes.roleOf(item);
      const bundle = role ? theme[role] : undefined;
      if (bundle) DormThemes.applyBundle(item, bundle);
    }

    // Seal: the record now carries the personalized prose overlay.
    const key = (
      room as unknown as { getPersistenceKey?: () => string | null }
    ).getPersistenceKey?.();
    await PersistableApi.capture(room, key ?? undefined);
  }

  /** Read + parse the theme catalogue fresh (infrequent, small file). */
  private static load(): Record<string, Theme> {
    try {
      const parsed = (
        DormThemes.themesSource !== null
          ? SourceTreeApi.parseYaml(DormThemes.themesSource)
          : SourceTreeApi.readYamlResource(
              import.meta.url,
              'dorm-themes.yaml',
            )
      ) as { themes?: Record<string, Theme> } | null;
      return parsed?.themes ?? {};
    } catch {
      return {};
    }
  }

  /** The theme role a fixture fills, or null (not a themed fixture). */
  private static roleOf(item: Stuff): 'bed' | 'desk' | 'footlocker' | null {
    if (item instanceof Bed) return 'bed';
    if (item instanceof Desk) return 'desk';
    if (item instanceof Footlocker) return 'footlocker';
    return null;
  }

  /** The first field across the whole theme that isn't a prose field, or
   *  null when every field is writable (the function-fixed pre-check). */
  private static firstNonProseField(theme: Theme): string | null {
    const bundles: (ProseBundle | undefined)[] = [
      theme.room,
      theme.bed,
      theme.desk,
      theme.footlocker,
    ];
    for (const bundle of bundles) {
      if (!bundle) continue;
      for (const field of Object.keys(bundle)) {
        if (!(field in PROSE_SETTERS)) return field;
      }
    }
    return null;
  }

  /** Write a validated prose bundle through the gated setters. */
  private static applyBundle(target: Stuff, bundle: ProseBundle): void {
    for (const [field, value] of Object.entries(bundle)) {
      const setter = PROSE_SETTERS[field];
      if (!setter) continue; // pre-validated, but stay defensive
      (target as unknown as Record<string, (v: string) => void>)[setter]!(
        value,
      );
    }
  }
}
