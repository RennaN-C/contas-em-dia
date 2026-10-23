type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="page">
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
      <div className="placeholder">Em construção.</div>
    </section>
  );
}
