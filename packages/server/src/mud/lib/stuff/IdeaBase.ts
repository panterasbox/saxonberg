/**
 * IdeaBase - Concrete base class for ideas
 *
 * This is a concrete (non-abstract) version of Idea that can be used
 * with mixins. Idea is abstract and can't be used directly with mixins
 * due to TypeScript limitations.
 */

import { Idea } from './Idea.js';

/**
 * Concrete base class for ideas (for mixin composition).
 */
export class IdeaBase extends Idea {
  constructor() {
    super();
  }
}
