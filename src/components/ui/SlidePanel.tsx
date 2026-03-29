import type { PropsWithChildren, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type SlidePanelProps = PropsWithChildren<{
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}>;

export default function SlidePanel({
  open,
  title,
  onClose,
  footer,
  children,
}: SlidePanelProps) {
  if (!open) return null;

  const panel = (
    <div className="slide-panel-overlay" onClick={onClose}>
      <aside className="slide-panel-card" onClick={(event) => event.stopPropagation()}>
        <div className="slide-panel-head">
          <div>
            <h2>{title}</h2>
          </div>
        </div>
        <div className="slide-panel-body">
          {children}
          {footer ? <div className="slide-panel-footer">{footer}</div> : null}
        </div>
      </aside>
    </div>
  );

  return createPortal(panel, document.body);
}
