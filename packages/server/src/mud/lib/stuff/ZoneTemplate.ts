/**
 * ZoneTemplate — concrete `Template` subclass for folder templates.
 *
 * In v1 this is a pure type-level marker: it carries no fields beyond
 * what `Template` already declares. The split exists so callers that
 * hold a Template can statically know whether it's a folder (the
 * structural side of the folder/leaf invariant) instead of sniffing
 * `class ∈ FOLDER_CLASS_PATHS` at every call site.
 *
 * Future zone-only fields — permission tables, runtime-rule slots,
 * inheritable defaults from zones to descendants — land on this
 * class when the corresponding subsystems land. v1 deliberately
 * reserves nothing.
 */
import { Template } from './Template';

export class ZoneTemplate extends Template {}
