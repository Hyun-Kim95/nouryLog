type Point = {
  date?: string;
  label?: string;
  summary: { calories: number };
  hasRecords: boolean;
};

type Props = {
  daily: Point[];
  goalKcal: number | null;
};

export function CalorieBarChart({ daily, goalKcal }: Props) {
  const values = daily.map((d) => (d.hasRecords ? d.summary.calories : 0));
  const maxVal = Math.max(goalKcal ?? 0, ...values, 1);

  return (
    <div className="chart-bars" role="img" aria-label="칼로리 추이 막대 차트">
      {goalKcal != null && goalKcal > 0 ? (
        <div
          className="chart-goal-line"
          style={{ bottom: `${(goalKcal / maxVal) * 100}%` }}
          title={`목표 ${Math.round(goalKcal)} kcal`}
        />
      ) : null}
      <div className="chart-bars-row">
        {daily.map((d) => {
          const h = d.hasRecords ? (d.summary.calories / maxVal) * 100 : 4;
          return (
            <div key={d.date ?? d.label ?? String(h)} className="chart-bar-col">
              <div
                className={`chart-bar ${d.hasRecords ? '' : 'chart-bar-empty'}`}
                style={{ height: `${Math.max(h, 4)}%` }}
                title={
                  d.hasRecords
                    ? `${Math.round(d.summary.calories)} kcal`
                    : '기록 없음'
                }
              />
              <span className="chart-bar-label">{d.label ?? '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
