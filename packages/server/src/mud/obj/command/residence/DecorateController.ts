/**
 * DecorateController — the `decorate <themeId>` / `remodel <themeId>` verb
 * (the new `residence` category). The tenant's personalization commit: pick
 * an authored theme and seal the room's whole look — a prose overlay across
 * the room and its three fixtures — into the unit's D1 record. Re-running is
 * a remodel (overwrite + re-seal).
 *
 * Flow (DECISION D + Hazard 3): the write is gated by **holding the lease**
 * (`ParcelApi.heldUnitOf`, D6 write-gate) → resolve the live room (the
 * actor's container if it's their unit, else `DormWarren.admit`) → apply the
 * theme's prose bundle to the room + each fixture (by role) → seal with
 * `PersistableApi.capture(room, unitExtent)`. On a later wake the spine
 * respawns each fixture from its current template and overlays the captured
 * prose (function always current, prose personalized).
 *
 * **Function is fixed by the backing class.** `applyBundle` writes only
 * `PROSE_FIELDS` (short/long description) through the gated setters; a bundle
 * naming any other field is refused whole (nothing is written) — the
 * function-fixed / code-trust boundary. `class` / `hydratorClass` are never
 * touched; the spine's drift guard is defense-in-depth on restore.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ParcelApi } from '../../../api/parcel';
import { PersistableApi } from '../../../api/persistable';
import { MixinApi } from '../../../api/mixin';
import DormWarren from '../../../domain/eternal/duncan-hall/DormWarren';
import Bed from '../../../domain/eternal/duncan-hall/Bed';
import Desk from '../../../domain/eternal/duncan-hall/Desk';
import Footlocker from '../../../domain/eternal/duncan-hall/Footlocker';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Visible } from '../../../lib/description/Visible';

const TOPIC = 'residence.decorate';

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

/** The theme catalogue path — the ParcelSeeder read precedent. A `static`
 *  (not a module const) so a test can point it at a fixture. */
function defaultThemesPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '../../../config/dorm-themes.yaml');
}

interface DecorateModel extends CommandModel {
  theme?: string;
}

export default class DecorateController extends CommandController<DecorateModel> {
  /** The theme-catalogue YAML path (overridable in tests). */
  static themesPath: string = defaultThemesPath();

  /** Read + parse the theme catalogue fresh (infrequent verb, small file). */
  private loadThemes(): Record<string, Theme> {
    try {
      const parsed = YAML.parse(
        readFileSync(DecorateController.themesPath, 'utf-8'),
      ) as { themes?: Record<string, Theme> } | null;
      return parsed?.themes ?? {};
    } catch {
      return {};
    }
  }

  async execute(model: DecorateModel, context: CommandContext): Promise<void> {
    const themeId = (model.theme ?? '').trim();
    if (!themeId) {
      return this.fail(context, 'Decorate with which theme?', 'no-theme');
    }
    const themes = this.loadThemes();
    const theme = themes[themeId];
    if (!theme) {
      return this.fail(
        context,
        `There's no "${themeId}" theme. Try: ${Object.keys(themes).join(', ')}.`,
        'no-such-theme',
      );
    }

    const actor = context.commandGiver as Stuff;
    const holder = actor.getTemplatePath() ?? '';
    const unit = holder ? await ParcelApi.heldUnitOf(holder) : null;
    if (!unit) {
      return this.fail(
        context,
        "You don't hold this dorm's lease.",
        'no-lease',
      );
    }
    const unitExtent = unit.getExtent();

    // Validate the WHOLE theme (room + fixtures) before writing anything —
    // a non-prose field refuses the commit atomically (function-fixed).
    const offending = this.firstNonProseField(theme);
    if (offending) {
      return this.fail(
        context,
        `The "${themeId}" theme can't set "${offending}" — only room ` +
          `descriptions are yours to change.`,
        'non-prose-field',
      );
    }

    const room = await this.resolveRoom(actor, unitExtent);

    // Apply the room bundle, then each fixture by its role.
    if (theme.room) this.applyBundle(room, theme.room);
    for (const item of (room as Stuff & Container).getContents()) {
      const role = this.roleOf(item);
      const bundle = role ? theme[role] : undefined;
      if (bundle) this.applyBundle(item, bundle);
    }

    // Seal: the record now carries the personalized prose overlay.
    await PersistableApi.capture(room, unitExtent);

    this.send(
      context,
      Mml.compose`\nYou redecorate — the room takes on ${theme.label ?? themeId} style.\n`,
    );
  }

  /** The live room: the actor's container when it's their unit, else admit. */
  private async resolveRoom(
    actor: Stuff,
    unitExtent: string,
  ): Promise<Stuff & Container> {
    const container = (
      MixinApi.isContainable(actor) ? actor.getContainer() : null
    ) as unknown as (Stuff & Container) | null;
    if (
      container &&
      container.getTemplatePath() === DormWarren.DORMROOM_TEMPLATE &&
      (container as unknown as { getPersistenceKey?: () => string | null })
        .getPersistenceKey?.() === unitExtent
    ) {
      return container;
    }
    const warren = await DormWarren.resolve();
    return warren.admit(unitExtent);
  }

  /** The theme role a fixture fills, or null (not a themed fixture). */
  private roleOf(item: Stuff): 'bed' | 'desk' | 'footlocker' | null {
    if (item instanceof Bed) return 'bed';
    if (item instanceof Desk) return 'desk';
    if (item instanceof Footlocker) return 'footlocker';
    return null;
  }

  /** The first field across the whole theme that isn't a prose field, or
   *  null when every field is writable (the function-fixed pre-check). */
  private firstNonProseField(theme: Theme): string | null {
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
  private applyBundle(target: Stuff, bundle: ProseBundle): void {
    for (const [field, value] of Object.entries(bundle)) {
      const setter = PROSE_SETTERS[field];
      if (!setter) continue; // pre-validated, but stay defensive
      (target as unknown as Record<string, (v: string) => void>)[setter]!(
        value,
      );
    }
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
