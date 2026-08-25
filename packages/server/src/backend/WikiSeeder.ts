/**
 * WikiSeeder — install the starter articles from `mud/config/wiki-pages.yaml`.
 *
 * Insert-only and idempotent, matching `ChannelSeeder` / `EmoteSeeder` /
 * `ParcelSeeder`: a page whose `namespace:slug` already exists is left
 * **completely alone**. That is not a detail — a wiki is community
 * -maintained, and a seeder that re-asserted its version on every boot
 * would silently revert every edit anybody made to a seeded page, on a
 * schedule, with no record of having done it.
 *
 * Lives in `config/` rather than `seeds/` for the same reason channels
 * do: a `WikiPage` is a Document, not a Stuff template, so it does not
 * belong in the `content` collection `SeederManager` walks.
 *
 * ## ⚠ Seeded pages are written by the SYSTEM, not by a player
 *
 * The registry's mutators derive their author from the execution
 * context and are gated to `WikiController`, so the seeder cannot (and
 * should not) go through them: there is no acting player at boot, and
 * inventing one would put a fake name on every seeded revision. It
 * writes the Documents directly and stamps `system` as the author,
 * which is honest — the first revision of a seeded page genuinely was
 * written by the deploy, and `wiki history` says so.
 *
 * ## What gets seeded, and what does not
 *
 * **Where the taxonomy IS the subject matter — materials, biomes — we
 * seed deliberately**, because there the structure is not an editorial
 * choice. Everything else grows organically. Over-organising an empty
 * wiki is how wikis die, so this file is a floor to build on, not a
 * skeleton to fill in.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { WikiPage, type WikiSubject } from '../mud/lib/wiki/WikiPage';
import { WikiRevision } from '../mud/lib/wiki/WikiRevision';
import { Sections } from '../mud/lib/wiki/Section';

interface WikiSeedEntry {
  /** `namespace:slug`, or a bare slug for the default namespace. */
  page: string;
  title?: string;
  body?: string;
  subject?: WikiSubject | null;
  tags?: string[];
  related?: string[];
  spoilerLevel?: 0 | 1 | 2 | 3;
}

interface WikiSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/wiki-pages.yaml. */
  seedPath?: string;
}

export class WikiSeeder {
  public static async run(opts: WikiSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? WikiSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`WikiSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { pages?: WikiSeedEntry[] }
      | WikiSeedEntry[]
      | null;
    const entries: WikiSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.pages)
        ? parsed.pages
        : [];

    let inserted = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.page !== 'string' || !entry.page) {
        throw new Error(
          `WikiSeeder: malformed entry in ${path}: missing 'page'`,
        );
      }
      const { namespace, name } = WikiPage.parseRef(entry.page, 'main');
      if (!name) {
        throw new Error(`WikiSeeder: unusable page name '${entry.page}'`);
      }
      // Idempotent, and by SLUG OR ALIAS: a seeded page somebody has
      // since renamed must not be re-created under its old name.
      const bySlug = await WikiPage.find<WikiPage>({ namespace, slug: name });
      const byAlias = await WikiPage.find<WikiPage>({
        namespace,
        aliases: name,
      });
      if (bySlug.length > 0 || byAlias.length > 0) continue;

      const page = new WikiPage();
      page.namespace = namespace;
      page.slug = name;
      page.title = entry.title ?? name;
      // Mint anchors up front, so the first citation to a seeded
      // section is already durable.
      page.body = Sections.reconcile('', entry.body ?? '');
      page.subject = entry.subject ?? null;
      page.tags = entry.tags ?? [];
      page.related = entry.related ?? [];
      page.spoilerLevel = entry.spoilerLevel ?? 0;
      page.rev = 1;
      page.createdBy = 'system';
      page.updatedBy = 'system';
      await page.save();

      // The log starts where the page does — a seeded page with no
      // revision would be the one page whose first state was
      // unrecoverable.
      const rev = new WikiRevision();
      rev.pageId = page._id ?? '';
      rev.rev = 1;
      rev.body = page.body;
      rev.author = 'system';
      rev.at = Date.now();
      rev.summary = 'seeded';
      rev.kind = 'create';
      rev.published = true;
      await rev.save();
      inserted++;
    }
    console.info(
      `WikiSeeder: ${inserted} new page${inserted === 1 ? '' : 's'} from ${path}`,
    );
    return inserted;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/wiki-pages.yaml');
  }
}
