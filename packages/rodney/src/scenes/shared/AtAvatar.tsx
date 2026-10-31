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
 * The streamer's own avatar — the one on Twitch, YouTube and Discord: a white
 * '@' on black, drawn as the VGA glyph with VGA text mode's tall pixels
 * (720 × 400 on a 4:3 tube, so each pixel stood ~1.35× as tall as wide) and a
 * touch of phosphor glow. It identifies the PERSON, so it appears only where
 * the person is the subject (the About card) — never as frame chrome.
 */
export default function AtAvatar({ size = 40 }: { size?: number }) {
  const cellW = 9;
  const pixelH = 1.35;
  const box = 24;
  const x0 = Math.round((box - cellW) / 2);
  const y0 = (box - VGA_AT.length * pixelH) / 2;
  // One path, not a rect per pixel: separate rects anti-alias their shared
  // edges into visible seams.
  const d = VGA_AT.flatMap((row, y) =>
    [...row].flatMap((c, x) =>
      c === '#' ? [`M${x0 + x} ${y0 + y * pixelH}h1v${pixelH}h-1z`] : []
    )
  ).join('');
  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      style={{ display: 'block', background: '#000', flex: '0 0 auto' }}
    >
      <path
        d={d}
        fill="#fff"
        style={{ filter: 'drop-shadow(0 0 0.35px rgba(255,255,255,0.8))' }}
      />
    </svg>
  );
}
