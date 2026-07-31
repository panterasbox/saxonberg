/**
 * MediaAsset — provenance record for one generated illustration.
 *
 * NOT a Stuff, and NOT on the render path. The game shows a picture from
 * the bucket-relative `key` carried on `Visible.illustration`; this
 * Document is a parallel record *about* that asset, joined by the same
 * key. The runtime render never reads it — only the generation pipeline
 * (writes) and authoring / staleness tooling (reads) do.
 *
 * It earns its place the moment you need to *manage* the library rather
 * than just display one image: `sourceContentHash` makes drift detectable
 * (the model the image was rendered from changed), `styleVersion` lets a
 * style-bible bump sweep "regenerate everything older than vN", and
 * `prompt` + `model` + `size`/`quality` make a regenerate deterministic.
 *
 * All fields are scalars per the persistence rule (no value-objects, so no
 * marshaller is wired). `createdAt` (from Document) is the generation time.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';

export type MediaAssetStatus = 'draft' | 'approved';

export class MediaAsset extends Document {
  static collectionName = Collections.MediaAssets;
  static persistentFields = [
    'key',
    'sourcePath',
    'sourceContentHash',
    'prompt',
    'model',
    'size',
    'quality',
    'styleVersion',
    'width',
    'height',
    'status',
  ];

  /** Bucket-relative S3 key — the join to `Visible.illustration`. */
  key: string = '';

  /** Template path of the content this was rendered from. */
  sourcePath: string = '';

  /** Hash of the model facts (the prompt) — flips stale when the model moves. */
  sourceContentHash: string = '';

  /** The full model-derived prompt that produced this image. */
  prompt: string = '';

  /** Generation model id (e.g. `gpt-image-1`). */
  model: string = '';

  /** Requested size, e.g. `1024x1536`. */
  size: string = '';

  /** Requested quality, e.g. `medium`. */
  quality: string = '';

  /** House-style version this was generated under (e.g. `potter-v1`). */
  styleVersion: string = '';

  width: number = 0;
  height: number = 0;

  /** Authoring gate; `draft` until reviewed/approved. */
  status: MediaAssetStatus = 'draft';
}
