import type { ComponentProps } from 'react';

import Button from './Button';

type TableActionButtonProps = ComponentProps<typeof Button>;

export default function TableActionButton({ className = '', ...props }: TableActionButtonProps) {
  const classes = ['table-action-button', className].filter(Boolean).join(' ');

  return <Button {...props} className={classes} />;
}
