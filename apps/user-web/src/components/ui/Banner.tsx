import type { ReactNode } from 'react';

type Variant = 'info' | 'error' | 'warn';

type Props = {
  variant: Variant;
  children: ReactNode;
  action?: ReactNode;
};

export function Banner({ variant, children, action }: Props) {
  return (
    <div className={`banner banner-${variant}`}>
      <span className="banner-body">{children}</span>
      {action ? <span className="banner-action">{action}</span> : null}
    </div>
  );
}
