export function ReviewStep(input: {
  workspace: string;
  windowLabel: string;
}) {
  const reviewItems = [
    `Workspace: ${input.workspace || "Select a target workspace."}`,
    `Window: ${input.windowLabel || "Define the maintenance window."}`,
    "Notify route owners before queueing the destructive change.",
  ];

  return (
    <section className="flowPanel" data-contract-section="flow.review" id="review">
      <h2>Review checklist</h2>
      <p>The flow stays stateful by separating request capture from operator review.</p>
      <ul className="reviewList">
        {reviewItems.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
