// Approved Simple Slab horizontal lockup. Only the outer canvas is trimmed;
// polygon geometry, mark placement, and wordmark metrics match the brand master.
export default function HomeBrand() {
  return (
    <svg
      className="brand-lockup"
      viewBox="90 80 730 170"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(74 72) scale(2.75)" shapeRendering="geometricPrecision">
        <polygon points="14,14 50,6 50,19 14,27" fill="#F7F6F2" />
        <polygon points="10,29 50,29 50,40 10,40" fill="#F7F6F2" />
        <polygon points="14,43 50,51 50,58 14,50" fill="#8B9096" />
      </g>
      <text
        x="310"
        y="194"
        fill="#F7F6F2"
        fontFamily="var(--font-inter), Inter, Geist, Helvetica, Arial, sans-serif"
        fontSize="104"
        fontWeight="780"
        letterSpacing="0"
      >
        Surfaces
      </text>
    </svg>
  );
}
