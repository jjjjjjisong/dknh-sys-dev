import type { PropsWithChildren } from 'react';

type BadgeVariant = 'default' | 'muted' | 'muted-blue' | 'cancel';

type BadgeProps = PropsWithChildren<{
  variant?: BadgeVariant;
  className?: string;
}>;

const classMap: Record<BadgeVariant, string> = {
  default: 'badge',
  muted: 'badge badge-muted',
  'muted-blue': 'badge badge-muted-blue',
  cancel: 'badge badge-cancel',
};

export default function Badge({
  variant = 'default',
  className = '',
  children,
}: BadgeProps) {
  return <span className={`${classMap[variant]} ${className}`.trim()}>{children}</span>;
}
