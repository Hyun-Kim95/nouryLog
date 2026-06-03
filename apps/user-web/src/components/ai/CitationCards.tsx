import type { AiCitation } from '../../api/ai';

function mealSlotKo(slot: string | null): string {
  if (slot === 'BREAKFAST') return '아침';
  if (slot === 'LUNCH') return '점심';
  if (slot === 'DINNER') return '저녁';
  if (slot === 'SNACK') return '간식';
  return slot ?? '식사';
}

export function CitationCards({ citations }: { citations: AiCitation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="citation-cards" role="list" aria-label="답변 근거">
      <h3 className="card-heading">답변 근거 — 내 식단 기록</h3>
      {citations.map((c, i) => (
        <div key={`${c.type}-${i}`} className={`citation-card citation-card-${c.type}`} role="listitem">
          <span className="citation-type-chip">{c.type === 'meal' ? '식단' : c.type}</span>
          <p className="citation-card-label">{c.label}</p>
          {c.type === 'meal' ? (
            <p className="muted citation-sub">
              {mealSlotKo(c.mealSlot)} · P {Math.round(c.nutrients.protein)}g · {Math.round(c.nutrients.calories)} kcal
            </p>
          ) : null}
          {c.type === 'knowledge_doc' || c.type === 'ocr_feedback' ? (
            <p className="muted citation-sub">
              {c.sourceId} · {c.date.slice(0, 10)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
