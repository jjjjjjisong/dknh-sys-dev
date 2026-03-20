import type { PropsWithChildren, ReactNode } from 'react';

type FormFieldProps = PropsWithChildren<{
  label: ReactNode;
  className?: string;
}>;

export default function FormField({
  label,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}
