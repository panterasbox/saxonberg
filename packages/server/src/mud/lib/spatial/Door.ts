/**
 * Door - First-class shared door state referenced by exit pairs.
 *
 * One `Door` instance represents one physical door. Both sides of a
 * bidirectional exit pair reference the SAME instance so that opening the
 * door from room A is immediately visible from room B.
 * `ExitableMixin.addBidirectionalExit()` wires this up in a single call.
 *
 * Composition: `VisibleMixin(PerceptibleMixin(SealableMixin(Idea)))`.
 * A Door is an `Idea` — it has identity but does NOT compose `Containable`
 * (no environment) or `Container` (no inventory). It lives nowhere spatial
 * and is referenced purely through `Exit.door`.
 *
 * Mixin responsibilities:
 *   - `SealableMixin`: open/closed state (shared with chests, trapdoors, …).
 *   - `PerceptibleMixin`: MQL keywords so the player can type
 *     `open the oak door` and have it resolve.
 *   - `VisibleMixin`: short/long descriptions, so `look door` and
 *     `DescribeApi.getDisplayName()` both work uniformly.
 *
 * Template-loadable: like `Avatar`, `Door` is cloned from a `domain`
 * template via `StuffApi.clone()` — the template's `class` field is
 * `/lib/spatial/Door` and its `data` is a `DoorTemplateData` payload. The
 * class constructor accepts both the typed shape and the raw
 * `Record<string, unknown>` that comes off the database so either path
 * works.
 *
 * MQL surfaces a door on its room via `ExitableMixin.getExitDoors()`
 * (MqlApi scans those in addition to the room's contents), so a door is
 * player-targetable by name even though it doesn't live in anyone's
 * inventory.
 *
 * Phase 7 scope: open/closed only. No locks, no keys, no `unlock` command.
 */

import { Idea } from '../stuff/Idea';
import { SealableMixin } from './Sealable';
import { PerceptibleMixin } from '../description/Perceptible';
import { VisibleMixin } from '../description/Visible';

/**
 * Template data for Door (from the `domain` collection).
 *
 * Every field is optional so that minimal templates (just a
 * `shortDescription`) still produce a usable door.
 */
export interface DoorTemplateData {
  shortDescription?: string;
  longDescription?: string;
  keywords?: string[];
  isOpen?: boolean;
}

const DoorBase = VisibleMixin(PerceptibleMixin(SealableMixin(Idea)));

export class Door extends DoorBase {
  /**
   * Constructor — accepts template data from the `domain` collection.
   * Shape matches `DoorTemplateData`; `Record<string, unknown>` is accepted
   * so `StuffApi.clone()` can pass DB data straight through.
   */
  constructor(templateData: DoorTemplateData | Record<string, unknown> = {}) {
    super();
    const data = templateData as DoorTemplateData;
    this.shortDescription = typeof data.shortDescription === 'string' ? data.shortDescription : '';
    this.longDescription = typeof data.longDescription === 'string' ? data.longDescription : '';
    if (Array.isArray(data.keywords) && data.keywords.length > 0) {
      this.setKeywords(data.keywords);
    }
    this.isOpen = data.isOpen === true;
  }

  /**
   * Union of the PerceptibleMixin keyword list with the tokens of the
   * door's shortDescription. A door constructed with only `shortDescription:
   * 'heavy oak door'` should still be targetable as `oak` / `door` without
   * the template author having to re-list those as explicit keywords.
   */
  override getKeywords(): string[] {
    const base = super.getKeywords();
    const nameTokens = this.shortDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return Array.from(new Set([...base, ...nameTokens]));
  }
}
