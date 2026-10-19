/**
 * Cut sugar cane — a crop that inverts on a clock (sugar D15). Mill it the
 * day it is cut; cane that waited reads *inverted*, grades lower, and
 * gives less sugar and more molasses all the way down the chain.
 */

import Crop from '@saxonberg/server/mud/platform/thing/Crop';
import { InvertingMixin } from '../lib/Inverting';

export default class Cane extends InvertingMixin(Crop) {}
