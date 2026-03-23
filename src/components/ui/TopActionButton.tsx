import type { ComponentProps } from 'react';

import Button from './Button';

type TopActionButtonProps = ComponentProps<typeof Button>;

export default function TopActionButton({ className = '', ...props }: TopActionButtonProps) {
  const classes = ['top-action-button', className].filter(Boolean).join(' ');

  return <Button {...props} className={classes} />;
}
