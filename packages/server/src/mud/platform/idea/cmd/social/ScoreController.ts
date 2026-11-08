/**
 * ScoreController — `score`: your own card and standing (over
 * {@link ProfileControllerBase}).
 */

import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ProfileControllerBase, type ProfileModel } from './ProfileControllerBase';

export default class ScoreController extends ProfileControllerBase {
  protected subject(_model: ProfileModel, viewer: Stuff): Stuff {
    return viewer;
  }
}
