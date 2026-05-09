/**
 * LeafTemplate — concrete `Template` subclass for non-folder templates.
 *
 * The default Template shape: descendants are forbidden by the
 * folder/leaf invariant; everything that isn't a `ZoneTemplate` is a
 * `LeafTemplate`. Carries no fields of its own — the split exists to
 * give the type system the folder-vs-leaf distinction for free.
 */
import { Template } from './Template';

export class LeafTemplate extends Template {}
