/**
 * Texture grain via SVG turbulence. Densité 0.85, opacity 0.06 (vs 0.035 avant
 * où c'était invisible). Mix-blend overlay pour s'inscrire dans la matière.
 */
export function GrainOverlay(): JSX.Element {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full mix-blend-overlay opacity-[0.06]"
    >
      <filter id="grain-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 1
                  0 0 0 0 1
                  0 0 0 0 1
                  0 0 0 0.7 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-noise)" />
    </svg>
  );
}
