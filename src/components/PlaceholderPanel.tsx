type PlaceholderPanelProps = {
  title: string;
  message: string;
};

export default function PlaceholderPanel({
  title,
  message,
}: PlaceholderPanelProps) {
  return (
    <section className="card placeholder-panel">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="placeholder-badge">TODO</div>
    </section>
  );
}
