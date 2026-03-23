import type { PropsWithChildren } from 'react';

type AlertProps = PropsWithChildren<{
  variant?: 'error';
}>;

export default function Alert({ variant = 'error', children }: AlertProps) {
  return <div className={`alert alert-${variant}`}>{children}</div>;
}
