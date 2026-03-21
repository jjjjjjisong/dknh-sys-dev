import type { PropsWithChildren, ReactNode } from 'react';

type SlidePanelProps = PropsWithChildren<{
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}>;

export default function SlidePanel({
  open,
  title,
  description,
  onClose,
  footer,
  children,
}: SlidePanelProps) {
  if (!open) return null;

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <aside className="slide-panel-card" onClick={(event) => event.stopPropagation()}>
        <div className="slide-panel-head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        <div className="slide-panel-body">
          {children}
          {footer ? <div className="slide-panel-footer">{footer}</div> : null}
        </div>
      </aside>
    </div>
  );
}
