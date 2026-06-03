export function CoachSummarySkeleton() {
  return (
    <section className="coach-dashboard" aria-busy="true" aria-label="불러오는 중">
      <div className="kpi-grid kpi-grid-2 coach-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card">
            <span className="kpi-label muted">불러오는 중…</span>
          </div>
        ))}
      </div>
    </section>
  );
}
