/**
 * CalendarApp — the personal calendar, as an app installed on the person
 * (D12).
 *
 * Composes `CalendarAppMixin` (the surface + verb) on `App`. ⚠ Named for
 * the app, beside a mixin file of the same leaf name
 * (`lib/calendar/CalendarApp` exports `CalendarAppMixin`): the class is the
 * row's (`/platform/idea/app/calendar`), the mixin is the capability, and
 * the two never share an export name. Carries no persistent state — the
 * entries live on the person's `CalendarMixin`.
 */

import { CalendarAppMixin } from '../../lib/calendar/CalendarApp';
import App from './App';
import { TemplatePaths } from '../../lib/paths';

export default class CalendarApp extends CalendarAppMixin(App) {
  static readonly TEMPLATE_PATH = TemplatePaths.calendarApp;
}
