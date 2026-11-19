/**
 * ForumsApp — the forums, as an app installed on the person.
 *
 * Composes `ForumsMixin` (the forum capability + verb surface) on `App`.
 * Installed on the person by `Avatar.installDefaultLoadout`, never cloned
 * to a location. Carries no persistent state — the board/entry data lives
 * in its own collections. Row: `/platform/idea/app/forums`.
 */

import { ForumsMixin } from '../../lib/forum/Forums';
import App from './App';
import { TemplatePaths } from '../../lib/paths';

export default class ForumsApp extends ForumsMixin(App) {
  static readonly TEMPLATE_PATH = TemplatePaths.forumsApp;
}
