import type { ReactNode } from 'react';

export function ForbiddenState({
  title = '접근 권한이 없습니다',
  description = '관리자 권한이 필요한 화면입니다. 권한 담당자에게 문의해 주세요.',
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="state-block" role="alert">
      <div className="state-icon" aria-hidden="true">
        ⌀
      </div>
      <div className="state-title">{title}</div>
      <div className="state-desc">{description}</div>
      {actionLabel && onAction ? (
        <button type="button" className="btn" onClick={onAction} style={{ marginTop: 'var(--ds-space-2)' }}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
