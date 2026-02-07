// Intentional violation: raw color literal should trigger contract warning/error depending on policy.
export function RawColorBlock() {
  return (
    <div data-contract-section="example.raw" style={{ background: "rgba(15, 23, 42, 0.3)", padding: "1rem" }}>
      <p>Raw color present (should be flagged by interfacectl validate).</p>
    </div>
  );
}
