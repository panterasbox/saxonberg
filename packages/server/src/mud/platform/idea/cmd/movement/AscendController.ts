/**
 * AscendController — `ascend`: up the water (over
 * {@link SwimVerticalControllerBase}).
 */

import { SwimVerticalControllerBase } from './SwimVerticalControllerBase';

export default class AscendController extends SwimVerticalControllerBase {
  protected goesUp(): boolean {
    return true;
  }
}
