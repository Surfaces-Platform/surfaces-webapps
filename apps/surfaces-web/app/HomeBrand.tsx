// The header and footer have fixed dark surfaces in both system themes.
export default function HomeBrand() {
  return (
    // The supplied SVG is already outlined and needs no raster optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="brand-lockup"
      src="/design-system/logo/surfaces-lockup-horizontal-reverse.svg"
      alt=""
    />
  );
}
