/**
 * StudioApi — the gated composition surface behind the CMS Studio.
 *
 * Where {@link CmsApi} is a thin node-ref surface over the content/source/
 * document backends, `StudioApi` is the **composition** surface: it reads
 * a backing class's effective author-facing field schema (`describeClass`),
 * and — in later phases — names/blesses compositions and scaffolds new
 * backing classes. Content-template *saves* still route through
 * `CmsApi.write('content', …)` unchanged; this surface never re-implements
 * the template write.
 *
 * Thin, security-gated forwarding shell — the `cms.ts` twin. All logic
 * (the source-scan classification, the runtime field/mixin introspection,
 * the effective-value read through the resolution chain, and the read
 * gate) lives in the hot-reloadable {@link StudioLogic} singleton at
 * `/obj/api/studio`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/studio` reloads it.
 *
 * The error its surface throws (`StudioError`) is homed here, with the
 * surface (a class export, allowed by export discipline).
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { StudioLogic } from '../obj/api/StudioLogic';
import { fileURLToPath } from 'url';
import type { ClassDescription } from '@saxonberg/types';

export type {
  ClassDescription,
  StudioFieldDescriptor,
  StudioValueSource,
  StudioErrorBody,
} from '@saxonberg/types';

/**
 * The single error class the Studio surface throws for the three
 * application-level failure modes. The REST layer maps `code` to an
 * HTTP status:
 *   - `denied`    → 403
 *   - `not-found` → 404
 *   - `invalid`   → 400
 *
 * Lives with the surface that throws it (no new `lib/studio/` module for
 * an error) — the `CmsError` precedent.
 */
export class StudioError extends Error {
  public readonly code: 'denied' | 'not-found' | 'invalid';
  constructor(code: 'denied' | 'not-found' | 'invalid', message: string) {
    super(message);
    this.name = 'StudioError';
    this.code = code;
  }
}

const LOGIC_PATH = '/obj/api/studio';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/StudioLogic', import.meta.url)
);

/** Resolve the HMR-able StudioLogic singleton (sync). */
function logic(): StudioLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'StudioLogic'
      ) as typeof StudioLogic | null) ?? StudioLogic)()
  );
}

export class StudioApi {
  /**
   * Describe a backing class for the composer: its effective mixin set
   * plus, for every author-facing (`@authorable`) field of that set, the
   * projected/inferred type shape and the field's effective value + the
   * source it was read from.
   *
   * Read-gated (author-tier) on the **context-derived** actor
   * (`getActingAuthor`), never a caller-supplied value — takes **no
   * `actor` argument by design**, so a privileged-Avatar reference can't
   * be substituted for the gate's subject. Throws `StudioError('denied')`
   * for a non-author (a null actor fails closed), `('not-found')` when the
   * class can't be resolved.
   *
   * @param classPath - the backing class path (`/obj/Coin`, a template's
   *   `class` field).
   * @param contextPath - optional template path of a representative live
   *   instance whose zone/biome resolution chain supplies effective
   *   defaults; when omitted, any existing instance of the class is used.
   */
  public static describeClass(
    classPath: string,
    contextPath?: string
  ): Promise<ClassDescription> {
    return logic().describeClass(classPath, contextPath);
  }
}

SecurityApi.decorateApiClass(StudioApi);
