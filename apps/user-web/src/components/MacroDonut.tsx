type Props = {
  carbohydrate: number;
  protein: number;
  fat: number;
};

export function MacroDonut({ carbohydrate, protein, fat }: Props) {
  const total = carbohydrate + protein + fat || 1;
  const cPct = (carbohydrate / total) * 100;
  const pPct = (protein / total) * 100;
  const fPct = (fat / total) * 100;
  const gradient = `conic-gradient(
    var(--chart-carb) 0 ${cPct}%,
    var(--chart-protein) ${cPct}% ${cPct + pPct}%,
    var(--chart-fat) ${cPct + pPct}% 100%
  )`;

  return (
    <div className="macro-donut-wrap">
      <div className="macro-donut" style={{ background: gradient }} aria-hidden />
      <ul className="macro-legend">
        <li>
          <span className="macro-swatch macro-swatch-carb" /> 탄수 {Math.round(carbohydrate)}g (
          {Math.round(cPct)}%)
        </li>
        <li>
          <span className="macro-swatch macro-swatch-protein" /> 단백질 {Math.round(protein)}g (
          {Math.round(pPct)}%)
        </li>
        <li>
          <span className="macro-swatch macro-swatch-fat" /> 지방 {Math.round(fat)}g ({Math.round(fPct)}%)
        </li>
      </ul>
    </div>
  );
}
