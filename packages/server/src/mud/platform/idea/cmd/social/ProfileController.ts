/**
 * ProfileController — `profile [<player>]`: their card, or yours with no
 * name (over {@link ProfileControllerBase}).
 */

import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ProfileControllerBase, type ProfileModel } from './ProfileControllerBase';

export default class ProfileController extends ProfileControllerBase {
  protected subject(model: ProfileModel, viewer: Stuff): Stuff {
    return model.target?.stuff ?? viewer;
  }
}
