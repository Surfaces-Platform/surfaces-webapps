// Fixed version: uses token instead of raw literal.
export function FixedColorBlock() {
  return (
    <div data-contract-section="example.raw" style={{ background: "var(--background)", padding: "1rem" }}>
      <p>Token-based background (should pass).</p>
    </div>
  );
}
