import type { PropsWithChildren, ReactNode } from 'react';

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  cardClassName?: string;
}>;

export default function Modal({
  open,
  title,
  description,
  onClose,
  footer,
  cardClassName = '',
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-card ${cardClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        <div className="modal-form">
          {children}
          {footer ? <div className="modal-actions">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
