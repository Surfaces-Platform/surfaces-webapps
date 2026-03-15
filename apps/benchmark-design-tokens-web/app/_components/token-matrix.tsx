const TOKENS = [
  { name: "Surface / Primary", value: "Warm Ivory" },
  { name: "Surface / Alt", value: "Clay Wash" },
  { name: "Text / Primary", value: "Deep Slate" },
];

export function TokenMatrix() {
  return (
    <section className="tokenGrid" data-contract-section="design.palette" id="palette">
      {TOKENS.map((token) => (
        <article className="tokenCard" key={token.name}>
          <h3>{token.name}</h3>
          <p>{token.value}</p>
        </article>
      ))}
    </section>
  );
}
