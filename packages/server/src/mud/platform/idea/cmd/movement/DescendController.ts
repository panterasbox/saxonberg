/**
 * DescendController — `descend`: down the water (over
 * {@link SwimVerticalControllerBase}).
 */

import { SwimVerticalControllerBase } from './SwimVerticalControllerBase';

export default class DescendController extends SwimVerticalControllerBase {
  protected goesUp(): boolean {
    return false;
  }
}
