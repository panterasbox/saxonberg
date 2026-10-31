import { CHANNEL } from '../../show/channel';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/*
 * The '@' from the IBM VGA text-mode ROM font (8 × 16, code page 437) — how
 * NetHack drew you on a DOS-era screen. One string per pixel row.
 */
const VGA_AT = [
  '........',
  '........',
  '.#####..',
  '##...##.',
  '##...##.',
  '##.####.',
  '##.####.',
  '##.####.',
  '##.###..',
  '##......',
  '.#####..',
  '........',
  '........',
  '........',
  '........',
  '........',
];

/**
 * The person's avatar: a white '@' on black, drawn as the VGA glyph in its
 * 9-dot text cell, with a touch of phosphor glow. VGA text mode was 720 × 400
 * on a 4:3 tube, so each pixel stood about 1.35 times as tall as it was wide —
 * that narrow, tall '@' is the old-screen look. ⚠ The owner may swap this for
 * a typeface; this component is the only place the glyph lives.
 */
export function AtAvatar({ size = 40 }: { size?: number }) {
  const cellW = 9;
  const pixelH = 1.35;
  const box = 24;
  const x0 = Math.round((box - cellW) / 2);
  const y0 = (box - VGA_AT.length * pixelH) / 2;
  const rects = VGA_AT.flatMap((row, y) =>
    [...row].map((c, x) =>
      c === '#' ? (
        <rect key={`${x}-${y}`} x={x0 + x} y={y0 + y * pixelH} width={1} height={pixelH} />
      ) : null
    )
  );
  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      style={{ display: 'block', background: '#000', flex: '0 0 auto' }}
    >
      <g fill="#fff" style={{ filter: 'drop-shadow(0 0 0.35px rgba(255,255,255,0.8))' }}>
        {rects}
      </g>
    </svg>
  );
}

/** "Bobalu Smallberries @ Pantera's Box" — who you are watching. */
export default function Nameplate({ size = 'small' }: { size?: 'small' | 'large' }) {
  const big = size === 'large';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: big ? 16 : 12 }}>
      <AtAvatar size={big ? 54 : 40} />
      <div style={{ lineHeight: 1.15, whiteSpace: 'nowrap' }}>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontWeight: 600,
            fontSize: big ? 24 : 18,
            color: palette.text.fg,
          }}
        >
          {CHANNEL.person}
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: big ? 15 : 12,
            letterSpacing: '0.19em',
            textTransform: 'uppercase',
            color: palette.text.dim,
            marginTop: 2,
          }}
        >
          @ {CHANNEL.studio}
        </div>
      </div>
    </div>
  );
}
