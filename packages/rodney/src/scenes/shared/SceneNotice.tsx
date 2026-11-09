import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/**
 * Why the overlay is NOT switching OBS's scene, in a corner — never
 * silent (broadcast-ready D14, P3). Renders nothing when switching works
 * or is not asked for.
 */
export default function SceneNotice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 10,
        fontFamily: FACE_STACKS.chrome,
        fontSize: 14,
        color: palette.text.mute,
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  );
}
