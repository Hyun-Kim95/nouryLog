import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** 헤더 우측 닫기 버튼을 숨긴다(하단/푸터에 별도 닫기 버튼이 있는 모달용). */
  hideHeaderClose?: boolean;
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  hideHeaderClose = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Drawer와 동일한 패턴으로 부모가 매 렌더 새 onClose 함수를 넘겨도 effect가 재실행되며
  // 포커스가 첫 버튼으로 점프하지 않게 ref로 보관한다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    const root = panelRef.current;
    const inputTarget = root?.querySelector<HTMLElement>('textarea, input, select');
    const fallback = root?.querySelector<HTMLElement>('button');
    (inputTarget ?? fallback)?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-layer" role="presentation">
      <button type="button" className="modal-backdrop" aria-label="닫기" onClick={onClose} />
      <div
        ref={panelRef}
        className={`modal ${SIZE_CLASS[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <h3 id="modal-title">{title}</h3>
          {hideHeaderClose ? null : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              닫기
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
