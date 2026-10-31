import { CanvasTexture, SRGBColorSpace } from 'three';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/**
 * Paints a banner's cloth from the brand marks (docs/design/brand), so the
 * banner is the brand guide applied rather than a baked image:
 *
 *   Old Glory Blue field · a white hairline rule inset · the mark standalone
 *   (white on blue — the mark owns this surface) · the wordmark in engraved
 *   capitals · the flag rule at the foot, its red held off the blue by white.
 *
 * ⚠ The white marks' ring casing is hard-coded to #002868, so the field must
 * stay Old Glory Blue or the Borromean crossings stop reading
 * (brand/README.md § The casing is structural).
 */
export interface BannerFace {
  /** A `*-white.svg` mark under public/brand/, or none (wordmark only). */
  markUrl: string | null;
  /** Set in Spectral capitals beneath the mark. */
  wordmark: string;
}

/** The cloth's size in scene units; the texture takes its aspect. */
export const BANNER_SIZE = { width: 0.72, height: 1.2 } as const;
const H = 1600;
const W = Math.round((H * BANNER_SIZE.width) / BANNER_SIZE.height);

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function paintBanner(face: BannerFace): Promise<CanvasTexture> {
  await Promise.all([
    document.fonts.load(`500 60px ${FACE_STACKS.display}`),
    document.fonts.ready,
  ]);
  const mark = face.markUrl ? await loadImage(face.markUrl) : null;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('banner: no 2d context');

  // The field.
  ctx.fillStyle = palette.brand.blue;
  ctx.fillRect(0, 0, W, H);

  // The hairline rule, inset.
  const inset = 34;
  ctx.strokeStyle = palette.brand.white;
  ctx.lineWidth = 4;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  // The mark. With none, the wordmark rises into its place.
  const markSize = W * 0.62;
  const markTop = H * 0.13;
  if (mark) ctx.drawImage(mark, (W - markSize) / 2, markTop, markSize, markSize);

  // The wordmark — engraved capitals, letter-spacing .19em, shrunk to fit.
  const maxWidth = W - inset * 2 - 70;
  let size = 64;
  ctx.fillStyle = palette.brand.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const text = face.wordmark.toUpperCase();
  for (; size > 24; size -= 2) {
    ctx.font = `500 ${size}px ${FACE_STACKS.display}`;
    ctx.letterSpacing = `${(size * 0.19).toFixed(1)}px`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  const wordY = mark ? markTop + markSize + H * 0.1 : H * 0.36;
  // Letter-spacing trails the last glyph; nudge right by half of it to centre.
  ctx.fillText(text, W / 2 + size * 0.095, wordY);

  // A short rule under the wordmark.
  ctx.fillRect(W / 2 - 60, wordY + size * 0.6, 120, 3);

  // The flag rule at the foot: white · red · white, so red never touches blue.
  const footTop = H - inset - 230;
  ctx.fillStyle = palette.brand.white;
  ctx.fillRect(inset, footTop, W - inset * 2, 22);
  ctx.fillStyle = palette.brand.red;
  ctx.fillRect(inset, footTop + 22, W - inset * 2, 64);
  ctx.fillStyle = palette.brand.white;
  ctx.fillRect(inset, footTop + 86, W - inset * 2, 22);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}
