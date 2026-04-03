import type { PropsWithChildren, ReactNode } from 'react';

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  headerAction?: ReactNode;
  footer?: ReactNode;
  cardClassName?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
}>;

export default function Modal({
  open,
  title,
  description,
  onClose,
  headerAction,
  footer,
  cardClassName = '',
  overlayClassName = '',
  closeOnOverlayClick = false,
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className={`modal-overlay ${overlayClassName}`.trim()}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`modal-card ${cardClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-head-copy">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {headerAction ? <div className="modal-head-actions">{headerAction}</div> : null}
        </div>
        <div className="modal-form">
          {children}
          {footer ? <div className="modal-actions">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
