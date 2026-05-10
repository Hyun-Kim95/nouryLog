import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** 헤더 우측 닫기 버튼을 숨긴다(하단 닫기 버튼이 별도로 있는 화면용). */
  hideHeaderClose?: boolean;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  hideHeaderClose = false,
}: DrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  // 부모가 매 렌더마다 인라인 함수를 새로 넘겨도 effect가 재실행되며 포커스가 첫 버튼으로 점프하지 않도록 ref로 보관한다.
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
    // 입력 필드를 우선 포커스해서 입력 중 헤더 닫기 버튼으로 포커스가 점프하지 않게 한다.
    const root = panelRef.current;
    const inputTarget = root?.querySelector<HTMLElement>('textarea, input, select');
    const fallback = root?.querySelector<HTMLElement>('button');
    (inputTarget ?? fallback)?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="drawer-layer" role="presentation">
      <button type="button" className="drawer-backdrop" aria-label="닫기" onClick={onClose} />
      <aside
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{ '--drawer-width': `${width}px` } as CSSProperties}
      >
        <div className="drawer-head">
          <h3 id="drawer-title">{title}</h3>
          {hideHeaderClose ? null : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              닫기
            </button>
          )}
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="drawer-foot">{footer}</div> : null}
      </aside>
    </div>
  );
}
