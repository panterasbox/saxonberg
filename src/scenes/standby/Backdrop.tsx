import { useLoader } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader } from 'three';

/**
 * The monastery archive, generated via saxonberg's gpt-image-1 pipeline
 * (tools/generate-image.mjs -> public/monastery.png). Rendered as a large
 * unlit plane far behind the banner; the r3f camera frames the 16:9 output,
 * so the source image's 3:2 aspect is irrelevant.
 *
 * Wrapped in <ErrorBoundary> by the parent so a missing image degrades to navy.
 */
export default function Backdrop() {
  const tex = useLoader(TextureLoader, '/monastery.png');
  tex.colorSpace = SRGBColorSpace;

  return (
    <mesh position={[0, 0, -4]}>
      {/* Wide enough to fill the frame at this camera distance. */}
      <planeGeometry args={[16, 9]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}
