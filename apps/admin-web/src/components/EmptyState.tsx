import type { ReactNode } from 'react';

export function EmptyState({
  title = '표시할 데이터가 없습니다',
  description,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="state-icon" aria-hidden="true">
        ◇
      </div>
      <div className="state-title">{title}</div>
      {description ? <div className="state-desc">{description}</div> : null}
      {actionLabel && onAction ? (
        <button type="button" className="btn" onClick={onAction} style={{ marginTop: 'var(--ds-space-2)' }}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
