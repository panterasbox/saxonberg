/**
 * CalendarUpdate — the personal calendar as a hosted update (D12).
 *
 * Composes `CalendarAppMixin` (the surface + verb) and `AetherHostedMixin`
 * (the must-be-hosted relation) around a bare `Idea`. Cloned INTO the
 * aether host by `Avatar.installDefaultLoadout`, beside comms / forums /
 * wallet; never cloned to a location. Carries no persistent state — the
 * entries live on the Avatar's `CalendarMixin`.
 *
 * Mirrors `ForumsUpdate` exactly.
 */

import { Idea } from '../../lib/stuff/Idea';
import { CalendarAppMixin } from '../../lib/calendar/CalendarApp';
import { AetherHostedMixin } from '../../lib/augmentation/AetherHosted';
import { TemplatePaths } from '../../lib/paths';

export default class CalendarUpdate extends CalendarAppMixin(
  AetherHostedMixin(Idea),
) {
  static readonly TEMPLATE_PATH = TemplatePaths.calendarUpdate;
}
