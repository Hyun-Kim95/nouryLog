type Props = { title: string; subtitle?: string };

export function PageTitle({ title, subtitle }: Props) {
  return (
    <header className="page-header">
      <h2 className="page-title">{title}</h2>
      {subtitle ? <p className="muted page-subtitle">{subtitle}</p> : null}
    </header>
  );
}
